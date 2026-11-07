-- Apply ONLY on TankTickets xmfvxypioitbsnsbgioq.
-- Dedicated journal; no changes to TankTickets orders, functions or callbacks.
begin;
create table public.cjc_gateway_requests (
  payment_id uuid primary key,
  restaurant_order_id uuid not null,
  external_ref text not null unique,
  amount integer not null check(amount > 0),
  phone text not null,
  provider_reference text unique,
  status text not null default 'unknown' check(status in ('unknown','pending','completed','failed')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cjc_gateway_requests enable row level security;
revoke all on public.cjc_gateway_requests from public,anon,authenticated;
grant all on public.cjc_gateway_requests to service_role;
commit;
