// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  getStaff: vi.fn(),
  getWorkspace: vi.fn(),
  publishLocation: vi.fn(),
  stopLocation: vi.fn(),
  trackOrder: vi.fn(),
  setOrderStatus: vi.fn(),
  getSession: vi.fn(),
  onAuth: vi.fn(),
  signOut: vi.fn(),
  placeOrder: vi.fn(),
}));
vi.mock("../src/delivery/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/delivery/api")>();
  return {
    ...original,
    deliveryEnabled: true,
    getStaff: mocks.getStaff,
    getWorkspace: mocks.getWorkspace,
    publishLocation: mocks.publishLocation,
    stopLocation: mocks.stopLocation,
    trackOrder: mocks.trackOrder,
    setOrderStatus: mocks.setOrderStatus,
    placeOrder: mocks.placeOrder,
    deliveryClient: {
      auth: {
        getSession: mocks.getSession,
        onAuthStateChange: mocks.onAuth,
        signOut: mocks.signOut,
      },
    },
  };
});
import { locationHealth, type RiderLocation } from "../src/delivery/api";
import { Progress, TrackingCard } from "../src/delivery/Tracking";
import { Portal } from "../src/delivery/Portal";
import { useRiderGps } from "../src/delivery/useRiderGps";
import App from "../src/App";
const fix = () =>
  ({
    coords: {
      latitude: 0.3336,
      longitude: 32.5988,
      accuracy: 12,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  }) as GeolocationPosition;
const location = (override = {}): RiderLocation => ({
  latitude: 0.3336,
  longitude: 32.5988,
  accuracy: 15,
  captured_at: new Date().toISOString(),
  received_at: new Date().toISOString(),
  sharing: true,
  ...override,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.onAuth.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mocks.publishLocation.mockResolvedValue(undefined);
  mocks.stopLocation.mockResolvedValue(undefined);
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
  Object.defineProperty(document, "hidden", {
    value: false,
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("progress and GPS state", () => {
  it("distinguishes fresh, inaccurate, stale and stopped GPS", () => {
    expect(locationHealth(null).state).toBe("waiting");
    expect(locationHealth(location()).state).toBe("recent");
    expect(locationHealth(location({ accuracy: 500 })).state).toBe(
      "approximate",
    );
    expect(
      locationHealth(
        location({ captured_at: new Date(Date.now() - 60000).toISOString() }),
      ).state,
    ).toBe("stale");
    expect(locationHealth(location({ sharing: false })).state).toBe("paused");
  });
  it("shows the correct progress value and handles cancellation separately", () => {
    const view = render(<Progress status="preparing" />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "2",
    );
    view.rerender(<Progress status="cancelled" />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText(/This order was cancelled/)).toBeTruthy();
  });
  it("does not start GPS without an explicit action and cleans up on stop", async () => {
    let callback: PositionCallback | undefined;
    const watch = vi.fn((success: PositionCallback) => {
      callback = success;
      return 42;
    });
    const clear = vi.fn();
    vi.stubGlobal("navigator", {
      geolocation: { watchPosition: watch, clearWatch: clear },
    });
    const { result, unmount } = renderHook(() =>
      useRiderGps("assigned-order", true),
    );
    expect(watch).not.toHaveBeenCalled();
    act(() => result.current.start());
    expect(watch).toHaveBeenCalledOnce();
    await act(async () => callback?.(fix()));
    expect(mocks.publishLocation).toHaveBeenCalledWith(
      "assigned-order",
      expect.objectContaining({
        coords: expect.objectContaining({ latitude: 0.3336 }),
      }),
    );
    act(() => result.current.stop());
    expect(clear).toHaveBeenCalledWith(42);
    expect(result.current.sharing).toBe(false);
    await act(async () => callback?.(fix()));
    expect(mocks.publishLocation).toHaveBeenCalledTimes(1);
    unmount();
  });
  it("explains permission denial and stops the watcher", () => {
    let failure: PositionErrorCallback | undefined;
    const clear = vi.fn();
    vi.stubGlobal("navigator", {
      geolocation: {
        watchPosition: vi.fn(
          (_success: PositionCallback, error: PositionErrorCallback) => {
            failure = error;
            return 8;
          },
        ),
        clearWatch: clear,
      },
    });
    const { result } = renderHook(() => useRiderGps("assigned-order", true));
    act(() => result.current.start());
    act(() =>
      failure?.({
        code: 1,
        message: "Denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }),
    );
    expect(result.current.error).toContain("permission was denied");
    expect(result.current.sharing).toBe(false);
    expect(clear).toHaveBeenCalledWith(8);
  });
  it("pauses GPS when the rider hides the page", () => {
    const clear = vi.fn();
    vi.stubGlobal("navigator", {
      geolocation: { watchPosition: vi.fn(() => 9), clearWatch: clear },
    });
    const { result } = renderHook(() => useRiderGps("assigned-order", true));
    act(() => result.current.start());
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current.sharing).toBe(false);
    expect(clear).toHaveBeenCalledWith(9);
    expect(result.current.message).toContain("Sharing paused");
  });
  it("refuses GPS in an insecure context or before dispatch", () => {
    const watch = vi.fn();
    vi.stubGlobal("navigator", {
      geolocation: { watchPosition: watch, clearWatch: vi.fn() },
    });
    Object.defineProperty(window, "isSecureContext", {
      value: false,
      configurable: true,
    });
    const { result } = renderHook(() => useRiderGps("assigned-order", true));
    act(() => result.current.start());
    expect(result.current.error).toContain("HTTPS");
    expect(watch).not.toHaveBeenCalled();
  });
});

describe("staff protection and preview", () => {
  it("does not request real orders before signing in", async () => {
    render(<Portal mode="admin" />);
    expect(
      await screen.findByRole("heading", { name: "Welcome back, team." }),
    ).toBeTruthy();
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });
  it("does not grant workspace access to a signed-in account without a role", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "not-staff" } } },
    });
    mocks.getStaff.mockResolvedValue(null);
    render(<Portal mode="admin" />);
    expect(
      await screen.findByRole("heading", { name: "Staff access required" }),
    ).toBeTruthy();
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });
  it("keeps sample dashboard updates local", async () => {
    const user = userEvent.setup();
    render(<Portal mode="admin" />);
    await user.click(
      await screen.findByRole("button", { name: /Explore sample dashboard/ }),
    );
    expect(
      screen.getByText("Sample workspace — not live operations"),
    ).toBeTruthy();
    const slider = screen.getByRole("slider", {
      name: "Update order progress",
    });
    fireEvent.change(slider, { target: { value: "3" } });
    await user.click(screen.getByRole("button", { name: "Save progress" }));
    expect(
      await screen.findByText(
        "Sample progress updated. No real order changed.",
      ),
    ).toBeTruthy();
    expect(mocks.setOrderStatus).not.toHaveBeenCalled();
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });
});

describe("connected checkout and customer tracking", () => {
  async function enterCheckout(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Add The Loaded Rolex to cart" }),
    );
    await user.click(screen.getByRole("button", { name: /My cart/ }));
    await user.click(
      screen.getByRole("button", { name: /Continue to checkout/ }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Your name" }),
      "Test Customer",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Phone number" }),
      "0772123456",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Street address & landmark" }),
      "Example address Kampala",
    );
  }
  it("preserves the cart on backend failure and reuses the request key on retry", async () => {
    const user = userEvent.setup();
    mocks.placeOrder.mockRejectedValue(new Error("Network unavailable"));
    await enterCheckout(user);
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Your bag has not been cleared"),
    );
    expect(JSON.parse(localStorage.getItem("kb-cart")!)).toEqual({ 4: 1 });
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(mocks.placeOrder).toHaveBeenCalledTimes(2);
    expect(mocks.placeOrder.mock.calls[0][1]).toEqual(
      mocks.placeOrder.mock.calls[1][1],
    );
  });
  it("saves only the receipt and tracking token after a connected order succeeds", async () => {
    const user = userEvent.setup();
    const receipt = {
      id: "a".repeat(8) + "-aaaa-aaaa-aaaa-" + "a".repeat(12),
      token: "a".repeat(64),
      total: 14000,
      date: new Date().toISOString(),
      items: 1,
      area: "Kampala Central",
      cloud: true,
    };
    mocks.placeOrder.mockResolvedValue(receipt);
    mocks.trackOrder.mockResolvedValue({
      ...receipt,
      created_at: receipt.date,
      updated_at: receipt.date,
      status: "received",
      location: null,
      rider_name: null,
      events: [],
      items: [{ id: 4, name: "The Loaded Rolex", quantity: 1, price: 10000 }],
    });
    await enterCheckout(user);
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(
      await screen.findByText(
        "Your order has been sent to the restaurant for confirmation.",
      ),
    ).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("progressbar")).toBeTruthy());
    const stored = localStorage.getItem("kb-orders")!;
    expect(JSON.parse(stored)[0]).toMatchObject(receipt);
    expect(stored).not.toContain("Test Customer");
    expect(stored).not.toContain("0772123456");
    expect(stored).not.toContain("Example address");
    expect(JSON.parse(localStorage.getItem("kb-cart")!)).toEqual({});
  });
  it("shows a tracking fetch failure without inventing progress or GPS", async () => {
    mocks.trackOrder.mockRejectedValue(
      new Error("Invalid private tracking code"),
    );
    render(<TrackingCard id="order" token="token" />);
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Invalid private tracking code"),
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
