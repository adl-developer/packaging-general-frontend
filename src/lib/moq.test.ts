import { describe, expect, it } from "vitest";
import { cartBelowMoqMessage, cartLinesBelowMoq, productMoq } from "./moq";
import { mapLineItem } from "@/app/(shop)/cart/map-cart";

const line = (
  title: string,
  quantity: number,
  moq?: unknown,
  extra: Record<string, unknown> = {},
) => ({
  product_title: title,
  quantity,
  metadata: null,
  product: { metadata: moq === undefined ? {} : { moq } },
  ...extra,
});

describe("productMoq", () => {
  it("reads whole minimums and treats anything else as 1", () => {
    expect(productMoq({ moq: 10 })).toBe(10);
    expect(productMoq({ moq: "50" })).toBe(50);
    for (const m of [undefined, null, 0, -3, "abc"]) {
      expect(productMoq({ moq: m })).toBe(1);
    }
    expect(productMoq(null)).toBe(1);
  });
});

describe("cartLinesBelowMoq", () => {
  it("flags the reported order: 5 + 5 of two box types with a minimum of 10", () => {
    const below = cartLinesBelowMoq([line("Keeper", 5, 10), line("Mega Box", 5, 10)]);
    expect(below).toEqual([
      { name: "Keeper", moq: 10, quantity: 5 },
      { name: "Mega Box", moq: 10, quantity: 5 },
    ]);
    expect(cartBelowMoqMessage(below)).toContain(
      "Keeper (minimum 10 units), Mega Box (minimum 10 units)",
    );
  });

  it("passes lines at or above the minimum, and products without one", () => {
    expect(cartLinesBelowMoq([line("Keeper", 10, 10), line("Tape", 1)])).toEqual([]);
  });

  it("never flags the platform fee or a service line", () => {
    expect(
      cartLinesBelowMoq([
        line("Fee", 1, 10, { metadata: { pg_platform_fee: true } }),
        line("Setup", 1, 10, { product: { metadata: { moq: 10, service: true } } }),
      ]),
    ).toEqual([]);
  });
});

describe("mapLineItem moq", () => {
  it("carries the product's minimum onto the cart line", () => {
    const item = mapLineItem({
      id: "li_1",
      quantity: 5,
      unit_price: 16.77,
      product_title: "Keeper",
      product: { metadata: { moq: 10 } },
    } as never);
    expect(item.moq).toBe(10);
  });
});
