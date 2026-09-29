import { describe, expect, it } from "vitest";
import {
  notEnoughStockMessage,
  restockSummary,
  validateRestockContact,
} from "./restock";
import { isDeadVariantError, isInsufficientInventoryError } from "./cart-errors";
import { shortfall } from "./stock-rules";

describe("validateRestockContact", () => {
  const ok = { name: " Ama Mensah ", email: " Ama@Shop.GH ", phone: "024 123 4567" };

  it("accepts and normalises a complete contact", () => {
    expect(validateRestockContact(ok)).toEqual({
      ok: true,
      contact: { name: "Ama Mensah", email: "ama@shop.gh", phone: "024 123 4567" },
    });
  });

  it("requires every field", () => {
    expect(validateRestockContact({ ...ok, name: " " })).toMatchObject({ ok: false });
    expect(validateRestockContact({ ...ok, email: "" })).toMatchObject({ ok: false });
    expect(validateRestockContact({ ...ok, phone: "" })).toMatchObject({ ok: false });
  });

  it("rejects a bad email or phone", () => {
    expect(validateRestockContact({ ...ok, email: "not-an-email" })).toMatchObject({ ok: false });
    expect(validateRestockContact({ ...ok, phone: "call me" })).toMatchObject({ ok: false });
  });
});

describe("customer-facing copy", () => {
  it("never states how many are in stock", () => {
    const msg = notEnoughStockMessage({ productTitle: "Everyday Box", quantity: 1000 });
    expect(msg).toBe("We don't have enough Everyday Box in stock for 1,000 units right now.");
    expect(msg).not.toMatch(/\b(790|only|left|available)\b/i);
    expect(msg).not.toContain("—");
  });

  it("summarises the request", () => {
    expect(
      restockSummary({ variantId: "v", quantity: 1, productTitle: "Tape", variantLabel: null }),
    ).toBe("1 unit of Tape");
    expect(
      restockSummary({ variantId: "v", quantity: 800, productTitle: "Everyday Box", variantLabel: "Size: Large" }),
    ).toBe("800 units of Everyday Box (Size: Large)");
  });
});

describe("isInsufficientInventoryError", () => {
  it("matches Medusa's wording and not other errors", () => {
    expect(isInsufficientInventoryError({ message: "Some variant does not have the required inventory" })).toBe(true);
    expect(isInsufficientInventoryError({ message: "Cart is already completed" })).toBe(false);
    expect(isInsufficientInventoryError(null)).toBe(false);
    // The two line-level errors stay distinct.
    expect(isDeadVariantError({ message: "Some variant does not have the required inventory" })).toBe(false);
  });
});

describe("the product page's 'not enough stock' check", () => {
  it("is short only when the quantity exceeds a known stock level", () => {
    expect(shortfall(1000, { purchasable: true, available: 790 })).not.toBeNull();
    expect(shortfall(700, { purchasable: true, available: 790 })).toBeNull();
    expect(shortfall(10_000, { purchasable: true, available: null })).toBeNull(); // untracked: fail open
  });
});
