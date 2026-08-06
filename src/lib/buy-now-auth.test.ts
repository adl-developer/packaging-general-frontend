import { describe, expect, it } from "vitest";
import {
  ITEM_ERROR,
  panelFor,
  parseBuyNowItem,
  type BuyNowAuthState,
} from "./buy-now-auth";

/**
 * Pure helpers behind the signed-out Buy Now modal
 * (docs/superpowers/specs/2026-08-06-buy-now-signed-out-design.md).
 *
 * parseBuyNowItem is the money path's front door: the item payload arrives as
 * hidden form fields (strings), so it is parsed and validated here, once,
 * away from Medusa and cookies.
 */
describe("parseBuyNowItem", () => {
  const raw = {
    variantId: "variant_01ABC",
    quantity: "50",
    setupPrintingValue: "full-colour",
    notes: "Handle with care",
  };

  it("parses a complete payload", () => {
    const result = parseBuyNowItem(raw);
    expect(result).toEqual({
      ok: true,
      item: {
        variantId: "variant_01ABC",
        quantity: 50,
        setupPrintingValue: "full-colour",
        notes: "Handle with care",
      },
    });
  });

  it("drops blank optional fields rather than sending empty strings", () => {
    const result = parseBuyNowItem({
      ...raw,
      setupPrintingValue: "",
      notes: "   ",
    });
    expect(result).toEqual({
      ok: true,
      item: { variantId: "variant_01ABC", quantity: 50 },
    });
  });

  it("treats missing optional fields as absent", () => {
    const result = parseBuyNowItem({ variantId: "v_1", quantity: "1" });
    expect(result).toEqual({ ok: true, item: { variantId: "v_1", quantity: 1 } });
  });

  it("rejects a missing or blank variant id", () => {
    expect(parseBuyNowItem({ ...raw, variantId: "" })).toEqual({
      ok: false,
      error: ITEM_ERROR,
    });
    expect(parseBuyNowItem({ ...raw, variantId: "   " })).toEqual({
      ok: false,
      error: ITEM_ERROR,
    });
    expect(parseBuyNowItem({ ...raw, variantId: null })).toEqual({
      ok: false,
      error: ITEM_ERROR,
    });
  });

  it("rejects a quantity that is not a positive whole number", () => {
    for (const quantity of ["0", "-3", "2.5", "abc", "", null]) {
      expect(parseBuyNowItem({ ...raw, quantity })).toEqual({
        ok: false,
        error: ITEM_ERROR,
      });
    }
  });
});

describe("panelFor", () => {
  it("keeps the form visible while idle or erroring", () => {
    expect(panelFor({ status: "idle" })).toBe("form");
    expect(panelFor({ status: "error", error: "Invalid email or password." })).toBe(
      "form",
    );
  });

  it("shows the verify panel for both verification pauses", () => {
    expect(panelFor({ status: "unverified", email: "a@b.com" })).toBe("verify");
    expect(
      panelFor({
        status: "pending-verification",
        email: "a@b.com",
        itemSaved: true,
      }),
    ).toBe("verify");
  });

  it("hands off to the caller once the purchase can continue", () => {
    const state: BuyNowAuthState = { status: "continue", route: "payment" };
    expect(panelFor(state)).toBe("continue");
  });
});
