-- Apply after delivery.sql. Serialises rider assignment and GPS/completion races.
begin;
create unique index delivery_one_active_order_per_rider on public.delivery_orders(rider_id) where rider_id is not null and status not in ('delivered','cancelled');
create or replace function public.share_delivery_location(p_order_id uuid,p_lat double precision,p_lng double precision,p_accuracy double precision,p_captured_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare v_order delivery_orders%rowtype;
begin
  if public.delivery_role() is distinct from 'rider' then raise exception 'Rider access required'; end if;
  select * into v_order from delivery_orders where id = p_order_id for update;
  if not found or v_order.rider_id is distinct from auth.uid() or v_order.status <> 'on_the_way' then raise exception 'Only the assigned rider can share GPS during delivery'; end if;
  if p_lat is null or p_lng is null or p_accuracy is null or p_captured_at is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 10000 or p_captured_at < now() - interval '2 minutes' or p_captured_at > now() + interval '30 seconds' then raise exception 'Invalid or outdated GPS fix'; end if;
  insert into delivery_locations(order_id,rider_id,latitude,longitude,accuracy,captured_at,sharing)
  values(p_order_id,auth.uid(),p_lat,p_lng,p_accuracy,p_captured_at,true)
  on conflict(order_id) do update set rider_id = auth.uid(),latitude = excluded.latitude,longitude = excluded.longitude,accuracy = excluded.accuracy,captured_at = excluded.captured_at,received_at = now(),sharing = true
  where excluded.captured_at >= delivery_locations.captured_at;
end $$;
commit;
