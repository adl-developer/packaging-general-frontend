import { describe, expect, it } from "vitest";
import {
  activeVariants,
  archivedOnlyValues,
  resolveCombo,
  toFullProduct,
  toSummary,
  variantOptionMap,
} from "./products";

const variant = (opts: Record<string, string>) => ({
  id: "v1",
  options: Object.entries(opts).map(([title, value]) => ({
    value,
    option: { title },
  })),
}) as never;

describe("variantOptionMap", () => {
  it("keys values by option title", () => {
    expect(variantOptionMap(variant({ Size: "24mm", Material: "Clear" }))).toEqual({
      Size: "24mm",
      Material: "Clear",
    });
  });
  it("skips entries missing a title or value", () => {
    const v = {
      id: "v1",
      options: [{ value: "24mm", option: null }, { value: "", option: { title: "Size" } }],
    } as never;
    expect(variantOptionMap(v)).toEqual({});
  });
});

describe("resolveCombo", () => {
  const product = {
    combos: [
      { sizeId: "24mm", materialId: "Clear", printingId: "", variantId: "v1", unitPrice: 5 },
      { sizeId: "48mm", materialId: "Clear", printingId: "", variantId: "v2", unitPrice: 8 },
    ],
  } as never;
  it("matches on the full selection", () => {
    expect(resolveCombo(product, "48mm", "Clear", "")?.variantId).toBe("v2");
  });
  it("returns undefined for an unavailable combination", () => {
    expect(resolveCombo(product, "48mm", "Brown", "")).toBeUndefined();
  });
});

describe("archived variants (2026-10-05)", () => {
  const v = (id: string, metadata: Record<string, unknown> | null) =>
    ({ id, metadata, options: [], calculated_price: { calculated_amount: 10 } });
  const product = (variants: unknown[]) =>
    ({
      id: "p1",
      handle: "pizza-box",
      title: "Pizza Box",
      metadata: {},
      categories: [],
      images: [],
      variants,
    }) as never;

  it("activeVariants drops only variants flagged pg_archived: true", () => {
    expect(
      activeVariants([
        v("a", { pg_archived: true }),
        v("b", null),
        v("c", { pg_archived: false }),
      ]).map((x) => x.id),
    ).toEqual(["b", "c"]);
    expect(activeVariants(undefined)).toEqual([]);
  });

  it("an archived variant is not part of a product's sellable variants", () => {
    const summary = toSummary(
      product([v("a", { pg_archived: true }), v("b", null)]),
    );
    expect(summary.variantIds).toEqual(["b"]);
  });
});

describe("archived-only option values (2026-10-06)", () => {
  const v = (id: string, size: string, archived: boolean) =>
    ({
      id,
      metadata: archived ? { pg_archived: true } : null,
      options: [{ value: size, option: { title: "Dimensions" } }],
      calculated_price: { calculated_amount: 10 },
    }) as never;
  const variants = [v("a", "26 mm", true), v("b", "30 mm", false), v("c", "40 mm", true), v("d", "40 mm", false)];

  it("lists a value only archived variants use, not one a live variant shares", () => {
    const retired = archivedOnlyValues(variants);
    expect([...(retired.get("Dimensions") ?? [])]).toEqual(["26 mm"]);
  });

  it("is empty when nothing is archived", () => {
    expect(archivedOnlyValues([v("b", "30 mm", false)]).size).toBe(0);
  });

  it("drops the retired value from the product page's attributes", () => {
    const full = toFullProduct({
      id: "p1",
      handle: "box",
      title: "Box",
      metadata: {
        pg_attributes: [
          {
            section: "size",
            name: "Dimensions",
            kind: "text_options",
            values: [{ value: "26 mm" }, { value: "30 mm" }, { value: "40 mm" }],
          },
        ],
      },
      categories: [],
      images: [],
      variants,
    } as never);
    expect(full.attributes[0].values.map((x) => x.label)).toEqual(["30 mm", "40 mm"]);
  });
});
