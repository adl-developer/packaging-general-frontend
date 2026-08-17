import { describe, expect, it } from "vitest";
import { parseAttributes, resolveOptionsMatch } from "./attributes";

const meta = [
  {
    section: "size", name: "Dimensions", kind: "dimensions", metrics: ["mm"],
    values: [{ value: "48 × 30 × 30 mm", length: 48, width: 30, height: 30, metric: "mm" }],
  },
  {
    section: "material", name: "Board grade", kind: "text_options",
    values: [{ value: "Single wall" }, { value: "Double wall", description: "Sturdier" }],
  },
];

describe("parseAttributes", () => {
  it("parses well-formed pg_attributes", () => {
    const parsed = parseAttributes(meta);
    expect(parsed).toHaveLength(2);
    expect(parsed[1].values[1]).toMatchObject({ id: "Double wall", label: "Double wall", description: "Sturdier" });
  });
  it("returns [] for junk (legacy fallback trigger)", () => {
    expect(parseAttributes(undefined)).toEqual([]);
    expect(parseAttributes("nope")).toEqual([]);
    expect(parseAttributes([{ name: 1 }])).toEqual([]);
  });
  it("drops values with empty labels but keeps the attribute", () => {
    const parsed = parseAttributes([{ ...meta[1], values: [{ value: " " }, { value: "Kraft" }] }]);
    expect(parsed[0].values.map((v) => v.id)).toEqual(["Kraft"]);
  });
});

describe("resolveOptionsMatch", () => {
  const combos = [
    { options: { Dimensions: "48 × 30 × 30 mm", "Board grade": "Single wall" }, variantId: "v1", unitPrice: 12.5 },
    { options: { Dimensions: "48 × 30 × 30 mm", "Board grade": "Double wall" }, variantId: "v2", unitPrice: 16 },
  ];
  it("matches when every attribute agrees (missing = empty string)", () => {
    expect(resolveOptionsMatch(combos, { Dimensions: "48 × 30 × 30 mm", "Board grade": "Double wall" })?.variantId).toBe("v2");
  });
  it("returns undefined on partial mismatch instead of first-match", () => {
    expect(resolveOptionsMatch(combos, { Dimensions: "24 × 30 × 30 mm", "Board grade": "Single wall" })).toBeUndefined();
  });
  it("ignores attributes absent from both selection and variant", () => {
    expect(resolveOptionsMatch(combos, { Dimensions: "48 × 30 × 30 mm", "Board grade": "Single wall", Window: "" })?.variantId).toBe("v1");
  });
});
