import { createClient } from "@supabase/supabase-js";

// Publishable key only. Access is enforced by database policies and RPC role checks.
const url =
  import.meta.env.VITE_DELIVERY_SUPABASE_URL ||
  "https://nbzjrirqstfevobtxkuf.supabase.co";
const key =
  import.meta.env.VITE_DELIVERY_SUPABASE_KEY ||
  "sb_publishable_VvNOFHKZg7ReneP1lV6m_Q_duqAxm7h";
export const deliveryEnabled = import.meta.env.VITE_DELIVERY_MODE !== "demo";
export const deliveryClient = createClient(url, key, {
  auth: {
    storageKey: "cjc-staff-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
export const steps = [
  "received",
  "confirmed",
  "preparing",
  "ready",
  "on_the_way",
  "delivered",
] as const;
export type OrderStatus = (typeof steps)[number] | "cancelled";
export const statusLabel: Record<OrderStatus, string> = {
  received: "Received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for pickup",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export type LineItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};
export type Staff = {
  user_id: string;
  display_name: string;
  role: "admin" | "rider";
  active: boolean;
};
export type RiderLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  captured_at: string;
  received_at: string;
  sharing: boolean;
  order_id?: string;
  rider_id?: string;
};
export type DeliveryEvent = { status: OrderStatus; created_at: string };
export type DeliveryOrder = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  area: string;
  notes: string;
  items: LineItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  rider_id: string | null;
  created_at: string;
  updated_at: string;
};
export type Tracking = Pick<
  DeliveryOrder,
  "id" | "status" | "total" | "area" | "items" | "created_at" | "updated_at"
> & {
  location: RiderLocation | null;
  rider_name: string | null;
  events: DeliveryEvent[];
};
export type OrderReceipt = {
  id: string;
  token: string;
  total: number;
  date: string;
  items: number;
  area: string;
  cloud: true;
};
export type CheckoutInput = {
  name: string;
  phone: string;
  address: string;
  area: string;
  notes: string;
  items: { id: number; quantity: number }[];
};
export function newOrderKeys() {
  return {
    requestId: crypto.randomUUID(),
    token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
      x.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
export async function placeOrder(
  input: CheckoutInput,
  keys: ReturnType<typeof newOrderKeys>,
): Promise<OrderReceipt> {
  const { data, error } = await deliveryClient.rpc("place_delivery_order", {
    p_name: input.name,
    p_phone: input.phone,
    p_address: input.address,
    p_area: input.area,
    p_notes: input.notes,
    p_items: input.items,
    p_request_id: keys.requestId,
    p_tracking_token: keys.token,
  });
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    token: keys.token,
    total: data.total,
    date: data.created_at,
    items: (data.items as LineItem[]).reduce((n, i) => n + i.quantity, 0),
    area: data.area,
    cloud: true,
  };
}
export async function trackOrder(id: string, token: string): Promise<Tracking> {
  const { data, error } = await deliveryClient.rpc("track_delivery_order", {
    p_order_id: id,
    p_tracking_token: token,
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function getStaff(): Promise<Staff | null> {
  const {
    data: { user },
    error: authError,
  } = await deliveryClient.auth.getUser();
  if (authError || !user) return null;
  const { data, error } = await deliveryClient
    .from("delivery_staff")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
export async function getWorkspace() {
  const [orders, staff, locations, events] = await Promise.all([
    deliveryClient
      .from("delivery_orders")
      .select(
        "id,customer_name,phone,address,area,notes,items,subtotal,delivery_fee,total,status,rider_id,created_at,updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    deliveryClient.from("delivery_staff").select("*").eq("active", true),
    deliveryClient.from("delivery_locations").select("*"),
    deliveryClient
      .from("delivery_events")
      .select("order_id,status,created_at")
      .order("created_at", { ascending: true })
      .limit(2000),
  ]);
  for (const response of [orders, staff, locations, events])
    if (response.error) throw new Error(response.error.message);
  return {
    orders: orders.data as DeliveryOrder[],
    staff: staff.data as Staff[],
    locations: locations.data as RiderLocation[],
    events: events.data as (DeliveryEvent & { order_id: string })[],
  };
}
export async function setOrderStatus(
  order: Pick<DeliveryOrder, "id" | "status">,
  status: OrderStatus,
) {
  const { error } = await deliveryClient.rpc("update_delivery_status", {
    p_order_id: order.id,
    p_status: status,
    p_expected_status: order.status,
  });
  if (error) throw new Error(error.message);
}
export async function assignRider(id: string, riderId: string | null) {
  const { error } = await deliveryClient.rpc("assign_delivery_rider", {
    p_order_id: id,
    p_rider_id: riderId,
  });
  if (error) throw new Error(error.message);
}
export async function publishLocation(id: string, fix: GeolocationPosition) {
  const { error } = await deliveryClient.rpc("share_delivery_location", {
    p_order_id: id,
    p_lat: fix.coords.latitude,
    p_lng: fix.coords.longitude,
    p_accuracy: fix.coords.accuracy,
    p_captured_at: new Date(fix.timestamp).toISOString(),
  });
  if (error) throw new Error(error.message);
}
export async function stopLocation(id: string) {
  const { error } = await deliveryClient.rpc("stop_delivery_location", {
    p_order_id: id,
  });
  if (error) throw new Error(error.message);
}
export function locationHealth(
  location: RiderLocation | null,
  now = Date.now(),
) {
  if (!location)
    return { label: "Awaiting rider GPS", state: "waiting", seconds: null };
  const seconds = Math.max(
    0,
    Math.round((now - new Date(location.captured_at).getTime()) / 1000),
  );
  if (!location.sharing)
    return { label: "GPS sharing paused", state: "paused", seconds };
  if (!Number.isFinite(seconds) || seconds > 45)
    return { label: "Location is stale", state: "stale", seconds };
  if (location.accuracy > 100)
    return { label: "Low GPS accuracy", state: "approximate", seconds };
  return { label: "Recent GPS fix", state: "recent", seconds };
}
export const shortId = (id: string) =>
  id.startsWith("example") ? "EXAMPLE" : id.slice(0, 8).toUpperCase();
export const ugx = (n: number) => `UGX ${n.toLocaleString("en-UG")}`;
