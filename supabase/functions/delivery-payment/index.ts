// Deploy on the restaurant project. No DGateway API key is copied here.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import {
  equalSecret,
  isUuid,
  transactionMatches,
  type GatewayTransaction,
} from "../_shared/paymentCore.ts";
const env = (name: string) => Deno.env.get(name)?.trim() || "";
const db = () =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
const bridgeUrl =
  "https://xmfvxypioitbsnsbgioq.supabase.co/functions/v1/dgateway-restaurant-bridge";
function headers(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed =
    origin === "https://kampalanalf-sudo.github.io" ||
    /^https:\/\/[a-z0-9-]+\.e2b\.app$/.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed
      ? origin
      : "https://kampalanalf-sudo.github.io",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}
const reply = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: headers(req) });
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await db().rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}
async function bridge(body: Record<string, unknown>) {
  if (!env("CJC_GATEWAY_BRIDGE_SECRET"))
    throw new Error("Mobile Money is not configured");
  const response = await fetch(bridgeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cjc-bridge-secret": env("CJC_GATEWAY_BRIDGE_SECRET"),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result)
    throw new Error(
      "Payment outcome is not verified yet. Do not pay again. Check this order’s payment status.",
    );
  return result;
}
async function apply(
  paymentId: string,
  tx: GatewayTransaction & { verified?: boolean },
) {
  const { data: payment, error } = await db()
    .from("delivery_payments")
    .select("*")
    .eq("id", paymentId)
    .single();
  if (error) throw error;
  if (
    !transactionMatches(tx, {
      reference: payment.provider_reference,
      amount: payment.amount,
    })
  )
    throw new Error("Payment verification did not match the order");
  await rpc("apply_delivery_gateway_result", {
    p_payment_id: paymentId,
    p_reference: tx.reference,
    p_amount: Number(tx.amount),
    p_currency: tx.currency,
    p_direction: tx.direction || "collect",
    p_status: tx.status,
    p_verified: tx.verified === true,
  });
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return reply(req, { ok: true });
  if (req.method !== "POST")
    return reply(req, { error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && headers(req)["Access-Control-Allow-Origin"] !== origin)
    return reply(req, { error: "Origin not permitted" }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 16384)
      return reply(req, { error: "Payload too large" }, 413);
    const body = JSON.parse(raw);
    if (body.action === "webhook") {
      if (
        !(await equalSecret(
          req.headers.get("x-cjc-bridge-secret"),
          env("CJC_GATEWAY_BRIDGE_SECRET"),
        ))
      )
        return reply(req, { error: "Unauthorised" }, 401);
      if (
        !isUuid(body.payment_id) ||
        !body.transaction?.reference ||
        body.transaction.verified !== true
      )
        return reply(req, { error: "Invalid verified payment" }, 400);
      await apply(body.payment_id, body.transaction);
      return reply(req, { received: true });
    }
    if (body.action === "health") {
      const result = await bridge({ action: "health" });
      return reply(req, {
        available: result.configured === true,
        provider: "DGateway",
        currency: "UGX",
      });
    }
    if (
      !["start", "status"].includes(body.action) ||
      !isUuid(body.order_id) ||
      typeof body.tracking_token !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.tracking_token)
    )
      return reply(
        req,
        { error: "Valid private order details are required" },
        400,
      );
    const auth = {
      p_order_id: body.order_id,
      p_tracking_token: body.tracking_token,
    };
    const order = await rpc("track_delivery_order", auth);
    if (body.action === "start") {
      if (order.payment_status === "paid")
        return reply(req, { ok: true, order });
      const readiness = await bridge({ action: "health" });
      if (!readiness.configured)
        return reply(
          req,
          {
            error:
              "Mobile Money is currently unavailable. No payment was requested.",
          },
          503,
        );
      const payment = await rpc("claim_delivery_payment", {
        ...auth,
        p_phone: typeof body.phone === "string" ? body.phone : "",
      });
      // The merchant-side journal atomically accepts this ID only once, even after retries/timeouts.
      const result = await bridge({
        action: payment.provider_reference ? "status" : "collect",
        payment_id: payment.id,
        order_id: body.order_id,
        amount: payment.amount,
        phone: payment.phone,
        external_ref: payment.external_ref,
      });
      if (result.transaction?.reference)
        await apply(payment.id, result.transaction);
      else
        await db()
          .from("delivery_payments")
          .update({ status: "unknown", updated_at: new Date().toISOString() })
          .eq("id", payment.id)
          .in("status", ["initiating", "pending", "unknown"]);
      return reply(req, {
        ok: true,
        order: await rpc("track_delivery_order", auth),
        message:
          "Approve the Mobile Money prompt on the payer’s phone. Enter your PIN only in the network’s secure prompt, never on this website.",
      });
    }
    if (!order.payment || order.payment_status === "paid")
      return reply(req, { ok: true, order });
    const result = await bridge({
      action: "status",
      payment_id: order.payment.id,
    });
    if (result.transaction?.reference)
      await apply(order.payment.id, result.transaction);
    return reply(req, {
      ok: true,
      order: await rpc("track_delivery_order", auth),
    });
  } catch (error) {
    const safe =
      error instanceof Error &&
      [
        "Invalid private order details",
        "This order is closed",
        "Enter a valid Ugandan Mobile Money number",
        "Payment attempt limit reached. Contact the restaurant.",
      ].includes(error.message)
        ? error.message
        : "Payment could not be verified. Keep this order’s tracking details and check again. Do not submit a second payment or pay cash while a request is unresolved.";
    return reply(req, { error: safe, code: "PAYMENT_NOT_VERIFIED" }, 503);
  }
});
