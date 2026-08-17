import { describe, expect, it } from "vitest";
import { resolveCombo, variantOptionMap } from "./products";

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
