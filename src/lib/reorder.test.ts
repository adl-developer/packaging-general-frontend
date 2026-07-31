import { describe, expect, it } from "vitest";
import { reconcileReorder, buildReorderMessage, type ReorderLine } from "./reorder";
import type { StockState } from "./stock-rules";

const line = (overrides: Partial<ReorderLine> = {}): ReorderLine => ({
  variantId: "variant_1",
  productId: "product_1",
  name: "RSC Carton 400x400x400",
  quantity: 10,
  isService: false,
  ...overrides,
});

const stock = (entries: Array<[string, StockState]>) => new Map(entries);

describe("reconcileReorder", () => {
  it("clean reorder — everything fits, nothing capped or skipped", () => {
    const lines = [line({ variantId: "v1", quantity: 10 })];
    const stockMap = stock([["v1", { purchasable: true, available: 50 }]]);

    const result = reconcileReorder(lines, stockMap);

    expect(result.linesToAdd).toEqual([
      { variantId: "v1", name: line().name, addQuantity: 10, existingQuantity: 0 },
    ]);
    expect(result.cappedLines).toEqual([]);
    expect(result.skippedLines).toEqual([]);
  });

  it("caps a line whose quantity exceeds available stock", () => {
    const lines = [line({ variantId: "v1", quantity: 10, name: "Pizza Box" })];
    const stockMap = stock([["v1", { purchasable: true, available: 4 }]]);

    const result = reconcileReorder(lines, stockMap);

    expect(result.linesToAdd).toEqual([
      { variantId: "v1", name: "Pizza Box", addQuantity: 4, existingQuantity: 0 },
    ]);
    expect(result.cappedLines).toEqual([
      { variantId: "v1", name: "Pizza Box", requestedQuantity: 10, addedQuantity: 4 },
    ]);
    expect(result.skippedLines).toEqual([]);
  });

  it("skips a line that is fully out of stock", () => {
    const lines = [line({ variantId: "v1", quantity: 10, name: "Food Box" })];
    const stockMap = stock([["v1", { purchasable: false, available: 0 }]]);

    const result = reconcileReorder(lines, stockMap);

    expect(result.linesToAdd).toEqual([]);
    expect(result.cappedLines).toEqual([]);
    expect(result.skippedLines).toEqual([{ variantId: "v1", name: "Food Box" }]);
  });

  it("excludes service lines (e.g. the Printing Setup Fee) entirely", () => {
    const lines = [
      line({ variantId: "v1", quantity: 5 }),
      line({
        variantId: "v-service",
        quantity: 1,
        name: "Printing Setup Fee",
        isService: true,
      }),
    ];
    const stockMap = stock([["v1", { purchasable: true, available: 50 }]]);

    const result = reconcileReorder(lines, stockMap);

    expect(result.linesToAdd).toEqual([
      { variantId: "v1", name: line().name, addQuantity: 5, existingQuantity: 0 },
    ]);
    // The service line must never appear in any bucket.
    expect(result.linesToAdd.some((l) => l.variantId === "v-service")).toBe(false);
    expect(result.cappedLines).toEqual([]);
    expect(result.skippedLines).toEqual([]);
  });

  it("increments a variant already in the cart, then applies the same cap", () => {
    const lines = [line({ variantId: "v1", quantity: 10, name: "RSC Carton" })];
    const stockMap = stock([["v1", { purchasable: true, available: 12 }]]);
    const existingCartLines = [{ variantId: "v1", quantity: 5 }];

    const result = reconcileReorder(lines, stockMap, existingCartLines);

    // 5 existing + 10 requested = 15 desired, capped to 12 available ->
    // only 7 more can be added on top of the 5 already in the cart.
    expect(result.linesToAdd).toEqual([
      { variantId: "v1", name: "RSC Carton", addQuantity: 7, existingQuantity: 5 },
    ]);
    expect(result.cappedLines).toEqual([
      { variantId: "v1", name: "RSC Carton", requestedQuantity: 10, addedQuantity: 7 },
    ]);
    expect(result.skippedLines).toEqual([]);
  });

  it("an empty order reconciles to nothing", () => {
    const result = reconcileReorder([], new Map());
    expect(result.linesToAdd).toEqual([]);
    expect(result.cappedLines).toEqual([]);
    expect(result.skippedLines).toEqual([]);
  });

  it("treats an unknown stock state as in-stock (fail open)", () => {
    const lines = [line({ variantId: "v-unknown", quantity: 3 })];
    const result = reconcileReorder(lines, new Map());
    expect(result.linesToAdd).toEqual([
      { variantId: "v-unknown", name: line().name, addQuantity: 3, existingQuantity: 0 },
    ]);
    expect(result.cappedLines).toEqual([]);
    expect(result.skippedLines).toEqual([]);
  });

  it("never flags unmanaged/backorder variants (available: null) as short", () => {
    const lines = [line({ variantId: "v1", quantity: 500 })];
    const stockMap = stock([["v1", { purchasable: true, available: null }]]);
    const result = reconcileReorder(lines, stockMap);
    expect(result.linesToAdd).toEqual([
      { variantId: "v1", name: line().name, addQuantity: 500, existingQuantity: 0 },
    ]);
    expect(result.cappedLines).toEqual([]);
    expect(result.skippedLines).toEqual([]);
  });
});

describe("buildReorderMessage", () => {
  it("returns null for a clean reorder (no banner needed)", () => {
    const message = buildReorderMessage({
      linesToAdd: [{ variantId: "v1", name: "X", addQuantity: 2, existingQuantity: 0 }],
      cappedLines: [],
      skippedLines: [],
    });
    expect(message).toBeNull();
  });

  it("reports added + capped counts", () => {
    const message = buildReorderMessage({
      linesToAdd: [
        { variantId: "v1", name: "X", addQuantity: 2, existingQuantity: 0 },
        { variantId: "v2", name: "Y", addQuantity: 4, existingQuantity: 0 },
      ],
      cappedLines: [
        { variantId: "v2", name: "Y", requestedQuantity: 10, addedQuantity: 4 },
      ],
      skippedLines: [],
    });
    expect(message).toBe(
      "2 items added. 1 item was reduced to the quantity we have available.",
    );
  });

  it("reports skipped items by name", () => {
    const message = buildReorderMessage({
      linesToAdd: [],
      cappedLines: [],
      skippedLines: [{ variantId: "v1", name: "Food Box" }],
    });
    expect(message).toBe(
      "1 item is out of stock and was not added: Food Box.",
    );
  });
});
