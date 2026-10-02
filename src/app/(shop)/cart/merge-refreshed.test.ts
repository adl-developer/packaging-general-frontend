import { describe, expect, it } from "vitest";
import { mergeRefreshedItems } from "./merge-refreshed";
import type { CartItem } from "./map-cart";

const item = (over: Partial<CartItem>): CartItem => ({
  id: "li_1",
  name: "Mega Box",
  specs: [],
  unitPrice: 50,
  taxRate: 0.2,
  quantity: 2,
  isService: false,
  ...over,
});

describe("mergeRefreshedItems (cart change notice, 2026-10-02)", () => {
  it("takes the refreshed price for a line", () => {
    const merged = mergeRefreshedItems([item({ unitPrice: 50 })], [item({ unitPrice: 55 })], new Set());
    expect(merged).toEqual([item({ unitPrice: 55 })]);
  });

  it("keeps the customer's quantity on a line they are still changing", () => {
    const merged = mergeRefreshedItems(
      [item({ quantity: 7 })],
      [item({ unitPrice: 55, quantity: 2 })],
      new Set(["li_1"]),
    );
    expect(merged).toEqual([item({ unitPrice: 55, quantity: 7 })]);
  });

  it("keeps a line the refresh doesn't know (an optimistic add in flight)", () => {
    const pending = item({ id: "optimistic-1" });
    expect(mergeRefreshedItems([pending], [], new Set())).toEqual([pending]);
  });

  it("replaces the platform fee line with the refreshed one", () => {
    const oldFee = item({ id: "fee_old", isPlatformFee: true, isService: true, unitPrice: 5, quantity: 1 });
    const newFee = item({ id: "fee_new", isPlatformFee: true, isService: true, unitPrice: 6, quantity: 1 });
    const merged = mergeRefreshedItems([item({}), oldFee], [item({}), newFee], new Set());
    expect(merged).toEqual([item({}), newFee]);
  });
});
