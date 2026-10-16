import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAUSED_MESSAGE,
  formatGhanaPhone,
  formatReopenDate,
  isPausedPageRoute,
  parseOrderAcceptance,
  pausedMessage,
} from "./order-acceptance";

const NOW = new Date("2026-10-16T09:00:00Z");

describe("parseOrderAcceptance", () => {
  it("reads open when the backend says nothing or something malformed", () => {
    for (const raw of [undefined, null, "paused", 1, {}]) {
      expect(parseOrderAcceptance(raw).open).toBe(true);
    }
  });

  it("reads a pause with its message and date", () => {
    expect(
      parseOrderAcceptance({ open: false, message: " Back Monday ", reopen_date: "2026-10-19" }),
    ).toEqual({ open: false, message: "Back Monday", reopenDate: "2026-10-19" });
  });

  it("drops a malformed date", () => {
    expect(parseOrderAcceptance({ open: false, reopen_date: "Monday" }).reopenDate).toBeNull();
  });
});

describe("isPausedPageRoute", () => {
  it("is the home, cart, checkout steps and reorder", () => {
    for (const p of [
      "/",
      "/cart",
      "/cart/",
      "/checkout",
      "/checkout/delivery",
      "/checkout/payment",
      "/account/orders/reorder/order_123",
    ]) {
      expect(isPausedPageRoute(p), p).toBe(true);
    }
  });

  it("leaves browsing, tracking, accounts and the post-payment pages alone", () => {
    for (const p of [
      "/products",
      "/products/pizza-box",
      "/products/category/rsc-cartons",
      "/track-order",
      "/account/orders",
      "/about",
      "/checkout/confirmation",
      "/checkout/callback",
    ]) {
      expect(isPausedPageRoute(p), p).toBe(false);
    }
  });
});

describe("formatGhanaPhone", () => {
  it("spaces Ghana numbers like the mockup and leaves others alone", () => {
    expect(formatGhanaPhone("+233591207616")).toBe("+233 59 120 7616");
    expect(formatGhanaPhone("+233 59 120 7616")).toBe("+233 59 120 7616");
    expect(formatGhanaPhone("0591207616")).toBe("059 120 7616");
    expect(formatGhanaPhone(" 12345 ")).toBe("12345");
  });
});

describe("pausedMessage", () => {
  it("falls back to the mockup's default message", () => {
    expect(pausedMessage({ open: false, message: "", reopenDate: null })).toBe(
      DEFAULT_PAUSED_MESSAGE,
    );
    expect(pausedMessage({ open: false, message: "Closed today", reopenDate: null })).toBe(
      "Closed today",
    );
  });
});

describe("formatReopenDate", () => {
  it("formats like the mockup", () => {
    expect(formatReopenDate("2026-10-19", NOW)).toBe("Monday, 19 October 2026");
  });

  it("shows today but hides a date that has passed", () => {
    expect(formatReopenDate("2026-10-16", NOW)).toBe("Friday, 16 October 2026");
    expect(formatReopenDate("2026-10-15", NOW)).toBeNull();
  });

  it("hides missing and impossible dates", () => {
    expect(formatReopenDate(null, NOW)).toBeNull();
    expect(formatReopenDate("2026-02-30", NOW)).toBeNull();
  });
});
