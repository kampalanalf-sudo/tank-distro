# Restaurant admin, orders and GPS

## Connected project

A **separate free Supabase project**, **Charbroiled Juicy Chicken** (`nbzjrirqstfevobtxkuf`, EU West), has been created with the user's approval. The existing `tanktickets` project was not modified.

The restaurant tables and RPC functions are deployed. Only the project's **publishable** key and URL are included in the client. The app never needs a database password or service-role key. No real staff account has been created or granted access yet.

## Entry points

Append these fragments to the live preview or your deployed URL:

- `#admin`: administrator sign-in and order dashboard
- `#rider`: rider sign-in, assigned orders and GPS sharing
- `#track`: private customer order lookup

The storefront footer also links to all three. Customers who order on the current device can use **My orders** to reopen their saved tracking cards.

## Activate the first admin

1. Open **Admin workspace** and select **New team member? Create an account**.
2. Register with your own email and a strong password. Do not send your password through chat.
3. Follow the Supabase confirmation email link, then return to the workspace. **Signing up never automatically makes someone an admin.**
4. Using the Supabase project owner's SQL Editor, run the following with the actual verified email and display name. The example strings below must be replaced:

```sql
insert into public.delivery_staff (user_id, display_name, role, active)
select id, 'Restaurant owner', 'admin', true
from auth.users
where lower(email) = lower('replace-with-your-verified-email@example.com')
  and email_confirmed_at is not null
on conflict (user_id) do update
set display_name = excluded.display_name, role = excluded.role, active = true;
```

Check that exactly the intended account was activated. You can inspect `auth.users` in Supabase Authentication → Users, and `delivery_staff` in Table Editor. Alternatively, after registering and verifying, tell the coding agent **only the email address** to activate; never share the password.

If the default Supabase mail service cannot deliver to your email, configure custom SMTP in the dashboard, or create the account using **Authentication → Users → Add user** as the project owner. The default email service has sending/recipient restrictions; creating this project does not configure a production mail provider.

There is no hidden admin bypass, default password or public self-promotion API. Project-owner access is intentionally required for role grants.

## Activate riders

Each rider creates and verifies an account at `#rider`. In the project owner's SQL Editor:

```sql
insert into public.delivery_staff (user_id, display_name, role, active)
select id, 'Rider display name', 'rider', true
from auth.users
where lower(email) = lower('replace-with-rider-verified-email@example.com')
  and email_confirmed_at is not null
on conflict (user_id) do update
set display_name = excluded.display_name, role = excluded.role, active = true;
```

Only active riders appear in the assignment selector. Riders cannot read other riders' orders or change their role. Deactivate accounts by setting `active = false` in `delivery_staff`; row policies and RPC role checks then deny access. A phone/browser may still display previously received information until its next refresh.

## Order workflow

1. Checkout calls `place_delivery_order`. The server validates the basket and customer fields, looks up the menu and area prices, and saves a price snapshot.
2. The request includes a random UUID and a cryptographically random 256-bit tracking token. The server stores only its SHA-256 hash. Retrying the same request is idempotent. Current-tab retries reuse the same keys. An interrupted browser session/reload is not an offline order queue: check tracking before placing a new order.
3. Admin sees new orders in the dashboard (5-second polling while visible), their items, delivery address, phone and kitchen notes. It shows the latest 200 orders, and the metrics refer to that loaded set. The dashboard is not a full accounting or unlimited history system.
4. Admin moves the slider **one stage at a time** and presses **Save progress**:
   **Received → Confirmed → Preparing → Ready for pickup → On the way → Delivered**.
5. Admin assigns an active rider before dispatch. Each rider can have only one active order at a time. Assignment is locked once the order is on the way.
6. Once ready, the assigned rider can acknowledge pickup, which moves the order to **On the way**. Riders may also mark their on-the-way orders delivered. Only admins can cancel orders.
7. Each status change records an event and uses an expected-status check to reject conflicting updates. Terminal states cannot be reopened.
8. Customer tracking refreshes every 7 seconds while visible. The bearer token authorises only that order's summary and last rider location, never the customer's address or phone.

Orders sent by the new connected checkout are **not** device-only demos. The old local demo history is retained but clearly labelled and is never imported into the backend. The menu and prices still need owner approval. No payment, SMS, WhatsApp, email order notification or automatic delivery dispatch is integrated. Payment is recorded in the UI as cash on delivery; payment collection/reconciliation is not implemented.

## GPS workflow and limits

- The rider must be signed in with an active rider role and assigned to an **on-the-way** order.
- On the rider's phone, open the secure HTTPS site, enable device location, tick the consent box, and choose **Start sharing GPS**. Accept the browser's location prompt.
- The browser uses `navigator.geolocation.watchPosition` with high accuracy. New fixes upload at most once every 8 seconds while updates arrive. This is a target upload interval, not a guarantee that the phone produces a new position every 8 seconds.
- GPS is opt-in and never starts simply because someone signs in. Admins cannot remotely enable a rider's GPS.
- The admin/customer map is **OpenStreetMap via Leaflet**. No map API key is needed. Coordinates and an external map link remain available if tiles fail. Map tiles require access to OpenStreetMap; comply with their tile usage policy and choose a production provider if traffic grows.
- The UI labels no fix, low accuracy, paused sharing and fixes older than 45 seconds. A last known position is never labelled as a guaranteed live position. Displayed accuracy comes from the phone, not a delivery-distance calculation.
- Sharing pauses if the page is hidden, the rider leaves it, or the rider presses stop. Permission denial, unavailable GPS, timeouts and upload failures are explained in the rider UI. GPS can use extra battery.
- **Keep the rider page visible.** Mobile browsers can suspend pages; this web app does not promise screen-off/background tracking. Reliable background tracking requires a native app and platform-specific background permissions.
- Server role checks reject other riders' uploads, GPS outside the delivery stage, invalid coordinates, and outdated fixes. Each order stores only one most-recent point, not a travel history.
- Completion/cancellation deletes the location. A locked order row prevents an in-flight upload from recreating GPS after completion.
- Abrupt disconnection may prevent sending the stop message; the remaining fix becomes visibly stale after 45 seconds. It is not a new GPS update.
- Riders should operate controls only when safely parked.

There is no turn-by-turn routing, route history, customer GPS collection or computed arrival-time prediction. The storefront's 30–45-minute estimate remains a sample, not a live ETA.

## Hosting and environment

The approved restaurant URL/key are supplied as public defaults in `src/delivery/api.ts`. To point at a different prepared restaurant project, set these build-time variables:

```dotenv
VITE_DELIVERY_SUPABASE_URL=https://your-restaurant-project.supabase.co
VITE_DELIVERY_SUPABASE_KEY=your-publishable-key
VITE_DELIVERY_MODE=live
```

Set `VITE_DELIVERY_MODE=demo` to keep the storefront checkout offline. This does not disable the protected staff portal; the separate sample dashboard button is always local-only.

For a fresh project, apply `supabase/delivery.sql`, then `supabase/delivery-hardening.sql`. They are already applied to the connected project—do not rerun the creation scripts there. **Do not use the old radio `schema.sql` as the restaurant schema.**

Supabase Auth has email confirmation enabled. Its Site URL is configured for `https://kampalanalf-sudo.github.io/tank-distro/juicy-chicken/`, and that path is allowed for email-confirmation redirects. Development redirect URLs also allow `http://localhost:5173/**` and `https://*.e2b.app/**`. Before production, set **Site URL** to your exact HTTPS domain, add the exact production callback URL, and remove broad development wildcard origins. Signup explicitly requests the current origin as its confirmation redirect. Email delivery still depends on Supabase/custom SMTP configuration.

Deploy the full `dist/` directory. Hash-based routes do not need server rewrites. Add the Supabase host to any CSP `connect-src` policy and OpenStreetMap to `img-src` if you introduce a CSP. Browser-facing code talks directly to the public Supabase API with the publishable key; RLS and RPCs enforce access. There are no browser calls to a localhost backend.

## Security and launch checklist

- Activate the owner and rider accounts; test with real separate devices.
- Verify real menu availability, prices, area fees and restaurant operating hours. Keep frontend menu and server `delivery_menu` / `delivery_areas` in sync. Server prices always win at checkout.
- Enable appropriate production anti-abuse controls (edge/WAF rate limiting and captcha/verified checkout as needed). The guest RPC currently has only a basic per-phone limit, not robust global/IP bot protection.
- Add production SMTP and restrict auth redirects to the real domain. Consider MFA for admins.
- Add customer privacy, refund, allergen, data retention and delivery policies. Configure customer-data retention and deletion processes. No automatic PII retention purge is configured.
- Tracking codes are sensitive bearer credentials. They are stored with receipts on the ordering device, not in public URLs. Anyone with the full order ID and private code can view that order's summary and current-delivery GPS. Do not publish them.
- Staff sessions persist on the signed-in device. Sign out of shared devices.
- Protect the Supabase project-owner account. Never put service-role keys or database passwords in a `VITE_` variable, source code or browser storage.

## Verification

- `npm test`: 18 storefront, connected-checkout, access-gating, progress and GPS lifecycle tests using mocks—these never place real orders.
- `npm run build`: TypeScript and production bundling.
- `supabase/delivery-tests.sql`: backend assertions for pricing, idempotency, role checks, tracking privacy, stage transitions, GPS lifecycle, privileges and RLS. Test fixtures are created inside a transaction and rolled back. These assertions have passed on the connected restaurant project.
- Browser checks exercised admin progress/assignment and rider GPS permission/upload/stop/completion using simulated coordinates and intercepted API responses. Responsive layouts were checked at 320, 390, 768 and 1440 pixels. Real-device/background behaviour and production email delivery still require owner testing.
