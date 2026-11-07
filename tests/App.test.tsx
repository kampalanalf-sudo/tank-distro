// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("../src/delivery/api", () => ({ deliveryEnabled: false }));
import App from "../src/App";

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

describe("Charbroiled Juicy Chicken", () => {
  it("shows the menu and filters by search and category", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getAllByRole("article")).toHaveLength(8);
    await user.type(
      screen.getByRole("textbox", { name: "Search menu" }),
      "rolex",
    );
    expect(screen.getAllByRole("article")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await user.click(screen.getByRole("button", { name: "Chicken" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Crispy Chicken & Chips" }),
    ).toBeTruthy();
  });

  it("sorts by price and stores favourites across renders", async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort menu" }),
      "low",
    );
    expect(
      within(screen.getAllByRole("article")[0]).getByRole("heading")
        .textContent,
    ).toBe("Double Egg Rolex");
    await user.click(
      screen.getByRole("button", {
        name: "Save The Kampala Smash to favourites",
      }),
    );
    view.unmount();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Favourites" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "The Kampala Smash" }),
    ).toBeTruthy();
  });

  it("calculates cart quantities, fees and persists the cart", async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Add The Kampala Smash to cart" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Add one The Kampala Smash" }),
    );
    view.unmount();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /My cart/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("UGX 54,000")).toBeTruthy();
    await user.click(
      within(dialog).getByRole("button", {
        name: "Remove one The Kampala Smash",
      }),
    );
    expect(within(dialog).getByText("UGX 29,000")).toBeTruthy();
    await user.click(
      within(dialog).getByRole("button", {
        name: "Remove The Kampala Smash from cart",
      }),
    );
    expect(
      within(dialog).getByRole("heading", {
        name: "Your bag is feeling a little empty",
      }),
    ).toBeTruthy();
  });

  it("updates the delivery location and handles dialog escape", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Delivering to/ }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Delivery area" }),
      "Ntinda",
    );
    expect(screen.getByText("UGX 6,000 estimated delivery")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Ntinda")).toBeTruthy();
  });

  it("saves a demo order without storing personal delivery details", async () => {
    const user = userEvent.setup();
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
      "Amina Nakato",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Phone number" }),
      "0772123456",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Street address & landmark" }),
      "Plot 12, Kampala Road",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Delivery area" }),
      "Ntinda",
    );
    expect(screen.getByText("UGX 16,000")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Place demo order/ }));
    expect(
      screen.getByRole("heading", { name: "That’s a delicious choice." }),
    ).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("kb-cart")!)).toEqual({});
    const saved = localStorage.getItem("kb-orders")!;
    expect(JSON.parse(saved)[0]).toMatchObject({
      total: 16000,
      items: 1,
      area: "Ntinda",
    });
    expect(saved).not.toContain("Amina");
    expect(saved).not.toContain("0772123456");
    expect(saved).not.toContain("Plot 12");
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    await user.click(screen.getByRole("button", { name: "My orders" }));
    expect(screen.getByText("Demo saved")).toBeTruthy();
  });

  it("shows an actionable empty state for unmatched searches", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search menu" }), {
      target: { value: "zzzzz" },
    });
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Explore all food" }));
    expect(screen.getAllByRole("article")).toHaveLength(8);
  });
});
