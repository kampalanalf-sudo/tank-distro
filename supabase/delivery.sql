-- Charbroiled Juicy Chicken: isolated restaurant backend.
-- Run on the restaurant project ONLY, not the legacy radio schema.
begin;
create extension if not exists pgcrypto with schema extensions;

create table public.delivery_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 2 and 100),
  role text not null check (role in ('admin','rider')),
  active boolean not null default true
);
create function public.delivery_role() returns text language sql stable security definer set search_path = public
as $$ select role from public.delivery_staff where user_id = auth.uid() and active $$;

create table public.delivery_menu (
  id integer primary key, name text not null, price integer not null check(price > 0), active boolean not null default true
);
insert into public.delivery_menu(id,name,price) values
(1,'The Kampala Smash',25000),(2,'Crispy Chicken & Chips',22000),(3,'Pepperoni Party',35000),
(4,'The Loaded Rolex',10000),(5,'Smash & Chips Combo',30000),(6,'Chicken Sharing Box',45000),
(7,'Extra Cheese Pepperoni',30000),(8,'Double Egg Rolex',8000);
create table public.delivery_areas (name text primary key, fee integer not null check(fee >= 0));
insert into public.delivery_areas values ('Kampala Central',4000),('Kololo',5000),('Ntinda',6000),('Bukoto',6000),('Naguru',6000),('Nakasero',4000),('Bugolobi',6000),('Kansanga',6000),('Muyenga',7000),('Makindye',6000),('Other Kampala area',8000);

create table public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  tracking_hash text not null unique,
  request_id uuid not null unique,
  customer_name text not null,
  phone text not null,
  address text not null,
  area text not null references public.delivery_areas(name),
  notes text not null default '',
  items jsonb not null,
  subtotal integer not null check(subtotal > 0),
  delivery_fee integer not null check(delivery_fee >= 0),
  total integer generated always as (subtotal + delivery_fee) stored,
  status text not null default 'received' check(status in ('received','confirmed','preparing','ready','on_the_way','delivered','cancelled')),
  rider_id uuid references public.delivery_staff(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index delivery_orders_rider_idx on public.delivery_orders(rider_id,status);
create index delivery_orders_created_idx on public.delivery_orders(created_at desc);
create table public.delivery_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.delivery_orders(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users(id)
);
create index delivery_events_order_idx on public.delivery_events(order_id,created_at);
-- One last location per ORDER, not per rider: no movement history or cross-order leakage.
create table public.delivery_locations (
  order_id uuid primary key references public.delivery_orders(id) on delete cascade,
  rider_id uuid not null references public.delivery_staff(user_id),
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  accuracy double precision not null check(accuracy >= 0 and accuracy <= 10000),
  captured_at timestamptz not null,
  received_at timestamptz not null default now(),
  sharing boolean not null default true
);

alter table public.delivery_staff enable row level security;
alter table public.delivery_menu enable row level security;
alter table public.delivery_areas enable row level security;
alter table public.delivery_orders enable row level security;
alter table public.delivery_events enable row level security;
alter table public.delivery_locations enable row level security;
create policy staff_read on public.delivery_staff for select to authenticated using(user_id = auth.uid() or public.delivery_role() = 'admin');
create policy menu_read on public.delivery_menu for select to anon,authenticated using(active);
create policy areas_read on public.delivery_areas for select to anon,authenticated using(true);
create policy orders_read on public.delivery_orders for select to authenticated using(public.delivery_role() = 'admin' or (public.delivery_role() = 'rider' and rider_id = auth.uid() and status not in ('delivered','cancelled')));
create policy events_read on public.delivery_events for select to authenticated using(exists(select 1 from public.delivery_orders o where o.id = order_id));
create policy location_read on public.delivery_locations for select to authenticated using(exists(select 1 from public.delivery_orders o where o.id = order_id));
-- Never allow client INSERT/UPDATE/DELETE. All writes use validated, role-checked RPCs.
revoke all on public.delivery_orders,public.delivery_staff,public.delivery_events,public.delivery_locations from anon,authenticated;
grant select on public.delivery_orders,public.delivery_staff,public.delivery_events,public.delivery_locations to authenticated;
revoke all on public.delivery_menu,public.delivery_areas from anon,authenticated;
grant select on public.delivery_menu,public.delivery_areas to anon,authenticated;

create function public.place_delivery_order(p_name text,p_phone text,p_address text,p_area text,p_notes text,p_items jsonb,p_request_id uuid,p_tracking_token text)
returns jsonb language plpgsql security definer set search_path = public,extensions as $$
declare v_fee integer; v_subtotal integer := 0; v_items jsonb := '[]'; v_item jsonb; v_menu delivery_menu%rowtype; v_quantity integer; v_order delivery_orders%rowtype; v_hash text;
begin
  if p_tracking_token is null or p_tracking_token !~ '^[a-f0-9]{64}$' or p_request_id is null then raise exception 'Invalid request key'; end if;
  v_hash := encode(digest(p_tracking_token,'sha256'),'hex');
  -- Serialize duplicate requests so retrying a slow network never duplicates an order.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into v_order from delivery_orders where request_id = p_request_id;
  if found then
    if v_order.tracking_hash <> v_hash then raise exception 'Request already used'; end if;
    return jsonb_build_object('id',v_order.id,'total',v_order.total,'created_at',v_order.created_at,'area',v_order.area,'items',v_order.items);
  end if;
  if p_name is null or length(trim(p_name)) not between 2 and 100 or p_address is null or length(trim(p_address)) not between 8 and 500 or length(coalesce(p_notes,'')) > 1000 then raise exception 'Check your name, address and notes'; end if;
  if p_phone is null or regexp_replace(p_phone,'[[:space:]]','','g') !~ '^(0[0-9]{9}|\+256[0-9]{9}|256[0-9]{9})$' then raise exception 'Enter a valid Ugandan phone number'; end if;
  select fee into v_fee from delivery_areas where name = p_area;
  if not found then raise exception 'Choose a supported delivery area'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Invalid basket'; end if;
  if jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Basket must have 1 to 30 lines'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity not between 1 and 20 then raise exception 'Quantity must be between 1 and 20'; end if;
    select * into v_menu from delivery_menu where id = (v_item->>'id')::integer and active;
    if not found then raise exception 'An item is no longer available'; end if;
    v_subtotal := v_subtotal + v_menu.price * v_quantity;
    v_items := v_items || jsonb_build_array(jsonb_build_object('id',v_menu.id,'name',v_menu.name,'price',v_menu.price,'quantity',v_quantity));
  end loop;
  -- Basic phone abuse protection; production should also add an edge/WAF captcha/rate limit.
  perform pg_advisory_xact_lock(hashtextextended(regexp_replace(p_phone,'[[:space:]]','','g'),1));
  if (select count(*) from delivery_orders where phone = trim(p_phone) and created_at > now() - interval '15 minutes') >= 5 then raise exception 'Too many orders. Please wait before trying again.'; end if;
  insert into delivery_orders(tracking_hash,request_id,customer_name,phone,address,area,notes,items,subtotal,delivery_fee)
  values(v_hash,p_request_id,trim(p_name),trim(p_phone),trim(p_address),p_area,coalesce(p_notes,''),v_items,v_subtotal,v_fee) returning * into v_order;
  insert into delivery_events(order_id,status) values(v_order.id,'received');
  return jsonb_build_object('id',v_order.id,'total',v_order.total,'created_at',v_order.created_at,'area',v_order.area,'items',v_order.items);
end $$;

create function public.assign_delivery_rider(p_order_id uuid,p_rider_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_order delivery_orders%rowtype;
begin
  if public.delivery_role() is distinct from 'admin' then raise exception 'Admin access required'; end if;
  select * into v_order from delivery_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status in ('on_the_way','delivered','cancelled') then raise exception 'Rider assignment is locked after dispatch'; end if;
  if p_rider_id is not null and not exists(select 1 from delivery_staff where user_id = p_rider_id and role = 'rider' and active) then raise exception 'Choose an active rider'; end if;
  if p_rider_id is not null and exists(select 1 from delivery_orders where rider_id = p_rider_id and id <> p_order_id and status not in ('delivered','cancelled')) then raise exception 'This rider already has an active delivery'; end if;
  update delivery_orders set rider_id = p_rider_id,updated_at = now() where id = p_order_id;
  delete from delivery_locations where order_id = p_order_id;
end $$;

create function public.update_delivery_status(p_order_id uuid,p_status text,p_expected_status text) returns void language plpgsql security definer set search_path = public as $$
declare v_order delivery_orders%rowtype; v_role text := public.delivery_role(); v_steps text[] := array['received','confirmed','preparing','ready','on_the_way','delivered'];
begin
  select * into v_order from delivery_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_role is null or not(v_role = 'admin' or (v_role = 'rider' and v_order.rider_id = auth.uid() and v_order.status in ('ready','on_the_way') and p_status in ('on_the_way','delivered'))) then raise exception 'Not authorised to update this order'; end if;
  if v_order.status <> p_expected_status then raise exception 'Order changed. Refresh and try again.'; end if;
  if v_order.status in ('delivered','cancelled') then raise exception 'This order is closed'; end if;
  if p_status = 'cancelled' then
    if v_role <> 'admin' then raise exception 'Admin access required'; end if;
  elsif array_position(v_steps,p_status) is null or array_position(v_steps,p_status) <> array_position(v_steps,v_order.status) + 1 then raise exception 'Advance one stage at a time'; end if;
  if p_status = 'on_the_way' and v_order.rider_id is null then raise exception 'Assign a rider before dispatch'; end if;
  update delivery_orders set status = p_status,updated_at = now() where id = p_order_id;
  insert into delivery_events(order_id,status,actor_id) values(p_order_id,p_status,auth.uid());
  if p_status in ('delivered','cancelled') then delete from delivery_locations where order_id = p_order_id; end if;
end $$;

create function public.share_delivery_location(p_order_id uuid,p_lat double precision,p_lng double precision,p_accuracy double precision,p_captured_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.delivery_role() is distinct from 'rider' or not exists(select 1 from delivery_orders where id = p_order_id and rider_id = auth.uid() and status = 'on_the_way') then raise exception 'Only the assigned rider can share GPS during delivery'; end if;
  if p_lat is null or p_lng is null or p_accuracy is null or p_captured_at is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 10000 or p_captured_at < now() - interval '2 minutes' or p_captured_at > now() + interval '30 seconds' then raise exception 'Invalid or outdated GPS fix'; end if;
  insert into delivery_locations(order_id,rider_id,latitude,longitude,accuracy,captured_at,sharing)
  values(p_order_id,auth.uid(),p_lat,p_lng,p_accuracy,p_captured_at,true)
  on conflict(order_id) do update set rider_id = auth.uid(),latitude = excluded.latitude,longitude = excluded.longitude,accuracy = excluded.accuracy,captured_at = excluded.captured_at,received_at = now(),sharing = true
  where excluded.captured_at >= delivery_locations.captured_at;
end $$;
create function public.stop_delivery_location(p_order_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if public.delivery_role() is distinct from 'rider' or not exists(select 1 from delivery_orders where id = p_order_id and rider_id = auth.uid()) then raise exception 'Assigned rider access required'; end if;
  update delivery_locations set sharing = false where order_id = p_order_id and rider_id = auth.uid();
end $$;

create function public.track_delivery_order(p_order_id uuid,p_tracking_token text) returns jsonb language plpgsql security definer set search_path = public,extensions as $$
declare v_order delivery_orders%rowtype; v_location jsonb; v_events jsonb; v_name text;
begin
  if p_tracking_token is null or length(p_tracking_token) <> 64 then raise exception 'Invalid tracking details'; end if;
  select * into v_order from delivery_orders where id = p_order_id and tracking_hash = encode(digest(p_tracking_token,'sha256'),'hex');
  if not found then raise exception 'Order not found. Check the order ID and private tracking code.'; end if;
  if v_order.status = 'on_the_way' then
    select jsonb_build_object('latitude',latitude,'longitude',longitude,'accuracy',accuracy,'captured_at',captured_at,'received_at',received_at,'sharing',sharing)
    into v_location from delivery_locations where order_id = p_order_id and rider_id = v_order.rider_id;
  end if;
  select display_name into v_name from delivery_staff where user_id = v_order.rider_id;
  select coalesce(jsonb_agg(jsonb_build_object('status',status,'created_at',created_at) order by created_at),'[]') into v_events from delivery_events where order_id = p_order_id;
  return jsonb_build_object('id',v_order.id,'status',v_order.status,'total',v_order.total,'area',v_order.area,'items',v_order.items,'created_at',v_order.created_at,'updated_at',v_order.updated_at,'rider_name',v_name,'location',v_location,'events',v_events);
end $$;

-- Explicit RPC allowlist, no default PUBLIC execution.
revoke execute on function public.delivery_role() from public,anon;
grant execute on function public.delivery_role() to authenticated;
revoke execute on function public.place_delivery_order(text,text,text,text,text,jsonb,uuid,text) from public;
grant execute on function public.place_delivery_order(text,text,text,text,text,jsonb,uuid,text) to anon,authenticated;
revoke execute on function public.track_delivery_order(uuid,text) from public;
grant execute on function public.track_delivery_order(uuid,text) to anon,authenticated;
revoke execute on function public.assign_delivery_rider(uuid,uuid),public.update_delivery_status(uuid,text,text),public.share_delivery_location(uuid,double precision,double precision,double precision,timestamptz),public.stop_delivery_location(uuid) from public,anon;
grant execute on function public.assign_delivery_rider(uuid,uuid),public.update_delivery_status(uuid,text,text),public.share_delivery_location(uuid,double precision,double precision,double precision,timestamptz),public.stop_delivery_location(uuid) to authenticated;

-- Browser uses short, visible polling, not public realtime channels.
commit;
