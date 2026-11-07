// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const api = vi.hoisted(() => ({
  availability: vi.fn(),
  start: vi.fn(),
  check: vi.fn(),
  cash: vi.fn(),
}));
vi.mock("../src/delivery/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/delivery/api")>()),
  paymentAvailability: api.availability,
  startMobilePayment: api.start,
  checkMobilePayment: api.check,
  chooseCash: api.cash,
}));
import { CheckoutPaymentChoice, PaymentPanel } from "../src/delivery/Payments";
import type { Tracking } from "../src/delivery/api";
const order = (overrides: Partial<Tracking> = {}): Tracking => ({
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  status: "received",
  area: "Kololo",
  items: [],
  total: 49000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  location: null,
  rider_name: null,
  events: [],
  payment_method: "mobile_money",
  payment_status: "unpaid",
  payment: null,
  ...overrides,
});
const attempt = {
  id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  status: "pending" as const,
  reference: "DG-TEST",
  external_ref: "CJC-test",
  amount: 49000,
  currency: "UGX" as const,
  created_at: new Date().toISOString(),
  verified_at: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  api.availability.mockResolvedValue(true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("customer Mobile Money controls", () => {
  it("keeps cash available and explains explicit phone approval", async () => {
    const change = vi.fn();
    render(
      <CheckoutPaymentChoice value="cash" onChange={change} disabled={false} />,
    );
    expect(
      (
        screen.getByRole("radio", {
          name: /cash on delivery/i,
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    await userEvent.click(screen.getByRole("radio", { name: /Mobile Money/i }));
    expect(change).toHaveBeenCalledWith("mobile_money");
  });
  it("does not charge merely by opening tracking; sends one explicit request using the private token", async () => {
    const update = vi.fn();
    api.start.mockResolvedValue(
      order({ payment_status: "pending", payment: attempt }),
    );
    render(
      <PaymentPanel order={order()} token="private-code" onUpdate={update} />,
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: /Send payment prompt/,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    expect(api.start).not.toHaveBeenCalled();
    await userEvent.type(
      screen.getByRole("textbox", { name: /payer number/ }),
      "0772123456",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Send payment prompt/ }),
    );
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(api.start).toHaveBeenCalledWith(
      order().id,
      "private-code",
      "0772123456",
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ payment_status: "pending" }),
    );
    expect(screen.queryByText(/Payment verified. Thank you!/)).toBeNull();
    expect(localStorage.getItem("0772123456")).toBeNull();
  });
  it("never retries a pending collection or offers cash while the outcome is unknown", async () => {
    api.check.mockResolvedValue(
      order({
        payment_status: "pending",
        payment: { ...attempt, status: "unknown", reference: null },
      }),
    );
    render(
      <PaymentPanel
        order={order({
          payment_status: "pending",
          payment: { ...attempt, status: "unknown", reference: null },
        })}
        token="private-code"
        onUpdate={vi.fn()}
      />,
    );
    await waitFor(() => expect(api.check).toHaveBeenCalledTimes(1));
    expect(api.start).not.toHaveBeenCalled();
    expect(api.cash).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Choose cash/ })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Send payment prompt/ }),
    ).toBeNull();
    expect(
      screen.getByText(/A pending or unknown request is not a failed payment/),
    ).toBeTruthy();
  });
  it("resumes the same attempt only after an explicit click when its reference is unavailable", async () => {
    const pending = order({
      payment_status: "pending",
      payment: { ...attempt, status: "unknown", reference: null },
    });
    api.check.mockResolvedValue(pending);
    api.start.mockResolvedValue(pending);
    render(
      <PaymentPanel order={pending} token="private-code" onUpdate={vi.fn()} />,
    );
    await waitFor(() => expect(api.check).toHaveBeenCalled());
    await userEvent.click(
      screen.getByRole("button", { name: /Resume the same request safely/ }),
    );
    expect(api.start).toHaveBeenCalledWith(pending.id, "private-code", "");
    expect(api.start).toHaveBeenCalledTimes(1);
  });
  it("shows verified success without another payment button or PIN field", () => {
    render(
      <PaymentPanel
        order={order({
          payment_status: "paid",
          payment: {
            ...attempt,
            status: "completed",
            verified_at: new Date().toISOString(),
          },
        })}
        token="private-code"
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Payment verified. Thank you!")).toBeTruthy();
    expect(screen.getByText(/Please do not pay the rider again/)).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /payer number/ })).toBeNull();
    expect(api.start).not.toHaveBeenCalled();
    expect(api.check).not.toHaveBeenCalled();
  });
  it("disables collection when the merchant bridge is unavailable", async () => {
    api.availability.mockResolvedValue(false);
    render(
      <PaymentPanel order={order()} token="private-code" onUpdate={vi.fn()} />,
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Mobile Money is unavailable right now/),
      ).toBeTruthy(),
    );
    expect(
      (
        screen.getByRole("button", {
          name: /Send payment prompt/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(api.start).not.toHaveBeenCalled();
  });
  it("retains uncertainty after a timeout instead of claiming failure or success", async () => {
    api.start.mockRejectedValue(
      new Error("Payment outcome is unknown. Do not pay again."),
    );
    render(
      <PaymentPanel order={order()} token="private-code" onUpdate={vi.fn()} />,
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: /Send payment prompt/,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.change(screen.getByRole("textbox", { name: /payer number/ }), {
      target: { value: "0772123456" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: /Send payment prompt/ })
        .closest("form")!,
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("unknown"),
    );
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Payment verified. Thank you!/)).toBeNull();
  });
});
