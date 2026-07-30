import { describe, expect, it } from "vitest";
import { familyOutOfStock, isPurchasable, shortfall } from "./stock-rules";

describe("isPurchasable", () => {
  it("unmanaged variants are always purchasable even at zero", () => {
    expect(isPurchasable({ manage_inventory: false, allow_backorder: false, inventory_quantity: 0 })).toBe(true);
  });
  it("backorder beats zero stock", () => {
    expect(isPurchasable({ manage_inventory: true, allow_backorder: true, inventory_quantity: 0 })).toBe(true);
  });
  it("managed with stock is purchasable", () => {
    expect(isPurchasable({ manage_inventory: true, allow_backorder: false, inventory_quantity: 5 })).toBe(true);
  });
  it("managed at zero is NOT purchasable", () => {
    expect(isPurchasable({ manage_inventory: true, allow_backorder: false, inventory_quantity: 0 })).toBe(false);
  });
  it("missing quantity is treated as zero, not as unknown", () => {
    expect(isPurchasable({ manage_inventory: true, allow_backorder: false })).toBe(false);
  });
  it("null manage_inventory is treated as managed", () => {
    expect(isPurchasable({ manage_inventory: null, allow_backorder: null, inventory_quantity: 0 })).toBe(false);
  });
});

describe("familyOutOfStock", () => {
  it("is false when any variant is purchasable", () => {
    expect(familyOutOfStock([{ purchasable: false, available: 0 }, { purchasable: true, available: 3 }])).toBe(false);
  });
  it("is true only when every variant is out", () => {
    expect(familyOutOfStock([{ purchasable: false, available: 0 }, { purchasable: false, available: 0 }])).toBe(true);
  });
  it("is false for an empty list — unknown must never read as out of stock", () => {
    expect(familyOutOfStock([])).toBe(false);
  });
});

describe("shortfall", () => {
  it("returns null when the line fits", () => {
    expect(shortfall(5, { purchasable: true, available: 10 })).toBeNull();
  });
  it("returns the reduce-to target when the line exceeds stock", () => {
    expect(shortfall(50, { purchasable: true, available: 10 })).toEqual({ reduceTo: 10 });
  });
  it("returns reduceTo 0 when out of stock entirely", () => {
    expect(shortfall(5, { purchasable: false, available: 0 })).toEqual({ reduceTo: 0 });
  });
  it("never flags a line whose availability is unknown", () => {
    expect(shortfall(999, { purchasable: true, available: null })).toBeNull();
  });
});
