// Deploy on TankTickets only. Reuses its existing DGateway secrets in place.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import {
  equalSecret,
  isUuid,
  normalizeGatewayStatus,
  transactionMatches,
  verifyGatewaySignature,
  type GatewayTransaction,
} from "../_shared/paymentCore.ts";
const env = (name: string) => Deno.env.get(name)?.trim() || "";
const admin = () =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
const base = () =>
  (env("DGATEWAY_API_URL") || "https://dgatewayapi.desispay.com").replace(
    /\/$/,
    "",
  );
const restaurantUrl =
  "https://nbzjrirqstfevobtxkuf.supabase.co/functions/v1/delivery-payment";
type Journal = {
  payment_id: string;
  restaurant_order_id: string;
  external_ref: string;
  amount: number;
  phone: string;
  provider_reference: string | null;
  status: string;
  verified_at: string | null;
};
async function gateway(
  path: string,
  body: Record<string, unknown>,
): Promise<GatewayTransaction> {
  const key = env("DGATEWAY_API_KEY");
  if (!key) throw new Error("Gateway not configured");
  const response = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: { "X-Api-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.error || !result?.data)
    throw new Error("Gateway request uncertain");
  return result.data;
}
function summary(row: Journal) {
  return {
    reference: row.provider_reference,
    amount: row.amount,
    currency: "UGX",
    direction: "collect",
    status: row.status,
    verified: !!row.verified_at,
  };
}
async function reconcile(row: Journal, force = false) {
  if (!row.provider_reference) return summary(row);
  if (
    !force &&
    ((row.status === "completed" && row.verified_at) ||
      (row.verified_at &&
        Date.now() - new Date(row.verified_at).getTime() < 10000))
  )
    return summary(row);
  const tx = await gateway("/v1/webhooks/verify", {
    reference: row.provider_reference,
  });
  if (
    !transactionMatches(tx, {
      reference: row.provider_reference,
      amount: row.amount,
    })
  )
    throw new Error("Transaction mismatch");
  const status = normalizeGatewayStatus(tx.status);
  const { data, error } = await admin()
    .from("cjc_gateway_requests")
    .update({
      status,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("payment_id", row.payment_id)
    .neq("status", "completed")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  // Another callback can have completed the transaction while this check ran.
  if (!data) {
    const { data: current, error: readError } = await admin()
      .from("cjc_gateway_requests")
      .select("*")
      .eq("payment_id", row.payment_id)
      .single();
    if (readError) throw readError;
    return summary(current);
  }
  return summary(data);
}
async function forward(paymentId: string, tx: ReturnType<typeof summary>) {
  const response = await fetch(restaurantUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cjc-bridge-secret": env("CJC_GATEWAY_BRIDGE_SECRET"),
    },
    body: JSON.stringify({
      action: "webhook",
      payment_id: paymentId,
      transaction: tx,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("Restaurant acknowledgement unavailable");
}
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 65536) return json({ error: "Payload too large" }, 413);
    if (new URL(req.url).searchParams.get("webhook") === "1") {
      if (
        !(await verifyGatewaySignature(
          raw,
          req.headers.get("x-dgateway-signature"),
          env("DGATEWAY_WEBHOOK_SECRET"),
        ))
      )
        return json({ error: "Invalid signature" }, 401);
      const parsed = JSON.parse(raw),
        reference = (parsed.data || parsed).reference;
      if (typeof reference !== "string" || reference.length > 200 || !reference)
        return json({ error: "Invalid reference" }, 400);
      const { data: row, error } = await admin()
        .from("cjc_gateway_requests")
        .select("*")
        .eq("provider_reference", reference)
        .maybeSingle();
      if (error) throw error;
      if (!row)
        return json(
          { error: "Reference not yet registered. Retry this callback." },
          503,
        );
      const tx = await reconcile(row, true);
      await forward(row.payment_id, tx);
      return json({ received: true });
    }
    if (
      !(await equalSecret(
        req.headers.get("x-cjc-bridge-secret"),
        env("CJC_GATEWAY_BRIDGE_SECRET"),
      ))
    )
      return json({ error: "Unauthorised" }, 401);
    const body = JSON.parse(raw);
    if (body.action === "health")
      return json({
        configured:
          !!env("DGATEWAY_API_KEY") && !!env("DGATEWAY_WEBHOOK_SECRET"),
        provider: "iotec",
        currency: "UGX",
      });
    if (
      !["collect", "status"].includes(body.action) ||
      !isUuid(body.payment_id)
    )
      return json({ error: "Invalid request" }, 400);
    if (!env("DGATEWAY_API_KEY") || !env("DGATEWAY_WEBHOOK_SECRET"))
      return json({ error: "Gateway not configured" }, 503);
    if (body.action === "collect") {
      if (
        !isUuid(body.order_id) ||
        !Number.isSafeInteger(body.amount) ||
        body.amount < 1 ||
        body.amount > 100000000 ||
        typeof body.phone !== "string" ||
        !/^2567\d{8}$/.test(body.phone) ||
        typeof body.external_ref !== "string" ||
        !/^CJC-[a-f0-9-]{36}$/.test(body.external_ref)
      )
        return json({ error: "Invalid collection details" }, 400);
      const journal = {
        payment_id: body.payment_id,
        restaurant_order_id: body.order_id,
        external_ref: body.external_ref,
        amount: body.amount,
        phone: body.phone,
      };
      // Inserting this unique payment ID is the at-most-once collection claim.
      const { error: insertError } = await admin()
        .from("cjc_gateway_requests")
        .insert(journal);
      if (insertError) {
        if (insertError.code !== "23505") throw insertError;
        const { data: existing, error } = await admin()
          .from("cjc_gateway_requests")
          .select("*")
          .eq("payment_id", body.payment_id)
          .single();
        if (error) throw error;
        if (
          existing.amount !== body.amount ||
          existing.restaurant_order_id !== body.order_id ||
          existing.phone !== body.phone ||
          existing.external_ref !== body.external_ref
        )
          return json({ error: "Payment claim mismatch" }, 409);
        return json({ ok: true, transaction: await reconcile(existing) });
      }
      const tx = await gateway("/v1/payments/collect", {
        amount: body.amount,
        currency: "UGX",
        phone_number: body.phone,
        provider: "iotec",
        description: `Charbroiled Juicy Chicken: ${body.external_ref}`,
        callback_url: `${env("SUPABASE_URL")}/functions/v1/dgateway-restaurant-bridge?webhook=1`,
        metadata: {
          restaurant_project: "nbzjrirqstfevobtxkuf",
          restaurant_order_id: body.order_id,
          restaurant_payment_id: body.payment_id,
          external_ref: body.external_ref,
        },
      });
      if (!transactionMatches(tx, { amount: body.amount }))
        throw new Error("Transaction mismatch");
      // Collection response is never sufficient evidence that money was received.
      const { data: saved, error } = await admin()
        .from("cjc_gateway_requests")
        .update({
          provider_reference: tx.reference,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("payment_id", body.payment_id)
        .is("provider_reference", null)
        .select("*")
        .single();
      if (error) throw error;
      return json({ ok: true, transaction: summary(saved) });
    }
    const { data: row, error } = await admin()
      .from("cjc_gateway_requests")
      .select("*")
      .eq("payment_id", body.payment_id)
      .maybeSingle();
    if (error) throw error;
    if (!row)
      return json({
        ok: true,
        transaction: null,
        message:
          "No provider request is registered. Do not create another attempt automatically.",
      });
    return json({ ok: true, transaction: await reconcile(row) });
  } catch {
    return json(
      {
        error:
          "Gateway outcome could not be verified. Do not submit another payment; check the existing request again.",
        code: "VERIFICATION_UNAVAILABLE",
      },
      503,
    );
  }
});
