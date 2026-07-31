import { describe, expect, it } from "vitest";
import { decideBuyNowRoute, isPrefillComplete } from "./buy-now";

/**
 * Pure routing-decision tests for Buy Now
 * (docs/superpowers/specs/2026-07-31-buy-now-design.md §3/§4/§7).
 *
 * decideBuyNowRoute takes the already-resolved booleans/count so the ONE hard
 * rule set (signed-in gate, single-cart honesty, complete-prefill gate) is
 * testable without touching Medusa, cookies, or getCustomer().
 */
describe("decideBuyNowRoute", () => {
  it("refuses when signed out, regardless of cart state or prefill", () => {
    expect(decideBuyNowRoute(false, 0, true)).toBe("refused");
    expect(decideBuyNowRoute(false, 3, false)).toBe("refused");
  });

  it("empty cart + complete prefill goes straight to payment", () => {
    expect(decideBuyNowRoute(true, 0, true)).toBe("payment");
  });

  it("empty cart + incomplete prefill goes to delivery instead of payment", () => {
    expect(decideBuyNowRoute(true, 0, false)).toBe("delivery");
  });

  it("a non-empty cart ALWAYS gets cart-with-notice, even with a complete prefill — never silently pays for other items", () => {
    expect(decideBuyNowRoute(true, 1, true)).toBe("cart-with-notice");
    expect(decideBuyNowRoute(true, 5, false)).toBe("cart-with-notice");
  });
});

describe("isPrefillComplete", () => {
  const base = {
    address: "12 Ring Road East",
    contactPhone: "+233201234567",
    deliveryPhone: "+233201234567",
  };

  it("is true when an address and at least one phone are present", () => {
    expect(isPrefillComplete(base)).toBe(true);
  });

  it("is false when the address is missing", () => {
    expect(isPrefillComplete({ ...base, address: "" })).toBe(false);
  });

  it("is false when both phone fields are missing", () => {
    expect(
      isPrefillComplete({ ...base, contactPhone: "", deliveryPhone: "" }),
    ).toBe(false);
  });

  it("accepts a delivery-only phone (contact phone may be blank)", () => {
    expect(isPrefillComplete({ ...base, contactPhone: "" })).toBe(true);
  });

  it("accepts a contact-only phone (delivery phone may be blank)", () => {
    expect(isPrefillComplete({ ...base, deliveryPhone: "" })).toBe(true);
  });
});
