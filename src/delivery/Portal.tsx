import { PaymentBadge } from "./Payments";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Flame,
  LayoutDashboard,
  LogOut,
  MapPin,
  Navigation,
  PackageCheck,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import {
  assignRider,
  deliveryClient,
  getStaff,
  getWorkspace,
  setOrderStatus,
  shortId,
  statusLabel,
  steps,
  ugx,
  type DeliveryEvent,
  type DeliveryOrder,
  type OrderStatus,
  type Staff,
} from "./api";
import { Progress, RiderMap } from "./Tracking";
import { useRiderGps } from "./useRiderGps";
import "./delivery.css";

type WorkspaceData = Awaited<ReturnType<typeof getWorkspace>>;
const initial: WorkspaceData = {
  orders: [],
  staff: [],
  locations: [],
  events: [],
};
const exampleStaff: Staff[] = [
  {
    user_id: "example-rider",
    display_name: "Daniel (example rider)",
    role: "rider",
    active: true,
  },
];
function examples(): WorkspaceData {
  const now = new Date().toISOString();
  const base: DeliveryOrder = {
    id: "example-order-1",
    customer_name: "Sample customer",
    phone: "Example only",
    address: "Example address, Kololo",
    area: "Kololo",
    notes: "Example kitchen note: sauce on the side.",
    items: [
      { id: 2, name: "Crispy Chicken & Chips", price: 22000, quantity: 2 },
    ],
    subtotal: 44000,
    delivery_fee: 5000,
    total: 49000,
    status: "preparing",
    rider_id: null,
    created_at: now,
    updated_at: now,
  };
  return {
    orders: [
      base,
      {
        ...base,
        id: "example-order-2",
        customer_name: "Another sample customer",
        area: "Ntinda",
        status: "received",
      },
      {
        ...base,
        id: "example-order-3",
        customer_name: "Sample delivery",
        status: "on_the_way",
        rider_id: "example-rider",
      },
    ],
    staff: exampleStaff,
    locations: [
      {
        order_id: "example-order-3",
        rider_id: "example-rider",
        latitude: 0.3336,
        longitude: 32.5988,
        accuracy: 18,
        captured_at: now,
        received_at: now,
        sharing: true,
      },
    ],
    events: [],
  };
}
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";

export function Portal({ mode }: { mode: "admin" | "rider" }) {
  const [actor, setActor] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const check = useCallback(async () => {
    try {
      const { data } = await deliveryClient.auth.getSession();
      setSession(!!data.session);
      setActor(data.session ? await getStaff() : null);
      setError("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void check();
    const {
      data: { subscription },
    } = deliveryClient.auth.onAuthStateChange(() => {
      setTimeout(() => void check(), 0);
    });
    return () => subscription.unsubscribe();
  }, [check]);
  if (preview)
    return (
      <Workspace
        actor={{
          user_id: "example-admin",
          display_name: "Preview administrator",
          role: "admin",
          active: true,
        }}
        preview
        onExit={() => setPreview(false)}
      />
    );
  if (loading)
    return (
      <div className="portal-loading">
        <RefreshCw className="spinning" />
        Connecting to your kitchen…
      </div>
    );
  if (actor && (actor.role === "admin" || mode === "rider"))
    return (
      <Workspace
        actor={actor}
        onExit={() => {
          void deliveryClient.auth.signOut();
        }}
      />
    );
  return (
    <div className="staff-login-page">
      <a href="#" className="staff-back">
        <ArrowLeft size={16} />
        Back to the restaurant
      </a>
      <div className="staff-login-art">
        <img
          src="./brand/charbroiled-juicy-chicken.svg"
          alt="Charbroiled Juicy Chicken"
        />
        <div className="eyebrow">BEHIND EVERY GREAT DELIVERY</div>
        <h1>
          A little teamwork.
          <br />A whole lot of flavour.
        </h1>
        <p>
          One kitchen. One connected team.
          <br />
          From the first order to the final doorstep.
        </p>
        <div className="login-promises">
          <span>
            <ShieldCheck size={17} />
            Role-protected workspace
          </span>
          <span>
            <Bike size={17} />
            Order-specific rider GPS
          </span>
          <span>
            <Clock3 size={17} />A clear view of every stage
          </span>
        </div>
      </div>
      <div className="staff-login-panel">
        <div className="eyebrow">
          {mode === "admin" ? "RESTAURANT OPERATIONS" : "RIDER WORKSPACE"}
        </div>
        <h2>{session ? "Staff access required" : "Welcome back, team."}</h2>
        <p>
          {session
            ? "Your account is signed in, but it needs an active staff role for this workspace."
            : "Sign in to keep the good food moving."}
        </p>
        {error && (
          <p className="dispatch-error" role="alert">
            {error}
          </p>
        )}
        {session ? (
          <>
            <div className="dispatch-notice">
              <ShieldCheck size={23} />
              <div>
                <strong>Access is granted by the restaurant owner.</strong>
                <p>
                  Creating an account does not grant admin or rider access. Ask
                  the owner to activate your verified email.
                </p>
              </div>
            </div>
            <button
              className="primary full-width"
              onClick={() => {
                setLoading(true);
                void check();
              }}
            >
              Check my access <RefreshCw size={17} />
            </button>
            <button
              className="dispatch-outline full-width"
              onClick={() => void deliveryClient.auth.signOut()}
            >
              Sign out
            </button>
          </>
        ) : (
          <StaffAuth onSuccess={check} />
        )}
        <div className="login-preview">
          <span>Want a look around first?</span>
          <button onClick={() => setPreview(true)}>
            Explore sample dashboard <ArrowRight size={15} />
          </button>
          <small>Sample data only. No access to real orders or GPS.</small>
        </div>
        <details className="staff-setup">
          <summary>
            First-time owner setup <ChevronRight size={14} />
          </summary>
          <p>
            Create and verify your staff account using the form above. Then
            activate your email as an admin in the restaurant’s Supabase
            project. The repository includes exact instructions in{" "}
            <code>docs/DELIVERY_SETUP.md</code>. No default admin password or
            public admin registration is enabled.
          </p>
        </details>
      </div>
    </div>
  );
}

function StaffAuth({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <form
      className="staff-auth-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setNotice("");
        try {
          if (mode === "signup") {
            const route =
              window.location.hash === "#rider" ? "#rider" : "#admin";
            sessionStorage.setItem("cjc-after-auth", route);
            const { data, error } = await deliveryClient.auth.signUp({
              email: email.trim(),
              password,
              options: {
                emailRedirectTo:
                  window.location.origin + window.location.pathname + route,
              },
            });
            if (error) throw error;
            if (data.session) await onSuccess();
            else {
              setMode("login");
              setPassword("");
              setNotice(
                "Check your email and follow the confirmation link. Then return here to sign in. If email delivery is unavailable, ask the project owner to create your account in Supabase Auth.",
              );
            }
          } else {
            const { error } = await deliveryClient.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
            if (error) throw error;
            await onSuccess();
          }
        } catch (e) {
          setError(errorText(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        Work email
        <input
          required
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@restaurant.com"
          disabled={busy}
        />
      </label>
      <label className="field">
        Password
        <input
          required
          type="password"
          minLength={mode === "signup" ? 10 : 1}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={
            mode === "signup" ? "At least 10 characters" : "Enter your password"
          }
        />
      </label>
      {notice && (
        <p className="dispatch-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="dispatch-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="primary full-width" disabled={busy}>
        {busy
          ? "Please wait…"
          : mode === "signup"
            ? "Create staff account"
            : "Sign in to workspace"}
        <ArrowRight size={17} />
      </button>
      <button
        type="button"
        className="auth-switch"
        disabled={busy}
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError("");
          setNotice("");
        }}
      >
        {mode === "login"
          ? "New team member? Create an account"
          : "Already registered? Sign in"}
      </button>
      {mode === "signup" && (
        <p className="staff-auth-note">
          Your email must be verified. The owner must then grant staff access.
          Signing up alone never provides access to orders.
        </p>
      )}
    </form>
  );
}

function Workspace({
  actor,
  preview = false,
  onExit,
}: {
  actor: Staff;
  preview?: boolean;
  onExit: () => void;
}) {
  const [data, setData] = useState<WorkspaceData>(() =>
    preview ? examples() : initial,
  );
  const [tab, setTab] = useState<"orders" | "map" | "team">("orders");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(!preview);
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (preview) return;
    const next = await getWorkspace();
    setData(next);
    setLastSync(
      new Date().toLocaleTimeString("en-UG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Africa/Kampala",
      }),
    );
    setError("");
  }, [preview]);
  useEffect(() => {
    let active = true;
    let inFlight = false;
    const load = async () => {
      if (document.hidden || inFlight || preview) return;
      inFlight = true;
      try {
        const next = await getWorkspace();
        if (active) {
          setData(next);
          setError("");
          setLastSync(
            new Date().toLocaleTimeString("en-UG", {
              timeZone: "Africa/Kampala",
            }),
          );
        }
      } catch (e) {
        if (active) setError(errorText(e));
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [preview]);
  async function action(task: () => Promise<void>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      await refresh();
      setNotice(message);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const changeStatus = async (order: DeliveryOrder, status: OrderStatus) =>
    action(
      async () => {
        if (preview)
          setData((prev) => ({
            ...prev,
            orders: prev.orders.map((o) =>
              o.id === order.id ? { ...o, status } : o,
            ),
            events: [
              ...prev.events,
              {
                order_id: order.id,
                status,
                created_at: new Date().toISOString(),
              },
            ],
          }));
        else await setOrderStatus(order, status);
      },
      preview
        ? "Sample progress updated. No real order changed."
        : "Order progress saved. Customer tracking will refresh shortly.",
    );
  const changeRider = async (id: string, riderId: string | null) =>
    action(
      async () => {
        if (preview)
          setData((prev) => ({
            ...prev,
            orders: prev.orders.map((o) =>
              o.id === id ? { ...o, rider_id: riderId } : o,
            ),
          }));
        else await assignRider(id, riderId);
      },
      preview ? "Sample rider assignment updated." : "Rider assigned.",
    );
  const active = data.orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  );
  const filtered = data.orders.filter(
    (o) =>
      (filter === "all" || filter === "active"
        ? filter === "all" || !["delivered", "cancelled"].includes(o.status)
        : o.status === filter) &&
      `${o.id} ${o.customer_name} ${o.area} ${o.phone}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const order = filtered.find((o) => o.id === selected) || filtered[0];
  const events = data.events.filter((e) => e.order_id === order?.id);
  const rider = data.staff.find((s) => s.user_id === order?.rider_id);
  const location =
    data.locations.find(
      (l) => l.order_id === order?.id && l.rider_id === order?.rider_id,
    ) || null;
  return (
    <div className="dispatch-shell">
      <aside className="dispatch-sidebar">
        <a href="#" className="dispatch-brand">
          <img src="./brand/charbroiled-juicy-chicken.svg" alt="" />
          <span>
            Charbroiled<strong>Juicy Chicken</strong>
            <small>THE OPERATIONS KITCHEN</small>
          </span>
        </a>
        <div className="sidebar-workspace">
          <span className="workspace-dot" />
          {actor.role === "admin" ? "Admin workspace" : "Rider workspace"}
          <small>Kampala, Uganda</small>
        </div>
        <p className="sidebar-label">WORKSPACE</p>
        <nav aria-label="Workspace navigation">
          <button
            className={tab === "orders" ? "selected" : ""}
            onClick={() => setTab("orders")}
          >
            <LayoutDashboard size={18} />
            {actor.role === "admin" ? "Order overview" : "My deliveries"}
            <b>{active.length}</b>
          </button>
          <button
            className={tab === "map" ? "selected" : ""}
            onClick={() => setTab("map")}
          >
            <Navigation size={18} />
            Dispatch & GPS
          </button>
          {actor.role === "admin" && (
            <button
              className={tab === "team" ? "selected" : ""}
              onClick={() => setTab("team")}
            >
              <Users size={18} />
              Team & access
            </button>
          )}
        </nav>
        <div className="sidebar-kitchen">
          <Flame size={24} />
          <strong>Good food. Great teamwork.</strong>
          <p>Every update brings a customer one step closer to a good meal.</p>
        </div>
        <a className="back-store" href="#">
          <ArrowLeft size={15} />
          Back to storefront
        </a>
        <div className="sidebar-profile">
          <span>{actor.display_name.charAt(0).toUpperCase()}</span>
          <div>
            <strong>{actor.display_name}</strong>
            <small>
              {preview
                ? "Sample workspace"
                : actor.role === "admin"
                  ? "Restaurant administrator"
                  : "Delivery partner"}
            </small>
          </div>
          <button
            aria-label={preview ? "Exit preview" : "Sign out"}
            onClick={onExit}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="dispatch-main">
        <header className="dispatch-header">
          <div>
            <span>WORKSPACE</span>
            <ChevronRight size={12} />
            <strong>
              {tab === "orders"
                ? "Orders"
                : tab === "map"
                  ? "Dispatch & GPS"
                  : "Team & access"}
            </strong>
          </div>
          <div>
            <span className="connection-indicator">
              <i />
              {preview
                ? "Sample preview"
                : error
                  ? "Sync interrupted"
                  : "Cloud connected"}
            </span>
            <button
              aria-label="Refresh orders"
              disabled={busy || loading || preview}
              onClick={() => void action(refresh, "Orders refreshed.")}
            >
              <RefreshCw size={16} />
            </button>
            <a href="#">
              View restaurant <ArrowRight size={14} />
            </a>
          </div>
        </header>
        <div className="dispatch-content">
          {preview && (
            <div className="preview-banner">
              <AlertCircle size={18} />
              <div>
                <strong>Sample workspace — not live operations</strong>
                <span>
                  These orders, people and GPS positions are examples. Changes
                  stay in this preview.
                </span>
              </div>
              <button onClick={onExit}>
                Sign in for real orders <ArrowRight size={15} />
              </button>
            </div>
          )}
          <div className="workspace-title">
            <div>
              <div className="eyebrow">A GOOD DAY STARTS IN THE KITCHEN</div>
              <h1>
                {tab === "team"
                  ? "Your people. Your permissions."
                  : actor.role === "rider"
                    ? "Let’s keep Kampala moving."
                    : tab === "map"
                      ? "Every delivery, in view."
                      : "Fresh orders. Happy customers."}
              </h1>
              <p>
                {tab === "team"
                  ? "Protected access for the people behind every delivery."
                  : actor.role === "rider"
                    ? "Your assigned deliveries and consent-based GPS sharing."
                    : "A little less juggling. A clear view of what’s cooking."}
              </p>
            </div>
            <span className="workspace-date">
              {new Date().toLocaleDateString("en-UG", {
                weekday: "short",
                day: "numeric",
                month: "long",
                timeZone: "Africa/Kampala",
              })}
              <small>
                <Clock3 size={12} />
                {lastSync
                  ? `Synced ${lastSync} EAT`
                  : preview
                    ? "Illustrative data"
                    : "Waiting for first sync"}
              </small>
            </span>
          </div>
          {error && (
            <div role="alert" className="dispatch-error">
              <AlertCircle size={17} />
              <span>
                {error} Previously loaded information may be outdated.
              </span>
              <button onClick={() => void action(refresh, "Refreshed")}>
                Retry
              </button>
            </div>
          )}
          {notice && (
            <div className="dispatch-success" role="status">
              <CheckCircle2 size={17} />
              {notice}
              <button
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {tab === "team" ? (
            <TeamSetup staff={data.staff} preview={preview} />
          ) : (
            <>
              <div className="dispatch-stats">
                <Stat
                  icon={<ShoppingBag size={20} />}
                  label="Active orders"
                  value={active.length}
                  note="From kitchen to doorstep"
                />
                <Stat
                  icon={<Flame size={20} />}
                  label="In the kitchen"
                  value={
                    active.filter((o) =>
                      ["confirmed", "preparing"].includes(o.status),
                    ).length
                  }
                  note="Freshly made, on the way"
                />
                <Stat
                  icon={<Bike size={20} />}
                  label="Out for delivery"
                  value={active.filter((o) => o.status === "on_the_way").length}
                  note="Riders on the road"
                />
                <Stat
                  icon={<PackageCheck size={20} />}
                  label="Completed today"
                  value={
                    data.orders.filter(
                      (o) =>
                        o.status === "delivered" &&
                        new Date(o.updated_at).toLocaleDateString("en-UG", {
                          timeZone: "Africa/Kampala",
                        }) ===
                          new Date().toLocaleDateString("en-UG", {
                            timeZone: "Africa/Kampala",
                          }),
                    ).length
                  }
                  note="Delivered with a smile"
                />
              </div>
              {tab === "map" ? (
                <div className="dispatch-map-grid">
                  {active
                    .filter((o) => o.rider_id)
                    .map((o) => (
                      <div key={o.id}>
                        <a
                          className="map-order-label"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setTab("orders");
                            setSelected(o.id);
                            setFilter("all");
                          }}
                        >
                          <strong>
                            #{shortId(o.id)} · {o.area}
                          </strong>
                          <span>
                            {statusLabel[o.status]} <ArrowRight size={13} />
                          </span>
                        </a>
                        <RiderMap
                          location={
                            data.locations.find(
                              (l) =>
                                l.order_id === o.id &&
                                l.rider_id === o.rider_id,
                            ) || null
                          }
                          name={
                            data.staff.find((s) => s.user_id === o.rider_id)
                              ?.display_name
                          }
                          example={preview}
                        />
                      </div>
                    ))}
                  {!active.some((o) => o.rider_id) && (
                    <div className="dispatch-empty">
                      <Navigation size={36} />
                      <h3>No assigned deliveries yet</h3>
                      <p>
                        Assign a rider to an order to see it here. GPS starts
                        only when the rider goes on the way and opts in.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="dispatch-orders-layout">
                  <section className="dispatch-order-list">
                    <div className="order-list-heading">
                      <h2>
                        {actor.role === "rider"
                          ? "Assigned to you"
                          : "Order inbox"}
                        <span>{filtered.length}</span>
                      </h2>
                      <span className="list-sync">
                        <Radio size={12} />
                        {preview ? "Preview" : "5s refresh"}
                      </span>
                    </div>
                    <div className="dispatch-list-tools">
                      <label className="dispatch-search">
                        <Search size={16} />
                        <input
                          aria-label="Search orders"
                          placeholder="Search order, name or area…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <select
                        aria-label="Filter orders"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="active">Active orders</option>
                        <option value="all">All orders</option>
                        {steps.map((s) => (
                          <option key={s} value={s}>
                            {statusLabel[s]}
                          </option>
                        ))}
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="dispatch-list-scroll">
                      {loading && !data.orders.length ? (
                        <div className="dispatch-empty">
                          <RefreshCw className="spinning" />
                          <p>Loading orders from the kitchen…</p>
                        </div>
                      ) : (
                        filtered.map((o) => (
                          <button
                            key={o.id}
                            className={`dispatch-order-row ${o.id === order?.id ? "selected" : ""}`}
                            onClick={() => setSelected(o.id)}
                          >
                            <div className="order-row-top">
                              <strong>#{shortId(o.id)}</strong>
                              <time>
                                {new Date(o.created_at).toLocaleTimeString(
                                  "en-UG",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "Africa/Kampala",
                                  },
                                )}
                              </time>
                            </div>
                            <h3>{o.customer_name}</h3>
                            <p>
                              <MapPin size={12} />
                              {o.area}
                              <span>
                                {o.items.reduce((n, i) => n + i.quantity, 0)}{" "}
                                items
                              </span>
                            </p>
                            <div className="order-row-bottom">
                              <span className={`status-pill ${o.status}`}>
                                {statusLabel[o.status]}
                              </span>
                              <strong>{ugx(o.total)}</strong>
                            </div>
                            <span className="order-row-payment">
                              <PaymentBadge {...o} />
                            </span>
                          </button>
                        ))
                      )}
                      {!loading && !filtered.length && (
                        <div className="dispatch-empty">
                          <ClipboardList size={33} />
                          <h3>
                            {data.orders.length
                              ? "No matching orders"
                              : "Your inbox is ready"}
                          </h3>
                          <p>
                            {data.orders.length
                              ? "Try another search or status."
                              : actor.role === "rider"
                                ? "The admin will assign your deliveries here."
                                : "New checkout orders will appear here. Existing device-only demo orders are not uploaded."}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="list-footnote">
                      {preview
                        ? "Example orders — not actual customers"
                        : "Latest 200 orders · times shown in EAT"}
                    </p>
                  </section>
                  {order ? (
                    <section className="dispatch-order-detail" key={order.id}>
                      <div className="detail-heading">
                        <div>
                          <span>ORDER DETAILS</span>
                          <h2>
                            #{shortId(order.id)}{" "}
                            <span className={`status-pill ${order.status}`}>
                              {statusLabel[order.status]}
                            </span>
                          </h2>
                        </div>
                        <span>
                          {new Date(order.created_at).toLocaleDateString(
                            "en-UG",
                            {
                              day: "numeric",
                              month: "short",
                              timeZone: "Africa/Kampala",
                            },
                          )}
                        </span>
                      </div>
                      <div className="detail-body">
                        <Progress status={order.status} events={events} />
                        <div
                          className={`admin-payment-info ${order.payment_review_required ? "review" : ""}`}
                        >
                          <PaymentBadge {...order} />
                          <p>
                            {order.payment_status === "paid"
                              ? "Payment verified by DGateway. Do not collect cash from this customer."
                              : order.payment_method === "mobile_money"
                                ? "Do not prepare or dispatch until DGateway confirms payment. Customers can check their existing payment from private tracking. Never ask for a customer's PIN."
                                : "Collect cash on delivery. No online payment has been verified."}
                          </p>
                          {order.payment_review_required && (
                            <p>
                              Payment review required: check the gateway journal
                              for a late or duplicate settlement. Cancellation
                              does not automatically refund money.
                            </p>
                          )}
                        </div>
                        {actor.role === "admin" && (
                          <StatusEditor
                            key={`${order.id}-${order.status}`}
                            order={order}
                            busy={busy}
                            onSave={changeStatus}
                          />
                        )}
                        <div className="customer-detail">
                          <span className="customer-monogram">
                            {order.customer_name.charAt(0)}
                          </span>
                          <div>
                            <strong>{order.customer_name}</strong>
                            {preview ? (
                              <span>{order.phone}</span>
                            ) : (
                              <a href={`tel:${order.phone.replace(/\s/g, "")}`}>
                                {order.phone}
                              </a>
                            )}
                            <p>
                              <MapPin size={13} />
                              {order.address} · {order.area}
                            </p>
                          </div>
                        </div>
                        <h3 className="detail-subheading">
                          The good stuff{" "}
                          <span>
                            {order.items.reduce((n, i) => n + i.quantity, 0)}{" "}
                            items
                          </span>
                        </h3>
                        <div className="detail-items">
                          {order.items.map((i, index) => (
                            <div key={`${i.id}-${index}`}>
                              <span className="item-quantity">
                                {i.quantity}×
                              </span>
                              <span>
                                {i.name}
                                <small>{ugx(i.price)} each</small>
                              </span>
                              <strong>{ugx(i.price * i.quantity)}</strong>
                            </div>
                          ))}
                        </div>
                        {order.notes && (
                          <div className="kitchen-note">
                            <Flame size={16} />
                            <p>
                              <strong>Kitchen notes</strong>
                              {order.notes}
                            </p>
                          </div>
                        )}
                        <div className="detail-totals">
                          <div>
                            <span>Subtotal</span>
                            <strong>{ugx(order.subtotal)}</strong>
                          </div>
                          <div>
                            <span>Delivery · {order.area}</span>
                            <strong>{ugx(order.delivery_fee)}</strong>
                          </div>
                          <div>
                            <strong>
                              Total ·{" "}
                              {order.payment_method === "mobile_money"
                                ? "Mobile Money"
                                : "cash on delivery"}
                            </strong>
                            <strong>{ugx(order.total)}</strong>
                          </div>
                        </div>
                        {actor.role === "admin" && (
                          <RiderAssignment
                            order={order}
                            staff={data.staff}
                            busy={busy}
                            onAssign={changeRider}
                          />
                        )}
                        <RiderMap
                          location={
                            order.status === "on_the_way" ? location : null
                          }
                          name={rider?.display_name}
                          example={preview}
                        />
                        {actor.role === "rider" && !preview && (
                          <RiderActions
                            order={order}
                            busy={busy}
                            onStatus={changeStatus}
                          />
                        )}
                        <details className="order-timeline">
                          <summary>
                            <Clock3 size={14} />
                            Order history
                          </summary>
                          {events.length ? (
                            events.map((e: DeliveryEvent, i: number) => (
                              <p key={i}>
                                <span>{statusLabel[e.status]}</span>
                                <time>
                                  {new Date(e.created_at).toLocaleTimeString(
                                    "en-UG",
                                    { timeZone: "Africa/Kampala" },
                                  )}{" "}
                                  EAT
                                </time>
                              </p>
                            ))
                          ) : (
                            <p>No events loaded yet.</p>
                          )}
                        </details>
                      </div>
                    </section>
                  ) : (
                    <div className="no-order-selected">
                      <ShoppingBag size={45} />
                      <h3>All the details, in one place.</h3>
                      <p>
                        Select an order to see its food, progress and rider
                        location.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <div className="dispatch-bottom-note">
            <ShieldCheck size={13} />
            <span>
              {preview
                ? "Preview data only. Sign in to access restaurant operations."
                : "Access protected by Supabase Auth and database role policies. GPS is shared only for the assigned order."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="dispatch-stat">
      <span className="stat-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value.toString().padStart(2, "0")}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}
function StatusEditor({
  order,
  busy,
  onSave,
}: {
  order: DeliveryOrder;
  busy: boolean;
  onSave: (o: DeliveryOrder, s: OrderStatus) => Promise<void>;
}) {
  const index = steps.indexOf(order.status as (typeof steps)[number]);
  const [value, setValue] = useState(Math.max(0, index));
  if (["delivered", "cancelled"].includes(order.status)) return null;
  const paymentBlocked =
    order.payment_method === "mobile_money" && order.payment_status !== "paid";
  const valid =
    !paymentBlocked &&
    value === index + 1 &&
    (steps[value] !== "on_the_way" || !!order.rider_id);
  return (
    <div className="status-editor">
      <div>
        <strong>Move this order forward</strong>
        <span>{statusLabel[steps[value]]}</span>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        step={1}
        value={value}
        aria-label="Update order progress"
        aria-valuetext={statusLabel[steps[value]]}
        onChange={(e) => setValue(Number(e.target.value))}
        disabled={busy}
      />
      <div className="slider-labels">
        <span>Received</span>
        <span>Delivered</span>
      </div>
      <p>
        {paymentBlocked
          ? "Mobile Money is not verified. Wait for payment before progressing this order."
          : value > index + 1
            ? "Advance one stage at a time."
            : value < index
              ? "Progress cannot move backwards."
              : steps[value] === "on_the_way" && !order.rider_id
                ? "Assign a rider before dispatch."
                : "Slide to the next stage, then save to notify tracking."}
      </p>
      <div className="status-actions">
        <button
          className="primary"
          disabled={busy || !valid}
          onClick={() => void onSave(order, steps[value])}
        >
          {busy ? "Saving…" : "Save progress"}
          <Check size={15} />
        </button>
        <button
          disabled={busy}
          className="cancel-order"
          onClick={() => {
            if (
              window.confirm(
                "Cancel this order? This cannot be undone. Any payment already made is NOT automatically refunded. Reconcile pending or completed Mobile Money separately.",
              )
            )
              void onSave(order, "cancelled");
          }}
        >
          Cancel order
        </button>
      </div>
    </div>
  );
}
function RiderAssignment({
  order,
  staff,
  busy,
  onAssign,
}: {
  order: DeliveryOrder;
  staff: Staff[];
  busy: boolean;
  onAssign: (id: string, riderId: string | null) => Promise<void>;
}) {
  const [rider, setRider] = useState(order.rider_id || "");
  useEffect(() => setRider(order.rider_id || ""), [order.rider_id]);
  return (
    <div className="rider-assignment">
      <div>
        <Bike size={18} />
        <strong>Delivery partner</strong>
      </div>
      <label className="field">
        Assigned rider
        <select
          aria-label="Assigned rider"
          value={rider}
          disabled={
            busy ||
            ["on_the_way", "delivered", "cancelled"].includes(order.status)
          }
          onChange={(e) => setRider(e.target.value)}
        >
          <option value="">Not assigned</option>
          {staff
            .filter((s) => s.role === "rider")
            .map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.display_name}
              </option>
            ))}
        </select>
      </label>
      <button
        className="dispatch-outline"
        disabled={
          busy ||
          rider === (order.rider_id || "") ||
          ["on_the_way", "delivered", "cancelled"].includes(order.status)
        }
        onClick={() => void onAssign(order.id, rider || null)}
      >
        Save assignment <Check size={14} />
      </button>
      {!staff.some((s) => s.role === "rider") && (
        <p>Add an authorised rider in Team & access first.</p>
      )}
    </div>
  );
}
function RiderActions({
  order,
  busy,
  onStatus,
}: {
  order: DeliveryOrder;
  busy: boolean;
  onStatus: (o: DeliveryOrder, s: OrderStatus) => Promise<void>;
}) {
  const [consent, setConsent] = useState(false);
  const gps = useRiderGps(order.id, order.status === "on_the_way");
  return (
    <div className="rider-controls">
      <h3>
        <Navigation size={18} />
        Your delivery controls
      </h3>
      {order.status === "ready" && (
        <button
          className="primary full-width"
          disabled={busy}
          onClick={() => void onStatus(order, "on_the_way")}
        >
          I’ve picked up the order <Bike size={17} />
        </button>
      )}
      {order.status === "on_the_way" ? (
        <>
          <label className="gps-consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={gps.sharing}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I agree to share this phone’s GPS with the restaurant and the
              customer for this delivery. Sharing stops when I stop it, leave
              this page or complete delivery.
            </span>
          </label>
          <p className="gps-guidance">
            Keep this page visible and location services on. Mobile browsers may
            suspend GPS in the background. No background tracking is promised.
          </p>
          <button
            className={
              gps.sharing ? "dispatch-outline full-width" : "primary full-width"
            }
            disabled={!gps.sharing && !consent}
            onClick={
              gps.sharing
                ? () => {
                    gps.stop();
                  }
                : gps.start
            }
          >
            {gps.sharing ? "Stop sharing GPS" : "Start sharing GPS"}
            <Navigation size={16} />
          </button>
          <p className="gps-message" role="status">
            {gps.message}
          </p>
          {gps.error && (
            <p className="dispatch-error" role="alert">
              {gps.error}
            </p>
          )}
          <button
            className="dispatch-delivered"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm("Confirm you handed this order to the customer?")
              )
                void onStatus(order, "delivered");
            }}
          >
            Mark as delivered <PackageCheck size={17} />
          </button>
        </>
      ) : (
        order.status !== "ready" && (
          <p>
            The kitchen will update this order. Your pickup controls appear when
            it’s ready.
          </p>
        )
      )}
    </div>
  );
}
function TeamSetup({ staff, preview }: { staff: Staff[]; preview: boolean }) {
  return (
    <div className="team-layout">
      <section className="team-card">
        <h2>
          <Users size={20} />
          Your active team
        </h2>
        <p>
          Only activated staff can open this workspace. Riders see only their
          assigned, active orders.
        </p>
        {staff.map((s) => (
          <div className="team-member" key={s.user_id}>
            <span>{s.display_name.charAt(0)}</span>
            <div>
              <strong>{s.display_name}</strong>
              <small>{s.user_id}</small>
            </div>
            <span
              className={`status-pill ${s.role === "admin" ? "confirmed" : "on_the_way"}`}
            >
              {s.role}
            </span>
          </div>
        ))}
        {!staff.length && <p>No staff found.</p>}
      </section>
      <section className="team-card">
        <h2>
          <ShieldCheck size={20} />
          Staff onboarding
        </h2>
        <ol>
          <li>
            Ask each team member to open{" "}
            <a href="#rider">the rider sign-in page</a> and create a staff
            account.
          </li>
          <li>
            They must verify their email using the confirmation link sent by
            Supabase.
          </li>
          <li>
            The project owner activates that verified account as{" "}
            <strong>admin</strong> or <strong>rider</strong> in the database.
            Follow <code>docs/DELIVERY_SETUP.md</code>.
          </li>
          <li>
            The rider signs in on their phone. Assign an order, mark it ready,
            then let the rider start the delivery and GPS.
          </li>
        </ol>
        <div className="dispatch-notice">
          <ShieldCheck size={21} />
          <p>
            {preview
              ? "These are example people, not real staff accounts."
              : "Role grants require project-owner access. A public signup can never make itself an administrator."}
          </p>
        </div>
      </section>
    </div>
  );
}
