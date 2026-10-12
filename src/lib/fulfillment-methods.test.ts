import { describe, expect, it } from "vitest";
import {
  CHECKOUT_PAUSED_MESSAGE,
  DELIVERY_OFF_MESSAGE,
  PICKUP_OFF_MESSAGE,
  checkoutOpen,
  methodOffMessage,
  parseFulfillmentMethods,
} from "./fulfillment-methods";

describe("parseFulfillmentMethods", () => {
  it("reads both ON when the backend sent nothing usable", () => {
    expect(parseFulfillmentMethods(undefined)).toEqual({ pickup: true, delivery: true });
    expect(parseFulfillmentMethods({ pickup: "no" })).toEqual({ pickup: true, delivery: true });
  });

  it("reads saved switches", () => {
    expect(parseFulfillmentMethods({ pickup: false, delivery: true })).toEqual({
      pickup: false,
      delivery: true,
    });
  });
});

describe("checkoutOpen", () => {
  it("is open while delivery is on, whatever pickup is", () => {
    expect(checkoutOpen({ pickup: false, delivery: true }, false)).toBe(true);
  });

  it("is open on pickup alone only when a pickup point exists", () => {
    expect(checkoutOpen({ pickup: true, delivery: false }, true)).toBe(true);
    expect(checkoutOpen({ pickup: true, delivery: false }, false)).toBe(false);
  });

  it("is paused with both off", () => {
    expect(checkoutOpen({ pickup: false, delivery: false }, true)).toBe(false);
  });
});

describe("methodOffMessage", () => {
  it("names the switched-off method, or the pause when both are off", () => {
    expect(methodOffMessage({ pickup: false, delivery: true }, "pickup")).toBe(PICKUP_OFF_MESSAGE);
    expect(methodOffMessage({ pickup: false, delivery: true }, "delivery")).toBeNull();
    expect(methodOffMessage({ pickup: true, delivery: false }, "delivery")).toBe(
      DELIVERY_OFF_MESSAGE,
    );
    expect(methodOffMessage({ pickup: false, delivery: false }, "delivery")).toBe(
      CHECKOUT_PAUSED_MESSAGE,
    );
  });

  it("matches the backend's refusal text verbatim", () => {
    expect(PICKUP_OFF_MESSAGE).toBe(
      "Pickup is currently unavailable. Please choose delivery or contact us.",
    );
    expect(DELIVERY_OFF_MESSAGE).toBe(
      "Delivery is currently unavailable. Please choose pickup or contact us.",
    );
    expect(CHECKOUT_PAUSED_MESSAGE).toBe(
      "We're not taking orders online right now. Please contact us to place your order.",
    );
  });
});
