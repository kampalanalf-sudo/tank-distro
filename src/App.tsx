import { deliveryEnabled, newOrderKeys, placeOrder } from "./delivery/api";
import { TrackingCard } from "./delivery/Tracking";
import "./delivery/delivery.css";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  BadgeCheck,
  Bike,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Flame,
  Drumstick,
  Pizza,
  Sandwich,
  Salad,
  Package,
  Heart,
  Leaf,
  MapPin,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  TicketPercent,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  badge?: string;
};
const products: Product[] = [
  {
    id: 1,
    name: "The Kampala Smash",
    description:
      "Double beef patty, melted cheddar, fresh greens & our secret sauce.",
    price: 25000,
    image: "burger",
    category: "Burgers",
    badge: "Bestseller",
  },
  {
    id: 2,
    name: "Crispy Chicken & Chips",
    description:
      "Golden, crunchy chicken with a generous side of seasoned chips.",
    price: 22000,
    image: "chicken",
    category: "Chicken",
    badge: "Fan favourite",
  },
  {
    id: 3,
    name: "Pepperoni Party",
    description:
      "Stone-baked crust, rich tomato sauce, mozzarella & pepperoni.",
    price: 35000,
    image: "pizza",
    category: "Pizza",
  },
  {
    id: 4,
    name: "The Loaded Rolex",
    description:
      "Fresh chapati, fluffy eggs, crunchy cabbage & juicy tomatoes.",
    price: 10000,
    image: "rolex",
    category: "Rolex & Wraps",
    badge: "Kampala classic",
  },
  {
    id: 5,
    name: "Smash & Chips Combo",
    description: "Our signature double smash burger, plus golden crispy chips.",
    price: 30000,
    image: "burger",
    category: "Combos",
    badge: "Great value",
  },
  {
    id: 6,
    name: "Chicken Sharing Box",
    description:
      "Six crispy chicken pieces and a large portion of chips to share.",
    price: 45000,
    image: "chicken",
    category: "Combos",
  },
  {
    id: 7,
    name: "Extra Cheese Pepperoni",
    description: "Pepperoni, tomato, fresh basil & extra melted mozzarella.",
    price: 30000,
    image: "pizza",
    category: "Pizza",
  },
  {
    id: 8,
    name: "Double Egg Rolex",
    description:
      "Two fluffy eggs with fresh vegetables in a warm golden chapati.",
    price: 8000,
    image: "rolex",
    category: "Rolex & Wraps",
  },
];
const categories = [
  { name: "All food", icon: UtensilsCrossed },
  { name: "Burgers", icon: Sandwich },
  { name: "Chicken", icon: Drumstick },
  { name: "Pizza", icon: Pizza },
  { name: "Rolex & Wraps", icon: Salad },
  { name: "Combos", icon: Package },
];
const areas: Record<string, number> = {
  "Kampala Central": 4000,
  Kololo: 5000,
  Ntinda: 6000,
  Bukoto: 6000,
  Naguru: 6000,
  Nakasero: 4000,
  Bugolobi: 6000,
  Kansanga: 6000,
  Muyenga: 7000,
  Makindye: 6000,
  "Other Kampala area": 8000,
};
const money = (n: number) => n.toLocaleString("en-UG");
function stored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
type Order = {
  cloud?: boolean;
  token?: string;
  id: string;
  total: number;
  date: string;
  items: number;
  area: string;
};

export default function App() {
  const [category, setCategory] = useState("All food");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popular");
  const [cart, setCart] = useState<Record<number, number>>(() =>
    stored("kb-cart", {}),
  );
  const [favourites, setFavourites] = useState<number[]>(() =>
    stored("kb-favourites", []),
  );
  const [onlyFavourites, setOnlyFavourites] = useState(false);
  const [area, setArea] = useState(() => stored("kb-area", "Kampala Central"));
  const [modal, setModal] = useState<
    "cart" | "location" | "about" | "orders" | null
  >(null);
  const [checkout, setCheckout] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const requestKeys = useRef<ReturnType<typeof newOrderKeys> | null>(null);
  const [orders, setOrders] = useState<Order[]>(() => stored("kb-orders", []));
  const [success, setSuccess] = useState<Order | null>(null);
  const [toast, setToast] = useState("");
  const [offers, setOffers] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = products.reduce(
    (total, p) => total + p.price * (cart[p.id] || 0),
    0,
  );
  const fee = areas[area] || 4000;
  useEffect(() => {
    localStorage.setItem("kb-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem("kb-favourites", JSON.stringify(favourites));
  }, [favourites]);
  useEffect(() => {
    localStorage.setItem("kb-area", JSON.stringify(area));
  }, [area]);
  useEffect(() => {
    localStorage.setItem("kb-orders", JSON.stringify(orders));
  }, [orders]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2600);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const dialog = document.querySelector('[role="dialog"]');
        const nodes = Array.from(
          dialog?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])',
          ) || [],
        ).filter((node) => node.getClientRects().length > 0);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [modal]);
  function updateCart(id: number, delta: number) {
    setCart((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) };
      if (!next[id]) delete next[id];
      return next;
    });
  }
  function menu() {
    document
      .getElementById("menu")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileNav(false);
  }
  useEffect(() => {
    requestKeys.current = null;
    setCheckoutError("");
  }, [cart, area]);
  function openCart() {
    setCheckout(false);
    setSuccess(null);
    setModal("cart");
  }
  async function submitCheckout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (checkoutBusy) return;
    const form = new FormData(e.currentTarget);
    setCheckoutBusy(true);
    setCheckoutError("");
    try {
      let order: Order;
      if (deliveryEnabled) {
        requestKeys.current ||= newOrderKeys();
        order = await placeOrder(
          {
            name: String(form.get("name")),
            phone: String(form.get("phone")),
            address: String(form.get("address")),
            area,
            notes: String(form.get("notes") || ""),
            items: products
              .filter((p) => cart[p.id])
              .map((p) => ({ id: p.id, quantity: cart[p.id] })),
          },
          requestKeys.current,
        );
      } else {
        order = {
          id: `KB-${Date.now().toString(36).toUpperCase()}`,
          total: subtotal + fee,
          date: new Date().toISOString(),
          items: count,
          area,
        };
      }
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      setSuccess(order);
      setCart({});
      setCheckout(false);
      requestKeys.current = null;
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "The order could not be sent. Your bag is still here. Please retry.",
      );
    } finally {
      setCheckoutBusy(false);
    }
  }
  const visible = products
    .filter(
      (p) =>
        (category === "All food" || p.category === category) &&
        (!onlyFavourites || favourites.includes(p.id)) &&
        (!offers || p.category === "Combos") &&
        `${p.name} ${p.description}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : 0,
    );

  return (
    <>
      <div className="announcement">
        <span>Good food. Good mood. Delivered.</span>
        <span className="announcement-right">
          <Bike size={14} /> Freshly made, all across Kampala{" "}
          <span className="tiny-dot" /> 30–45 min
        </span>
      </div>
      <header className="header">
        <div className="nav-inner">
          <a
            className="brand restaurant-brand"
            href="#"
            aria-label="Charbroiled Juicy Chicken home"
          >
            <img
              className="restaurant-logo"
              src="./brand/charbroiled-juicy-chicken.svg"
              alt="Charbroiled Juicy Chicken logo"
            />
            <span className="restaurant-wordmark">
              <span className="brand-overline">Charbroiled</span>
              <span className="brand-orange">Juicy Chicken</span>
              <small>BIG FLAVOUR. LOCAL LOVE.</small>
            </span>
          </a>
          <nav
            className={mobileNav ? "nav-links mobile-open" : "nav-links"}
            aria-label="Main navigation"
          >
            <button
              className={!offers ? "active" : ""}
              onClick={() => {
                setOffers(false);
                setOnlyFavourites(false);
                menu();
              }}
            >
              Our menu
            </button>
            <button
              className={offers ? "active" : ""}
              onClick={() => {
                setOffers(true);
                setCategory("All food");
                menu();
              }}
            >
              Offers <span className="nav-new">HOT</span>
            </button>
            <button
              onClick={() => {
                setModal("orders");
                setMobileNav(false);
              }}
            >
              My orders
            </button>
            <button
              onClick={() => {
                setModal("about");
                setMobileNav(false);
              }}
            >
              About us
            </button>
          </nav>
          <div className="nav-actions">
            <button
              className="location-button"
              onClick={() => setModal("location")}
            >
              <MapPin size={18} />
              <span>
                <small>Delivering to</small>
                <strong>{area}</strong>
              </span>
              <ChevronDown size={14} />
            </button>
            <button
              className="cart-button"
              aria-label={`My cart, ${count} items`}
              onClick={openCart}
            >
              <ShoppingBag size={17} />
              <span>My cart</span>
              <b>{count}</b>
            </button>
            <button
              className="mobile-menu icon-button"
              aria-label="Toggle navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              {mobileNav ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> KAMPALA’S NEXT CRAVING
            </div>
            <h1>
              Big on flavour.
              <br />
              Quick to{" "}
              <span>
                your door.
                <svg viewBox="0 0 360 18" preserveAspectRatio="none">
                  <path d="M3 12 Q160 -1 355 9 M24 17 Q190 7 330 14" />
                </svg>
              </span>
            </h1>
            <p>
              From juicy burgers to that perfect rolex.
              <br className="desktop-break" /> Your favourite bites, freshly
              made and delivered
              <br className="desktop-break" /> wherever you are in Kampala.
            </p>
            <button className="primary hero-cta" onClick={menu}>
              Find your flavour <ArrowRight size={18} />
            </button>
            <div className="hero-social">
              <div className="avatar-stack">
                <span>AN</span>
                <span>JK</span>
                <span>SN</span>
                <span>DM</span>
              </div>
              <div>
                <div className="stars">
                  ★★★★★ <strong>Made for Kampala</strong>
                </div>
                <small>Local flavour. A whole lot of love.</small>
              </div>
            </div>
          </div>
          <div className="hero-art">
            <img
              src="./food/burger.jpg"
              alt="Juicy double cheeseburger and golden fries, freshly prepared"
            />
            <div className="hero-art-shade" />
            <div className="handwritten">
              Cravings? Sorted.
              <svg viewBox="0 0 90 70">
                <path d="M4 4 Q85 6 62 59 M48 47 L61 61 77 47" />
              </svg>
            </div>
            <div className="food-sticker">
              <Flame size={19} fill="currentColor" />
              <span>
                Made fresh.
                <br />
                <strong>Never boring.</strong>
              </span>
            </div>
            <div className="delivery-float">
              <span className="delivery-icon">
                <Bike size={26} />
              </span>
              <span>
                <strong>Your cravings, on the way</strong>
                <small>
                  <span /> 30–45 min delivery
                </small>
              </span>
              <div className="float-check">
                <Check size={15} />
              </div>
            </div>
            <span className="hero-image-caption">
              THE KAMPALA SMASH <span>100% satisfaction in every bite</span>
            </span>
          </div>
        </section>
        <section className="benefits" aria-label="Our promise">
          <div>
            <Bike />
            <span>
              <strong>All across Kampala</strong>
              <small>Your neighbourhood, our next stop</small>
            </span>
          </div>
          <div>
            <UtensilsCrossed />
            <span>
              <strong>Fresh from our kitchen</strong>
              <small>Made to order. Made with love.</small>
            </span>
          </div>
          <div>
            <BadgeCheck />
            <span>
              <strong>Great food. Fair prices.</strong>
              <small>Big satisfaction, without the big bill</small>
            </span>
          </div>
          <div>
            <Leaf />
            <span>
              <strong>A little local love</strong>
              <small>Proudly serving the city we call home</small>
            </span>
          </div>
        </section>
        <section className="menu-section" id="menu">
          <div className="section-heading">
            <div>
              <div className="eyebrow">THE GOOD STUFF</div>
              <h2>
                {onlyFavourites
                  ? "Your favourites"
                  : offers
                    ? "More bites. Better value."
                    : "What are you craving?"}
                <span className="heading-dot">.</span>
              </h2>
              <p>
                {offers
                  ? "Made-for-sharing combos, at deliciously good prices."
                  : "Something for every mood. Everything made delicious."}
              </p>
            </div>
            <label className="search">
              <Search size={19} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your favourite food..."
                aria-label="Search menu"
              />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch("")}>
                  <X size={16} />
                </button>
              )}
              <kbd>⌕</kbd>
            </label>
          </div>
          <div className="menu-toolbar">
            <div className="categories">
              {categories.map((c) => (
                <button
                  className={
                    category === c.name ? "category selected" : "category"
                  }
                  key={c.name}
                  aria-label={c.name}
                  aria-pressed={category === c.name}
                  onClick={() => {
                    setCategory(c.name);
                    setOffers(false);
                  }}
                >
                  <span aria-hidden="true">
                    <c.icon size={19} strokeWidth={1.7} />
                  </span>
                  {c.name}
                </button>
              ))}
            </div>
            <button
              aria-label="Favourites"
              aria-pressed={onlyFavourites}
              className={`filter-button ${onlyFavourites ? "selected" : ""}`}
              onClick={() => setOnlyFavourites(!onlyFavourites)}
            >
              <Heart
                size={17}
                fill={onlyFavourites ? "currentColor" : "none"}
              />
              <span>Favourites</span>
            </button>
          </div>
          <div className="results-heading">
            <h3>
              {onlyFavourites
                ? "Saved for your cravings"
                : offers
                  ? "Combo deals"
                  : category === "All food"
                    ? "The crowd favourites"
                    : category}
              <span>{visible.length} delicious picks</span>
            </h3>
            <label className="sort">
              <ArrowDownUp size={14} />
              <select
                aria-label="Sort menu"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="popular">Recommended</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </label>
          </div>
          <div className="food-grid">
            {visible.map((p) => (
              <article className="food-card" key={p.id}>
                <div className="food-image">
                  <img
                    src={`./food/${p.image}.jpg`}
                    alt={p.name}
                    loading="lazy"
                  />
                  {p.badge && (
                    <span className={`food-badge ${p.id === 4 ? "local" : ""}`}>
                      {p.id === 1 ? (
                        <Flame size={12} fill="currentColor" />
                      ) : p.id === 4 ? (
                        <Sparkles size={12} />
                      ) : (
                        <Star size={12} fill="currentColor" />
                      )}
                      {p.badge}
                    </span>
                  )}
                  <button
                    className={`favourite ${favourites.includes(p.id) ? "saved" : ""}`}
                    aria-label={`${favourites.includes(p.id) ? "Remove" : "Save"} ${p.name} ${favourites.includes(p.id) ? "from" : "to"} favourites`}
                    onClick={() =>
                      setFavourites((prev) =>
                        prev.includes(p.id)
                          ? prev.filter((id) => id !== p.id)
                          : [...prev, p.id],
                      )
                    }
                  >
                    <Heart
                      size={17}
                      fill={favourites.includes(p.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="food-info">
                  <div className="food-title">
                    <h3>{p.name}</h3>
                  </div>
                  <p>{p.description}</p>
                  <div className="food-meta">
                    <span>
                      <Clock3 size={12} />
                      20–30 min
                    </span>
                    <span className="made-fresh">
                      <span /> Made fresh
                    </span>
                  </div>
                  <div className="food-bottom">
                    <strong>
                      <small>UGX</small> {money(p.price)}
                    </strong>
                    {cart[p.id] ? (
                      <div className="quantity">
                        <button
                          aria-label={`Remove one ${p.name}`}
                          onClick={() => updateCart(p.id, -1)}
                        >
                          <Minus size={15} />
                        </button>
                        <span>{cart[p.id]}</span>
                        <button
                          aria-label={`Add one ${p.name}`}
                          onClick={() => updateCart(p.id, 1)}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="add-button"
                        onClick={() => {
                          updateCart(p.id, 1);
                          setToast(`${p.name} added to your cart`);
                        }}
                        aria-label={`Add ${p.name} to cart`}
                      >
                        <Plus size={19} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="empty-state">
              <Search size={32} />
              <h3>No bites found just yet</h3>
              <p>
                {onlyFavourites
                  ? "Tap the heart on a meal to save it here."
                  : "Try another search or explore the full menu."}
              </p>
              <button
                className="primary"
                onClick={() => {
                  setSearch("");
                  setOnlyFavourites(false);
                  setCategory("All food");
                  setOffers(false);
                }}
              >
                Explore all food <ArrowRight size={17} />
              </button>
            </div>
          )}
          <div className="bottom-promo">
            <span className="promo-icon">
              <TicketPercent size={30} />
            </span>
            <div>
              <small>GOOD TIMES TASTE BETTER TOGETHER</small>
              <h3>A little more food. A lot more happiness.</h3>
              <p>Big appetites? Meet our made-for-sharing combos.</p>
            </div>
            <button
              onClick={() => {
                setOffers(true);
                setCategory("All food");
                setSearch("");
                setOnlyFavourites(false);
                menu();
              }}
            >
              Explore combos <ArrowRight size={17} />
            </button>
            <span className="promo-decoration">✳</span>
          </div>
        </section>
        <section className="closing-note">
          <span>Made with love. Delivered with a smile.</span>
          <Heart size={15} />
        </section>
      </main>
      <footer>
        <a
          className="footer-brand restaurant-footer-brand"
          href="#"
          aria-label="Charbroiled Juicy Chicken home"
        >
          <img src="./brand/charbroiled-juicy-chicken.svg" alt="" />
          <span>
            Charbroiled <strong>Juicy Chicken</strong>
          </span>
        </a>
        <span>Local flavour. Wherever you are in Kampala.</span>
        <small>© {new Date().getFullYear()} Charbroiled Juicy Chicken</small>
        <button onClick={() => setModal("about")}>
          Our kitchen <ChevronRight size={13} />
        </button>
        <nav className="delivery-nav-links" aria-label="Restaurant operations">
          <a href="#track">Track order</a>
          <a href="#admin">Admin workspace</a>
          <a href="#rider">Rider GPS</a>
        </nav>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button onClick={openCart}>
            View cart <ArrowRight size={14} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className={`modal ${modal === "cart" ? "cart-drawer" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <small>CHARBROILED JUICY CHICKEN</small>
                <h2 id="dialog-title">
                  {modal === "cart"
                    ? success
                      ? "You’re all set!"
                      : checkout
                        ? "Delivery details"
                        : "Your good-food bag"
                    : modal === "location"
                      ? "Where are we headed?"
                      : modal === "orders"
                        ? "Your orders"
                        : "Big flavour. Local love."}
                </h2>
              </div>
              <button
                ref={closeRef}
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => setModal(null)}
              >
                <X size={22} />
              </button>
            </div>
            {modal === "location" && (
              <div className="modal-body">
                <p>
                  Choose your Kampala neighbourhood to see your estimated
                  delivery fee.
                </p>
                <label className="field">
                  Delivery area
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  >
                    {Object.keys(areas).map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <div className="info-box">
                  <Bike size={22} />
                  <div>
                    <strong>UGX {money(fee)} estimated delivery</strong>
                    <p>
                      Usually 30–45 minutes. Exact address is added at checkout.
                    </p>
                  </div>
                </div>
                <button
                  className="primary full-width"
                  onClick={() => setModal(null)}
                >
                  Deliver here <Check size={17} />
                </button>
              </div>
            )}
            {modal === "about" && (
              <div className="modal-body about-body">
                <img
                  className="about-restaurant-logo"
                  src="./brand/charbroiled-juicy-chicken.svg"
                  alt="Charbroiled Juicy Chicken logo"
                />
                <h3>Kampala cravings, sorted.</h3>
                <p>
                  From a quick rolex to a sharing box for the whole crew,
                  Charbroiled Juicy Chicken brings big, comforting flavours to
                  your neighbourhood.
                </p>
                <div className="info-box">
                  <MapPin size={23} />
                  <div>
                    <strong>Made for Kampala</strong>
                    <p>
                      Choose your neighbourhood for an estimated delivery fee.
                    </p>
                  </div>
                </div>
                <p className="demo-note">
                  This is a restaurant app preview. Menu, prices and delivery
                  estimates are samples. Orders are saved on this device only;
                  no restaurant is notified and no payments are collected.
                </p>
                <button
                  className="primary full-width"
                  onClick={() => {
                    setModal(null);
                    menu();
                  }}
                >
                  Explore the menu <ArrowRight size={17} />
                </button>
              </div>
            )}
            {modal === "orders" && (
              <div className="modal-body">
                <p className="demo-note">
                  {deliveryEnabled
                    ? "Connected orders refresh automatically. Older demo orders stay labelled. Keep tracking codes private: they allow access to this delivery’s progress and rider GPS."
                    : "Demo orders saved on this device. These have not been sent to a restaurant."}
                </p>
                {orders.length ? (
                  orders.map((order) =>
                    order.cloud && order.token ? (
                      <TrackingCard
                        key={order.id}
                        id={order.id}
                        token={order.token}
                      />
                    ) : (
                      <div className="order-card" key={order.id}>
                        <div>
                          <strong>#{order.id}</strong>
                          <span className="order-status">Demo saved</span>
                        </div>
                        <p>
                          {new Date(order.date).toLocaleDateString("en-UG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          · {order.items} items · {order.area}
                        </p>
                        <strong>UGX {money(order.total)}</strong>
                      </div>
                    ),
                  )
                ) : (
                  <div className="empty-state">
                    <ShoppingBag size={36} />
                    <h3>Your next great bite awaits</h3>
                    <p>
                      {deliveryEnabled
                        ? "Your orders and live tracking will appear here."
                        : "Your demo orders will appear here."}
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        setModal(null);
                        menu();
                      }}
                    >
                      Find something delicious
                    </button>
                  </div>
                )}
              </div>
            )}
            {modal === "cart" &&
              (success ? (
                <div className="modal-body success-body">
                  <span className="success-check">
                    <Check size={38} />
                  </span>
                  <h3>That’s a delicious choice.</h3>
                  <p>
                    {success.cloud ? (
                      "Your order has been sent to the restaurant for confirmation."
                    ) : (
                      <>
                        Demo order <strong>#{success.id}</strong> has been saved
                        on this device.
                      </>
                    )}
                  </p>
                  <div className="info-box">
                    <ShoppingBag size={24} />
                    <div>
                      <strong>
                        {success.items} items · UGX {money(success.total)}
                      </strong>
                      <p>{success.area}</p>
                    </div>
                  </div>
                  <p className="demo-note">
                    {success.cloud
                      ? "Payment is due on delivery. Wait for the restaurant to confirm your order. Keep your private tracking details safe."
                      : "This is a demo, not a live order. Nothing has been sent to a restaurant and you haven’t been charged."}
                  </p>
                  {success.cloud && success.token && (
                    <TrackingCard id={success.id} token={success.token} />
                  )}
                  <button
                    className="primary full-width"
                    onClick={() => {
                      setModal(null);
                      menu();
                    }}
                  >
                    Back to the good stuff <ArrowRight size={17} />
                  </button>
                </div>
              ) : !count ? (
                <div className="modal-body empty-state">
                  <ShoppingBag size={46} />
                  <h3>Your bag is feeling a little empty</h3>
                  <p>Let’s fill it with something delicious.</p>
                  <button
                    className="primary"
                    onClick={() => {
                      setModal(null);
                      menu();
                    }}
                  >
                    Explore the menu <ArrowRight size={17} />
                  </button>
                </div>
              ) : checkout ? (
                <form
                  className="modal-body checkout-form"
                  onSubmit={submitCheckout}
                >
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setCheckout(false)}
                  >
                    ← Back to your bag
                  </button>
                  <p>One last stop before your favourite bites.</p>
                  <label className="field">
                    Your name
                    <input
                      maxLength={100}
                      required
                      name="name"
                      autoComplete="name"
                      placeholder="e.g. Amina Nakato"
                      minLength={2}
                    />
                  </label>
                  <label className="field">
                    Phone number
                    <input
                      required
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="e.g. 0772 123 456"
                      pattern="(\+?256|0)[\s0-9]{8,13}"
                      title="Enter a valid Ugandan phone number, starting with 0 or +256"
                    />
                  </label>
                  <label className="field">
                    Delivery area
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    >
                      {Object.keys(areas).map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Street address & landmark
                    <textarea
                      required
                      name="address"
                      maxLength={500}
                      minLength={8}
                      placeholder="Building, street, nearby landmark…"
                      rows={3}
                    />
                  </label>
                  <label className="field">
                    Kitchen notes <span>(optional)</span>
                    <textarea
                      name="notes"
                      maxLength={1000}
                      placeholder="Any allergies or special requests?"
                      rows={2}
                    />
                  </label>
                  <div className="info-box">
                    <ShoppingBag size={22} />
                    <div>
                      <strong>
                        {deliveryEnabled
                          ? "Cash on delivery"
                          : "Cash on delivery · Demo only"}
                      </strong>
                      <p>No online payment is collected.</p>
                    </div>
                  </div>
                  <div className="total-row">
                    <strong>Total including delivery</strong>
                    <strong>UGX {money(subtotal + fee)}</strong>
                  </div>
                  <p className="demo-note">
                    {deliveryEnabled
                      ? "Placing an order sends your name, phone, address and kitchen notes to the restaurant for fulfilment. Only authorised staff can access them. Prices are confirmed server-side. Keep your private tracking code safe."
                      : "This saves a sample order on your device. It does not send an order or arrange delivery. Personal details are not stored."}
                  </p>
                  {checkoutError && (
                    <p className="dispatch-error checkout-error" role="alert">
                      Could not place order: {checkoutError} Your bag has not
                      been cleared.
                    </p>
                  )}
                  <button
                    className="primary full-width"
                    type="submit"
                    disabled={checkoutBusy}
                  >
                    {checkoutBusy
                      ? "Sending your order…"
                      : deliveryEnabled
                        ? "Place order"
                        : "Place demo order"}{" "}
                    <ArrowRight size={18} />
                  </button>
                </form>
              ) : (
                <>
                  <div className="cart-content">
                    <div className="cart-delivery">
                      <MapPin size={17} />
                      <span>
                        Delivering to <strong>{area}</strong>
                      </span>
                      <button onClick={() => setModal("location")}>
                        Change
                      </button>
                    </div>
                    {products
                      .filter((p) => cart[p.id])
                      .map((p) => (
                        <div className="cart-item" key={p.id}>
                          <img src={`./food/${p.image}.jpg`} alt={p.name} />
                          <div className="cart-item-details">
                            <h3>{p.name}</h3>
                            <strong>UGX {money(p.price)}</strong>
                            <div className="quantity">
                              <button
                                aria-label={`Remove one ${p.name}`}
                                onClick={() => updateCart(p.id, -1)}
                              >
                                <Minus size={14} />
                              </button>
                              <span>{cart[p.id]}</span>
                              <button
                                aria-label={`Add one ${p.name}`}
                                onClick={() => updateCart(p.id, 1)}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                          <button
                            className="remove-item icon-button"
                            aria-label={`Remove ${p.name} from cart`}
                            onClick={() =>
                              setCart((prev) => {
                                const next = { ...prev };
                                delete next[p.id];
                                return next;
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                  </div>
                  <div className="cart-summary">
                    <div>
                      <span>Subtotal ({count} items)</span>
                      <strong>UGX {money(subtotal)}</strong>
                    </div>
                    <div>
                      <span>Estimated delivery</span>
                      <strong>UGX {money(fee)}</strong>
                    </div>
                    <div className="total-row">
                      <strong>Total</strong>
                      <strong>UGX {money(subtotal + fee)}</strong>
                    </div>
                    <button
                      className="primary full-width"
                      onClick={() => setCheckout(true)}
                    >
                      Continue to checkout <ArrowRight size={18} />
                    </button>
                    <p className="demo-note">
                      {deliveryEnabled
                        ? "Sent securely to the restaurant. Cash on delivery. Menu and delivery fees require restaurant verification."
                        : "A little preview of your next favourite meal. Demo orders only."}
                    </p>
                  </div>
                </>
              ))}
          </section>
        </div>
      )}
    </>
  );
}
