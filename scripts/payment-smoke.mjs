// Safe deployed configuration/auth checks only. Never starts a collection or creates an order.
import assert from "node:assert/strict";
const restaurant =
  "https://nbzjrirqstfevobtxkuf.supabase.co/functions/v1/delivery-payment";
const bridge =
  "https://xmfvxypioitbsnsbgioq.supabase.co/functions/v1/dgateway-restaurant-bridge";
async function post(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json();
  return { response, data };
}
const health = await post(
  restaurant,
  { action: "health" },
  { origin: "https://kampalanalf-sudo.github.io" },
);
assert.equal(health.response.status, 200, JSON.stringify(health.data));
assert.equal(
  health.data.available,
  true,
  "Merchant bridge/configuration unavailable",
);
assert.equal(
  health.response.headers.get("access-control-allow-origin"),
  "https://kampalanalf-sudo.github.io",
);
assert.equal(
  (await post(bridge, { action: "health" })).response.status,
  401,
  "Bridge must not be public",
);
assert.equal(
  (
    await post(
      `${bridge}?webhook=1`,
      { data: { reference: "SMOKE-NOT-A-TRANSACTION" } },
      { "x-dgateway-signature": "0".repeat(64) },
    )
  ).response.status,
  401,
  "Unsigned callbacks must be rejected",
);
assert.equal(
  (await post(restaurant, { action: "webhook" })).response.status,
  401,
  "Forged bridge callbacks must be rejected",
);
assert.equal(
  (await post(restaurant, { action: "status" })).response.status,
  400,
  "Private tracking details must be required",
);
console.log(
  "Deployed Mobile Money configuration, CORS and authentication checks passed. No orders, wallet prompts or charges.",
);
