import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Bike,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  locationHealth,
  shortId,
  statusLabel,
  steps,
  trackOrder,
  ugx,
  type DeliveryEvent,
  type OrderStatus,
  type RiderLocation,
  type Tracking,
} from "./api";

export function Progress({
  status,
  events = [],
}: {
  status: OrderStatus;
  events?: DeliveryEvent[];
}) {
  const index = steps.indexOf(status as (typeof steps)[number]);
  if (status === "cancelled")
    return (
      <div className="dispatch-alert">
        This order was cancelled. Contact the restaurant if you need help.
      </div>
    );
  return (
    <div
      className="order-progress"
      aria-label={`Order progress: ${statusLabel[status]}`}
    >
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Delivery progress"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={index}
        aria-valuetext={statusLabel[status]}
      >
        <span style={{ width: `${(index / 5) * 100}%` }} />
      </div>
      <ol>
        {steps.map((step, i) => {
          const event = events.find((e) => e.status === step);
          return (
            <li
              key={step}
              className={i < index ? "done" : i === index ? "current" : ""}
            >
              <span className="progress-dot">
                {i < index ? (
                  <Check size={12} />
                ) : i === index && step === "on_the_way" ? (
                  <Bike size={14} />
                ) : (
                  i + 1
                )}
              </span>
              <strong>{statusLabel[step]}</strong>
              {event && (
                <time>
                  {new Date(event.created_at).toLocaleTimeString("en-UG", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Africa/Kampala",
                  })}
                </time>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function RiderMap({
  location,
  name,
  example = false,
}: {
  location: RiderLocation | null;
  name?: string | null;
  example?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const circle = useRef<L.Circle | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!ref.current || !location || map.current) return;
    const instance = L.map(ref.current, { scrollWheelZoom: false }).setView(
      [location.latitude, location.longitude],
      15,
    );
    map.current = instance;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    })
      .on("tileerror", () => setTilesFailed(true))
      .addTo(instance);
    marker.current = L.marker([location.latitude, location.longitude], {
      icon: L.divIcon({
        className: "rider-marker",
        html: '<svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="5" cy="17" r="3.5"/><circle cx="19" cy="17" r="3.5"/><circle cx="15" cy="4" r="1"/><path d="M12 17v-4l-3-3 4-3 2 3h3"/></svg>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      }),
    }).addTo(instance);
    circle.current = L.circle([location.latitude, location.longitude], {
      radius: location.accuracy,
      color: "#d66a23",
      weight: 1,
      fillOpacity: 0.12,
    }).addTo(instance);
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(ref.current);
    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
      marker.current = null;
      circle.current = null;
    };
    // Re-create only when changing between an empty map and a GPS map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!location]);
  useEffect(() => {
    if (location && map.current) {
      const point: L.LatLngExpression = [location.latitude, location.longitude];
      marker.current?.setLatLng(point);
      circle.current?.setLatLng(point).setRadius(location.accuracy);
      map.current.panTo(point, { animate: false });
    }
  }, [location]);
  const health = locationHealth(location, now);
  return (
    <section className="rider-map-card">
      <div className="map-heading">
        <span className="map-heading-icon">
          <Bike size={20} />
        </span>
        <div>
          <h3>{name || "Delivery rider"}</h3>
          <span className={`gps-state ${health.state}`}>
            <i />
            {example ? "Example position — not live" : health.label}
          </span>
        </div>
        {location && (
          <span className="accuracy">±{Math.round(location.accuracy)} m</span>
        )}
      </div>
      {location ? (
        <>
          <div
            ref={ref}
            className="rider-map"
            aria-label="Map of the rider’s last GPS position"
          />
          {tilesFailed && (
            <div className="map-fallback">
              Map tiles couldn’t load. The GPS coordinates below are still
              available.
            </div>
          )}
          <div className="gps-coordinates">
            <MapPin size={14} />
            <span>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Open map <ExternalLink size={12} />
            </a>
          </div>
          <p className="gps-time">
            <Clock3 size={12} />
            {example
              ? "Illustration only"
              : `Last GPS fix: ${health.seconds ?? "—"}s ago`}{" "}
            ·{" "}
            {new Date(location.captured_at).toLocaleTimeString("en-UG", {
              timeZone: "Africa/Kampala",
            })}{" "}
            EAT
          </p>
        </>
      ) : (
        <div className="map-empty">
          <div className="map-empty-grid" />
          <span>
            <MapPin size={30} />
          </span>
          <strong>No rider position yet</strong>
          <p>
            A GPS pin appears when the assigned rider starts the delivery and
            shares their location.
          </p>
        </div>
      )}
      <div className="map-privacy">
        <ShieldCheck size={13} />
        Order-specific GPS. Updates while the rider’s page is open.
      </div>
    </section>
  );
}

export function TrackingCard({ id, token }: { id: string; token: string }) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  useEffect(() => {
    let active = true;
    let inFlight = false;
    async function load() {
      if (document.hidden || inFlight) return;
      inFlight = true;
      if (active) setBusy(true);
      try {
        const next = await trackOrder(id, token);
        if (active) {
          setTracking(next);
          setError("");
          setLastSync(
            new Date().toLocaleTimeString("en-UG", {
              timeZone: "Africa/Kampala",
            }),
          );
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not refresh tracking.",
          );
      } finally {
        inFlight = false;
        if (active) setBusy(false);
      }
    }
    void load();
    const t = setInterval(load, 7000);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, [id, token]);
  return (
    <article className="tracking-card">
      <div className="tracking-card-header">
        <div>
          <small>YOUR DELIVERY</small>
          <h3>Order #{shortId(id)}</h3>
        </div>
        <span className={`status-pill ${tracking?.status || "received"}`}>
          {tracking ? statusLabel[tracking.status] : "Loading…"}
        </span>
      </div>
      {error && (
        <p className="dispatch-error" role="alert">
          {error}{" "}
          {tracking &&
            "Showing the last received information; it may be outdated."}
        </p>
      )}
      {tracking && (
        <>
          <p className="tracking-destination">
            <MapPin size={14} />
            {tracking.area}
            <strong>{ugx(tracking.total)}</strong>
          </p>
          <Progress status={tracking.status} events={tracking.events} />
          <ul className="tracking-items">
            {tracking.items.map((item, i) => (
              <li key={`${item.id}-${i}`}>
                <span>
                  {item.quantity} × {item.name}
                </span>
                <strong>{ugx(item.quantity * item.price)}</strong>
              </li>
            ))}
          </ul>
          {tracking.status !== "delivered" &&
            tracking.status !== "cancelled" && (
              <RiderMap
                location={tracking.location}
                name={tracking.rider_name}
              />
            )}
          <p className="sync-note">
            <RefreshCw size={12} className={busy ? "spinning" : ""} />
            {lastSync
              ? `Last synced ${lastSync} EAT · refreshes every 7 seconds`
              : "Connecting…"}
          </p>
        </>
      )}
      <details className="tracking-code">
        <summary>Private tracking details</summary>
        <p>
          Keep this code private. Anyone with the order ID and code can view
          this delivery’s progress and rider location.
        </p>
        <label>
          Order ID
          <input readOnly value={id} />
        </label>
        <label>
          Private tracking code
          <input readOnly value={token} />
        </label>
        <button
          className="dispatch-outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                `Order ID: ${id}\nPrivate tracking code: ${token}`,
              );
              setCopyMessage("Copied. Keep these details private.");
            } catch {
              setCopyMessage(
                "Copy unavailable. Select and copy the fields above.",
              );
            }
          }}
        >
          <Copy size={13} />
          Copy tracking details
        </button>
        {copyMessage && <p role="status">{copyMessage}</p>}
      </details>
    </article>
  );
}

export function CustomerTracking() {
  const [id, setId] = useState("");
  const [token, setToken] = useState("");
  const [submitted, setSubmitted] = useState<{
    id: string;
    token: string;
  } | null>(null);
  return (
    <div className="customer-tracking-page">
      <a href="#" className="text-button">
        ← Back to the menu
      </a>
      <div className="eyebrow">FROM OUR KITCHEN TO YOUR DOOR</div>
      <h1>Follow your flavour.</h1>
      <p>
        Enter the private details from your order confirmation. No account
        needed.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted({ id: id.trim(), token: token.trim() });
        }}
        className="tracking-lookup"
      >
        <label className="field">
          Order ID
          <input
            required
            value={id}
            onChange={(e) => setId(e.target.value)}
            pattern="[a-fA-F0-9-]{36}"
            placeholder="Your full order ID"
          />
        </label>
        <label className="field">
          Private tracking code
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            pattern="[a-f0-9]{64}"
            placeholder="Your 64-character private code"
            autoComplete="off"
          />
        </label>
        <button className="primary" type="submit">
          Track my order <Bike size={18} />
        </button>
      </form>
      {submitted && (
        <TrackingCard
          key={`${submitted.id}-${submitted.token}`}
          {...submitted}
        />
      )}
    </div>
  );
}
