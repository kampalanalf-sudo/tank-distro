# DGateway Mobile Money

## Architecture and deployment

- Restaurant project: `nbzjrirqstfevobtxkuf`. `delivery-payment` handles explicit payment requests and private status recovery. Amounts come from the order's server-priced snapshot, not the browser.
- Existing TankTickets merchant project: `xmfvxypioitbsnsbgioq`. New `dgateway-restaurant-bridge` and RLS-protected `cjc_gateway_requests` reuse the existing `DGATEWAY_API_KEY` and `DGATEWAY_WEBHOOK_SECRET` **in place**. Neither is copied to the restaurant, browser or Git. Existing ticket tables/functions and provider-wide webhook settings are unchanged.
- Both edge functions authenticate bridge traffic with a newly generated `CJC_GATEWAY_BRIDGE_SECRET`, installed as a Supabase secret in both projects. Never expose it as a `VITE_` value. Rotate both copies together if necessary; old callbacks are verified with the existing provider webhook key, then forwarded using the current bridge key.
- The API uses the same TankTickets provider (`iotec`), UGX, `X-Api-Key`, `/v1/payments/collect`, and `/v1/webhooks/verify` protocol. Each restaurant collection passes its own callback URL, so it does not alter the ticket callback.
- Callback: `https://xmfvxypioitbsnsbgioq.supabase.co/functions/v1/dgateway-restaurant-bridge?webhook=1`.
- Functions use `verify_jwt=false` because customers have private tracking tokens and provider callbacks do not carry Supabase JWTs. This does **not** disable application authentication: the restaurant checks the 256-bit order token, the bridge checks the private shared secret, and gateway callbacks require HMAC-SHA256 over the exact raw body. Service-only mutation RPCs are not guest/staff-callable.

Migration sources (already applied; do not rerun initial CREATE scripts):

1. Restaurant: `supabase/delivery-payments.sql`, followed by `supabase/delivery-payment-races.sql` (incremental late-settlement safeguards; also included in the canonical initial script).
2. TankTickets: **only** `supabase/tanktickets-restaurant-bridge.sql`. Do not run restaurant schema scripts there.
3. Edge source: `supabase/functions/delivery-payment/index.ts`, `supabase/functions/dgateway-restaurant-bridge/index.ts`, shared `paymentCore.ts`.

The deployed functions are bundled from these sources, keeping merchant secrets out of the bundle. Deploy each to the correct project, with the shared module included. URLs/project references are intentionally fixed; a different environment needs explicit source changes, not a client-provided forwarding URL.

## Customer flow

1. Choose **cash on delivery** or **Mobile Money** at checkout. Saving the order does not request money.
2. On private tracking, enter the **payer's** Ugandan MTN/Airtel number and press **Send payment prompt**. The delivery contact number is only a temporary prefill on the current page, not browser-persisted PII. Never ask customers to enter their Mobile Money PIN on the website.
3. The payer approves the secure network prompt on their own phone. The collection response alone is **never** proof of payment.
4. The payment changes to paid only after server-side verification matches its stored provider reference, exact order total, UGX and collection direction. Signed callbacks also perform canonical verification. Private tracking checks pending payments every 12 seconds while visible.
5. Unknown/timeout outcomes remain unresolved. Repeated requests reuse the same payment attempt; the merchant journal's unique insert claims collection at most once. Cash switching and new attempts are blocked while unresolved/paid. When a reference was not returned, **Resume the same request safely** reuses that ID; it cannot repeat a previously claimed provider collection.
6. Only verified failures permit an explicitly requested new attempt (up to three per order/hour) or switching to cash. If the wallet was debited despite failure, stop and contact the restaurant rather than retry.

## Operational recovery and review

- Pending is not paid or failed. Do not prepare/dispatch unpaid Mobile Money orders and do not collect cash as well. The database prevents stage progression regardless of UI/client.
- If a collection timed out before its reference was saved, the journal intentionally does **not** automatically repeat it. Even a definitive-looking upstream HTTP error is handled conservatively as unknown after a request was claimed. There is no built-in provider lookup by external reference; resolve the `CJC-…` external reference in the merchant dashboard/support first. Do not delete a claim or manually reset it just to issue another prompt.
- Callback delivery before reference registration receives 503 for retry. Canonical callback reconciliation bypasses the recent-status cache, preventing a just-completed payment being stranded behind a cached pending result. Signed unknown references are not mapped using arbitrary callback metadata.
- Paid is monotonic. A late failed update cannot undo verified success. A late success on an older failed attempt can still be recorded when another attempt exists; all real settlements are preserved rather than rejected by an overly broad unique index.
- Late settlement after cancellation, switching to cash, a second settlement or another unresolved attempt sets **review required**. Tracking displays the settled reference, and the admin dashboard flags review. Terminal orders never reopen.
- Cancellation does not issue a refund. Refunds/chargebacks require manual reconciliation in the existing merchant account and direct customer communication. This integration has no refund, automatic payouts, cash-received ledger, or periodic background reconciliation worker. Callbacks and private status checks do the reconciliation.
- Admin payment journals contain payer phone numbers and are RLS-protected. Riders see only the order's payment summary. Tracking never returns payer/customer phone, address, secret hashes or gateway keys. The private tracking code also authorises requesting payment; keep it confidential.
- The restaurant still needs a real owner/admin, approved menu/prices, production email and operational policies before accepting deliveries. Existing order-abuse/rate-limiting limits apply; the journal prevents duplicate collection per attempt, not all fraudulent guest order creation.

## Validation and remaining live acceptance

- `npm test`: frontend and protocol tests, including the actual bridge handler with fake Supabase/provider dependencies. Tests cover concurrency, timeout non-retry, immutable attempts, unverified collection results, HMAC tampering, canonical mismatch, fresh callback verification and sticky success. No real provider requests.
- `supabase/delivery-payment-tests.sql`: project-owner rollback-only tests for pricing, private tokens, service-only mutations, unpaid fulfilment guard, cash-switch guard, failed/pending races, multiple late settlements and monotonic paid. It invokes no network and leaves no fixtures.
- `node scripts/payment-smoke.mjs`: deployed configuration/bridge authentication/CORS checks. Never creates an order or payment; run by the combined Pages workflow before publication.
- A real MTN/Airtel wallet approval, settlement timing, production gateway availability, merchant permissions and receipt/refund handling **have not been tested with money**. The health check confirms configured secrets and reachable deployed functions, not provider acceptance or merchant wallet capabilities. Arrange a supervised low-value test with the owner's explicit consent before relying on Mobile Money for service. No live charge was authorised or requested during implementation.
