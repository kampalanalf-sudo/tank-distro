-- Restaurant project nbzjrirqstfevobtxkuf. Run after delivery + delivery-hardening.
begin;
alter table public.delivery_orders add column payment_method text not null default 'cash' check(payment_method in ('cash','mobile_money'));
alter table public.delivery_orders add column payment_status text not null default 'unpaid' check(payment_status in ('unpaid','pending','paid','failed'));
alter table public.delivery_orders add column payment_review_required boolean not null default false;
create table public.delivery_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.delivery_orders(id) on delete restrict,
  external_ref text not null unique,
  amount integer not null check(amount > 0), currency text not null default 'UGX' check(currency = 'UGX'),
  phone text not null,
  status text not null default 'initiating' check(status in ('initiating','pending','unknown','completed','failed')),
  provider_reference text unique,
  verified_at timestamptz,
  collection_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), created_at timestamptz not null default clock_timestamp()
);
create index delivery_payments_order_idx on public.delivery_payments(order_id,created_at desc);
create unique index delivery_one_unresolved_payment on public.delivery_payments(order_id) where status in ('initiating','pending','unknown');
alter table public.delivery_payments enable row level security;
revoke all on public.delivery_payments from public,anon,authenticated;
grant select on public.delivery_payments to authenticated;
grant all on public.delivery_payments to service_role;
create policy payment_admin_read on public.delivery_payments for select to authenticated using(public.delivery_role() = 'admin');

-- Preserve the validated pricing/idempotency implementation behind a restricted wrapper.
alter function public.place_delivery_order(text,text,text,text,text,jsonb,uuid,text) rename to create_delivery_order_base;
revoke execute on function public.create_delivery_order_base(text,text,text,text,text,jsonb,uuid,text) from public,anon,authenticated;
create function public.place_delivery_order(p_name text,p_phone text,p_address text,p_area text,p_notes text,p_items jsonb,p_request_id uuid,p_tracking_token text,p_payment_method text default 'cash') returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb; o delivery_orders%rowtype;
begin
  if p_payment_method is null or p_payment_method not in ('cash','mobile_money') then raise exception 'Choose cash or Mobile Money'; end if;
  result := public.create_delivery_order_base(p_name,p_phone,p_address,p_area,p_notes,p_items,p_request_id,p_tracking_token);
  select * into o from delivery_orders where id = (result->>'id')::uuid for update;
  if o.status = 'received' and not exists(select 1 from delivery_payments where order_id = o.id) then
    update delivery_orders set payment_method = p_payment_method where id = o.id returning * into o;
  end if;
  return result || jsonb_build_object('payment_method',o.payment_method,'payment_status',o.payment_status);
end $$;
revoke execute on function public.place_delivery_order(text,text,text,text,text,jsonb,uuid,text,text) from public;
grant execute on function public.place_delivery_order(text,text,text,text,text,jsonb,uuid,text,text) to anon,authenticated;

alter function public.track_delivery_order(uuid,text) rename to track_delivery_order_base;
revoke execute on function public.track_delivery_order_base(uuid,text) from public,anon,authenticated;
create function public.track_delivery_order(p_order_id uuid,p_tracking_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb; o delivery_orders%rowtype; p delivery_payments%rowtype;
begin
  result := public.track_delivery_order_base(p_order_id,p_tracking_token);
  select * into o from delivery_orders where id = p_order_id;
  select * into p from delivery_payments where order_id = p_order_id order by (status = 'completed') desc,created_at desc limit 1;
  return result || jsonb_build_object('payment_method',o.payment_method,'payment_status',o.payment_status,'payment_review_required',o.payment_review_required,'payment',case when p.id is null then null else jsonb_build_object('id',p.id,'status',p.status,'reference',p.provider_reference,'external_ref',p.external_ref,'amount',p.amount,'currency',p.currency,'created_at',p.created_at,'verified_at',p.verified_at) end);
end $$;
revoke execute on function public.track_delivery_order(uuid,text) from public;
grant execute on function public.track_delivery_order(uuid,text) to anon,authenticated;

create function public.claim_delivery_payment(p_order_id uuid,p_tracking_token text,p_phone text) returns jsonb language plpgsql security definer set search_path = public,extensions as $$
declare o delivery_orders%rowtype; p delivery_payments%rowtype; normal_phone text;
begin
  select * into o from delivery_orders where id = p_order_id and tracking_hash = encode(digest(coalesce(p_tracking_token,''),'sha256'),'hex') for update;
  if not found then raise exception 'Invalid private order details'; end if;
  if o.status in ('delivered','cancelled') then raise exception 'This order is closed'; end if;
  select * into p from delivery_payments where order_id = o.id and status <> 'failed' order by (status = 'completed') desc,created_at desc limit 1;
  if found then return to_jsonb(p) || jsonb_build_object('claimed',false); end if;
  normal_phone := regexp_replace(coalesce(p_phone,''),'[[:space:]+]','','g');
  if normal_phone ~ '^07[0-9]{8}$' then normal_phone := '256' || substring(normal_phone from 2); end if;
  if normal_phone !~ '^2567[0-9]{8}$' then raise exception 'Enter a valid Ugandan Mobile Money number'; end if;
  if (select count(*) from delivery_payments where order_id = o.id and created_at > now() - interval '1 hour') >= 3 then raise exception 'Payment attempt limit reached. Contact the restaurant.'; end if;
  insert into delivery_payments(order_id,external_ref,amount,phone) values(o.id,'CJC-'||gen_random_uuid()::text,o.total,normal_phone) returning * into p;
  update delivery_orders set payment_method = 'mobile_money',payment_status = 'pending',updated_at = now() where id = o.id;
  return to_jsonb(p) || jsonb_build_object('claimed',true);
end $$;
revoke execute on function public.claim_delivery_payment(uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_delivery_payment(uuid,text,text) to service_role;

create function public.apply_delivery_gateway_result(p_payment_id uuid,p_reference text,p_amount integer,p_currency text,p_direction text,p_status text,p_verified boolean) returns void language plpgsql security definer set search_path = public as $$
declare p delivery_payments%rowtype; o delivery_orders%rowtype;
begin
  -- Consistent lock order: order first, then payment.
  select * into p from delivery_payments where id = p_payment_id;
  if not found then raise exception 'Payment not found'; end if;
  select * into o from delivery_orders where id = p.order_id for update;
  select * into p from delivery_payments where id = p_payment_id for update;
  if p_reference is null or length(p_reference) not between 1 and 200 or p_amount is distinct from p.amount or p_currency is distinct from 'UGX' or coalesce(p_direction,'collect') <> 'collect' or p_status is null or p_status not in ('pending','completed','failed','unknown') then raise exception 'Gateway transaction does not match this order'; end if;
  if p.provider_reference is not null and p.provider_reference <> p_reference then raise exception 'Gateway reference mismatch'; end if;
  if p_status in ('completed','failed') and p_verified is distinct from true then raise exception 'Server verification is required'; end if;
  if p.status = 'completed' or (p.status = 'failed' and p_status in ('pending','unknown')) then return; end if;
  -- A signed late success can correct a previous failure, but it cannot reopen delivery.
  update delivery_payments set provider_reference = p_reference,status = p_status,verified_at = case when p_verified then now() else verified_at end,updated_at = now() where id = p.id;
  update delivery_orders set payment_status = case when p_status = 'completed' or exists(select 1 from delivery_payments d where d.order_id = o.id and d.status = 'completed') then 'paid' when exists(select 1 from delivery_payments d where d.order_id = o.id and d.status in ('initiating','pending','unknown')) then 'pending' when p_status = 'failed' then 'failed' else 'pending' end,
    payment_review_required = payment_review_required or (p_status = 'completed' and (o.status = 'cancelled' or o.payment_method = 'cash' or exists(select 1 from delivery_payments d where d.order_id = o.id and d.id <> p.id and d.status <> 'failed'))),
    payment_method = case when p_status = 'completed' then 'mobile_money' else payment_method end,
    updated_at = now() where id = o.id;
end $$;
revoke execute on function public.apply_delivery_gateway_result(uuid,text,integer,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.apply_delivery_gateway_result(uuid,text,integer,text,text,text,boolean) to service_role;

create function public.choose_delivery_cash(p_order_id uuid,p_tracking_token text) returns void language plpgsql security definer set search_path = public,extensions as $$
declare o delivery_orders%rowtype;
begin
  select * into o from delivery_orders where id = p_order_id and tracking_hash = encode(digest(coalesce(p_tracking_token,''),'sha256'),'hex') for update;
  if not found then raise exception 'Invalid private order details'; end if;
  if o.status in ('delivered','cancelled') then raise exception 'This order is closed'; end if;
  if exists(select 1 from delivery_payments where order_id = o.id and status <> 'failed') then raise exception 'A payment is pending or completed. Do not pay cash as well.'; end if;
  update delivery_orders set payment_method = 'cash',payment_status = 'unpaid',updated_at = now() where id = o.id;
end $$;
revoke execute on function public.choose_delivery_cash(uuid,text) from public;
grant execute on function public.choose_delivery_cash(uuid,text) to anon,authenticated;

create function public.guard_unpaid_mobile_order() returns trigger language plpgsql set search_path = public as $$ begin
  if new.status is distinct from old.status and new.status in ('confirmed','preparing','ready','on_the_way','delivered') and new.payment_method = 'mobile_money' and new.payment_status <> 'paid' then raise exception 'Verify Mobile Money payment before progressing this order'; end if;
  return new;
end $$;
revoke execute on function public.guard_unpaid_mobile_order() from public,anon,authenticated;
create trigger delivery_mobile_payment_guard before update on public.delivery_orders for each row execute function public.guard_unpaid_mobile_order();
commit;
