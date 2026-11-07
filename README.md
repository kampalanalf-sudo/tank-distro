# Charbroiled Juicy Chicken

A Kampala fast-food delivery storefront with a connected Supabase order backend, protected admin/rider workspaces, a progress slider, and opt-in GPS delivery tracking.

The restaurant name, orange/gold/brown palette and simplified SVG badge are based on the supplied logo screenshot. The menu, photographs, prices and delivery estimates remain sample content for the owner to verify.

## Run

Requires Node.js 22.12 or later.

```bash
npm ci
npm run dev        # 0.0.0.0:5173, supports Arena live preview
npm test           # 18 interaction and GPS lifecycle tests
npm run typecheck
npm run build      # deploy the complete dist/ folder
```

## GitHub Pages website

The prepared restaurant publication URL is **https://kampalanalf-sudo.github.io/tank-distro/juicy-chicken/**. The existing homepage at `/tank-distro/` is preserved. See [GitHub Pages deployment](docs/GITHUB_PAGES.md).

## App entry points

- Storefront: `/`
- Admin: `/#admin`
- Rider: `/#rider`
- Customer tracking: `/#track` or **My orders**

The storefront footer links to each workspace. **Explore sample dashboard** offers an explicitly labelled local preview without access to real orders or GPS.

## Connected backend

A separate free Supabase project, **Charbroiled Juicy Chicken**, has been provisioned with approval. The existing `tanktickets` project is unchanged. Checkout now sends orders to this backend, which calculates prices, stores customer delivery details, and protects staff reads and mutations with Auth, row policies and validated RPCs.

**First admin access still requires activation.** Register and verify your staff email, then have the project owner grant the admin role. There is no default admin password or public self-promotion. See the complete [setup and operations guide](docs/DELIVERY_SETUP.md), including SQL instructions and email-provider restrictions.

No online payment processing, SMS/WhatsApp/email order notifications, native background GPS, route planning or live ETA calculation is connected. The owner must confirm the real menu and operational policies before accepting actual deliveries.

## Features

- Responsive menu, search, categories, price sorting, favourites and persistent cart
- UGX prices and Kampala delivery areas
- Connected checkout with server-validated prices and idempotent same-request retries
- Protected admin inbox with search, status filters, customer details, items and kitchen notes
- Six-stage progress slider, explicit save, status history and cancellation
- Rider assignment and protected rider-only delivery controls
- Opt-in browser GPS; last location, timestamps, accuracy and stale/paused warnings
- Leaflet/OpenStreetMap map, with coordinates and link if tiles cannot load
- Private customer tracking code and automatically refreshed progress
- Legacy device-only demo orders remain labelled and are never uploaded

## GPS requirements

The assigned rider must sign in on an HTTPS page, mark a ready order picked up, consent to sharing, and allow browser location access. **Keep the rider page visible.** Browser GPS can be suspended in the background; reliable screen-off tracking needs a native app. Coordinates are shared only during the assigned delivery. Completion/cancellation deletes its stored GPS point.

## Source guide

- `src/App.tsx`: storefront, cart and checkout
- `src/delivery/api.ts`: publishable configuration, types and backend calls
- `src/delivery/Portal.tsx`: staff authentication, admin dashboard and rider controls
- `src/delivery/Tracking.tsx`: customer tracker, progress and map
- `src/delivery/useRiderGps.ts`: consent-triggered GPS lifecycle
- `supabase/delivery.sql`, `supabase/delivery-hardening.sql`: deployed restaurant schema/RPC migrations
- `supabase/delivery-tests.sql`: transactional backend assertions, already verified on the connected project
- `tests/`: mocked storefront, backend error handling, access-gating and GPS tests

Historical radio code, assets and database scripts remain in the repository but are not used by this app. Do not apply the old radio `schema.sql` as the restaurant backend.

## Branding and customisation

The badge at `public/brand/charbroiled-juicy-chicken.svg` is a clean, simplified vector recreation of the screenshot, not the original artwork. Replace it with the original logo when available. Generated menu photographs are illustrative.

Update the sample `products` and `areas` in `src/App.tsx` **and** their server equivalents (`delivery_menu`, `delivery_areas`) when confirming the menu; checkout always uses the server prices. The client includes only a public publishable Supabase key. Never add a service-role key or database password to the frontend.

Before production, activate staff accounts, configure SMTP/auth redirects, add robust anti-abuse protection and privacy/retention policies, and test real orders and GPS on separate phones. See [docs/DELIVERY_SETUP.md](docs/DELIVERY_SETUP.md).
