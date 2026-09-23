import { describe, expect, it } from "vitest";
import { addressLine, chosenMethod, isPickupCart } from "./fulfillment";

describe("isPickupCart", () => {
  it("reads the cart's recorded choice", () => {
    expect(isPickupCart({ fulfillment_method: "pickup" }, null)).toBe(true);
    expect(isPickupCart({ fulfillment_method: "delivery" }, null)).toBe(false);
  });
  it("reads the backend's pickup-point address marker", () => {
    expect(isPickupCart(null, { pickup: true })).toBe(true);
  });
  it("is false for an ordinary delivery cart", () => {
    expect(isPickupCart({ company_name: "Acme" }, { lat: 5.6 })).toBe(false);
    expect(isPickupCart(undefined, undefined)).toBe(false);
  });
});

describe("chosenMethod", () => {
  it("returns only the two known values", () => {
    expect(chosenMethod({ fulfillment_method: "pickup" })).toBe("pickup");
    expect(chosenMethod({ fulfillment_method: "delivery" })).toBe("delivery");
    expect(chosenMethod({ fulfillment_method: "drone" })).toBeNull();
    expect(chosenMethod(null)).toBeNull();
  });
});

describe("addressLine", () => {
  it("never repeats the city", () => {
    expect(addressLine("FON Packaging, Spintex Road, Accra, Ghana", "Accra")).toBe(
      "FON Packaging, Spintex Road, Accra, Ghana",
    );
    expect(addressLine("12 Spintex Rd", "Accra")).toBe("12 Spintex Rd, Accra");
  });
});
