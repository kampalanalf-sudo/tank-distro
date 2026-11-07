-- Apply on the restaurant after delivery-payments.sql. Safe to reapply.
begin;
alter table public.delivery_payments alter column created_at set default clock_timestamp();
create or replace function public.place_delivery_order(p_name text,p_phone text,p_address text,p_area text,p_notes text,p_items jsonb,p_request_id uuid,p_tracking_token text,p_payment_method text default 'cash') returns jsonb
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

create or replace function public.track_delivery_order(p_order_id uuid,p_tracking_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb; o delivery_orders%rowtype; p delivery_payments%rowtype;
begin
  result := public.track_delivery_order_base(p_order_id,p_tracking_token);
  select * into o from delivery_orders where id = p_order_id;
  select * into p from delivery_payments where order_id = p_order_id order by (status = 'completed') desc,created_at desc limit 1;
  return result || jsonb_build_object('payment_method',o.payment_method,'payment_status',o.payment_status,'payment_review_required',o.payment_review_required,'payment',case when p.id is null then null else jsonb_build_object('id',p.id,'status',p.status,'reference',p.provider_reference,'external_ref',p.external_ref,'amount',p.amount,'currency',p.currency,'created_at',p.created_at,'verified_at',p.verified_at) end);
end $$;

create or replace function public.apply_delivery_gateway_result(p_payment_id uuid,p_reference text,p_amount integer,p_currency text,p_direction text,p_status text,p_verified boolean) returns void language plpgsql security definer set search_path = public as $$
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
commit;
