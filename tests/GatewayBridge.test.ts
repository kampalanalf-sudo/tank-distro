import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as core from "../supabase/functions/_shared/paymentCore";

// Execute the actual edge handler with an in-memory private journal and fake provider.
// No external requests, Supabase credentials, wallet prompts or real charges.
function fixture() {
  const rows = new Map<string, Record<string, any>>();
  let handler: (req: Request) => Promise<Response>;
  let timeout = false;
  let canonical: Record<string, unknown> = {
    reference: "DG-UNIT-REF",
    amount: 49000,
    currency: "UGX",
    direction: "collect",
    status: "completed",
  };
  const forwarded: any[] = [];
  const fetch = vi.fn(async (url: string, options: RequestInit) => {
    if (url.endsWith("/v1/payments/collect")) {
      if (timeout)
        throw new Error("Simulated timeout after provider accepted request");
      return Response.json({ data: { ...canonical, status: "completed" } });
    }
    if (url.endsWith("/v1/webhooks/verify"))
      return Response.json({ data: canonical });
    if (url.endsWith("/functions/v1/delivery-payment")) {
      forwarded.push(JSON.parse(String(options.body)));
      return Response.json({ received: true });
    }
    throw new Error("Unmocked URL");
  });
  function query(values?: Record<string, unknown>) {
    const filters: ((r: any) => boolean)[] = [];
    const q = {
      eq: (k: string, v: unknown) => {
        filters.push((r) => r[k] === v);
        return q;
      },
      neq: (k: string, v: unknown) => {
        filters.push((r) => r[k] !== v);
        return q;
      },
      is: (k: string, v: unknown) => {
        filters.push((r) => r[k] === v);
        return q;
      },
      select: () => q,
      maybeSingle: async () => {
        const row = [...rows.values()].find((r) => filters.every((f) => f(r)));
        if (row && values) Object.assign(row, values);
        return { data: row ? { ...row } : null, error: null };
      },
      single: async () => q.maybeSingle(),
    };
    return q;
  }
  const client = {
    from: (table: string) => {
      if (table !== "cjc_gateway_requests")
        throw new Error("Attempt to access existing ticket business data");
      return {
        insert: async (row: any) => {
          if (rows.has(row.payment_id)) return { error: { code: "23505" } };
          rows.set(row.payment_id, {
            ...row,
            status: "unknown",
            provider_reference: null,
            verified_at: null,
          });
          return { error: null };
        },
        select: () => query(),
        update: (values: Record<string, unknown>) => query(values),
      };
    },
  };
  const env: Record<string, string> = {
    CJC_GATEWAY_BRIDGE_SECRET: "unit-bridge-secret",
    DGATEWAY_API_KEY: "unit-provider-key",
    DGATEWAY_WEBHOOK_SECRET: "unit-webhook-secret",
    SUPABASE_URL: "https://unit-source.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "unit-service-key",
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL(
        "../supabase/functions/dgateway-restaurant-bridge/index.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  runInNewContext(code, {
    exports: {},
    require: (id: string) =>
      id.startsWith("npm:") ? { createClient: () => client } : core,
    Deno: {
      env: { get: (key: string) => env[key] },
      serve: (h: typeof handler) => {
        handler = h;
      },
    },
    fetch,
    Response,
    URL,
    AbortSignal,
    crypto,
    TextEncoder,
    Date,
    console,
  });
  const input = {
    action: "collect",
    payment_id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
    order_id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    external_ref: "CJC-cccccccc-cccc-4ccc-cccc-cccccccccccc",
    phone: "256772123456",
    amount: 49000,
  };
  async function request(body: any, authorised = true) {
    return handler(
      new Request(
        "https://unit-source.supabase.co/functions/v1/dgateway-restaurant-bridge",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(authorised
              ? { "x-cjc-bridge-secret": "unit-bridge-secret" }
              : {}),
          },
          body: JSON.stringify(body),
        },
      ),
    );
  }
  async function webhook(body: any, alter = false) {
    const raw = JSON.stringify(body);
    const signature = createHmac("sha256", "unit-webhook-secret")
      .update(raw)
      .digest("hex");
    return handler(
      new Request(
        "https://unit-source.supabase.co/functions/v1/dgateway-restaurant-bridge?webhook=1",
        {
          method: "POST",
          headers: { "x-dgateway-signature": `sha256=${signature}` },
          body: alter ? `${raw} ` : raw,
        },
      ),
    );
  }
  return {
    rows,
    input,
    fetch,
    forwarded,
    request,
    webhook,
    setTimeout: (value: boolean) => {
      timeout = value;
    },
    setCanonical: (value: Record<string, unknown>) => {
      canonical = { ...canonical, ...value };
    },
    collectCount: () =>
      fetch.mock.calls.filter(([url]) => url.endsWith("/v1/payments/collect"))
        .length,
  };
}

describe("isolated merchant bridge: real handler with fake money", () => {
  it("denies unauthenticated collection before any journal write or provider call", async () => {
    const f = fixture();
    expect((await f.request(f.input, false)).status).toBe(401);
    expect(f.rows.size).toBe(0);
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it("atomically collects once when duplicate browser/server requests arrive concurrently", async () => {
    const f = fixture();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => f.request(f.input)),
    );
    expect(f.collectCount()).toBe(1);
    expect(f.rows.size).toBe(1);
    expect(results.every((r) => r.status === 200)).toBe(true);
  });
  it("never recollects after an ambiguous timeout, including a repeated start", async () => {
    const f = fixture();
    f.setTimeout(true);
    expect((await f.request(f.input)).status).toBe(503);
    const retry = await f.request(f.input);
    expect(retry.status).toBe(200);
    expect((await retry.json()).transaction).toMatchObject({
      status: "unknown",
      reference: null,
    });
    expect(f.collectCount()).toBe(1);
  });
  it("rejects changed immutable collection details on the same attempt", async () => {
    const f = fixture();
    await f.request(f.input);
    expect((await f.request({ ...f.input, amount: 50000 })).status).toBe(409);
    expect(f.collectCount()).toBe(1);
  });
  it("does not accept a collection response as proof of payment", async () => {
    const f = fixture();
    const result = await (await f.request(f.input)).json();
    expect(result.transaction).toMatchObject({
      status: "pending",
      verified: false,
    });
    expect(f.forwarded).toHaveLength(0);
  });
  it("refuses canonical verification for the wrong amount, currency, reference or direction", async () => {
    for (const mismatch of [
      { amount: 1 },
      { currency: "USD" },
      { reference: "DIFFERENT-REF" },
      { direction: "payout" },
    ]) {
      const f = fixture();
      await f.request(f.input);
      f.setCanonical(mismatch);
      expect(
        (await f.request({ action: "status", payment_id: f.input.payment_id }))
          .status,
      ).toBe(503);
      expect(f.rows.get(f.input.payment_id)?.status).toBe("pending");
      expect(f.forwarded).toHaveLength(0);
    }
  });
  it("rejects body tampering and retries callbacks received before reference registration", async () => {
    const f = fixture();
    expect(
      (await f.webhook({ data: { reference: "DG-UNIT-REF" } }, true)).status,
    ).toBe(401);
    expect(
      (await f.webhook({ data: { reference: "UNKNOWN-REF" } })).status,
    ).toBe(503);
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it("forces fresh canonical verification for signed callbacks, even with a cached pending check", async () => {
    const f = fixture();
    await f.request(f.input);
    f.rows.get(f.input.payment_id)!.verified_at = new Date().toISOString();
    expect(
      (
        await f.webhook({
          data: { reference: "DG-UNIT-REF", status: "failed" },
        })
      ).status,
    ).toBe(200);
    // Signed payload's claimed status is ignored; authoritative verification wins.
    expect(f.forwarded).toHaveLength(1);
    expect(f.forwarded[0]).toMatchObject({
      payment_id: f.input.payment_id,
      transaction: {
        status: "completed",
        verified: true,
        amount: 49000,
        currency: "UGX",
      },
    });
    expect(f.rows.get(f.input.payment_id)?.status).toBe("completed");
    f.setCanonical({ status: "failed" });
    await f.webhook({ data: { reference: "DG-UNIT-REF" } });
    expect(f.rows.get(f.input.payment_id)?.status).toBe("completed");
    expect(f.forwarded[1].transaction.status).toBe("completed");
  });
});
