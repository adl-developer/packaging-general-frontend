import { describe, expect, it } from "vitest";
import {
  parseMoqTiers,
  tierFor,
  tieredUnitPrice,
  type MoqTier,
} from "./moq-tiers";

// The Figma reference ladder (3833:14081): 50-199 ×1.2, 200-499 ×1.0,
// 500-999 ×0.9, 1000+ ×0.8.
const TIERS: MoqTier[] = [
  { minQuantity: 50, maxQuantity: 199, priceMultiplier: 1.2, label: "50-199 units" },
  { minQuantity: 200, maxQuantity: 499, priceMultiplier: 1, label: "200-499 units" },
  { minQuantity: 500, maxQuantity: 999, priceMultiplier: 0.9, label: "500-999 units" },
  { minQuantity: 1000, maxQuantity: null, priceMultiplier: 0.8, label: "1000+ units" },
];

describe("parseMoqTiers", () => {
  it("returns [] for non-arrays — every catalog product carries tiers: []", () => {
    expect(parseMoqTiers(undefined)).toEqual([]);
    expect(parseMoqTiers(null)).toEqual([]);
    expect(parseMoqTiers("x")).toEqual([]);
  });

  it("round-trips what the backend writes, sorted ascending", () => {
    expect(parseMoqTiers([TIERS[2], TIERS[0], TIERS[3], TIERS[1]])).toEqual(TIERS);
  });

  it("drops malformed entries rather than producing NaN prices", () => {
    expect(
      parseMoqTiers([
        { minQuantity: 0, priceMultiplier: 1 },
        { minQuantity: 10, priceMultiplier: 0 },
        { minQuantity: 10, maxQuantity: 5, priceMultiplier: 1 },
        "junk",
      ]),
    ).toEqual([]);
  });

  it("labels an unlabelled tier from its bracket", () => {
    expect(
      parseMoqTiers([{ minQuantity: 1000, maxQuantity: null, priceMultiplier: 0.8 }]),
    ).toEqual([
      { minQuantity: 1000, maxQuantity: null, priceMultiplier: 0.8, label: "1000+ units" },
    ]);
  });
});

describe("tierFor", () => {
  it("is null below the first tier — the base price applies", () => {
    expect(tierFor(TIERS, 49)).toBeNull();
    expect(tierFor(TIERS, 0)).toBeNull();
  });

  it("matches brackets inclusively and open ends upward", () => {
    expect(tierFor(TIERS, 50)?.label).toBe("50-199 units");
    expect(tierFor(TIERS, 199)?.label).toBe("50-199 units");
    expect(tierFor(TIERS, 99999)?.label).toBe("1000+ units");
  });
});

describe("tieredUnitPrice", () => {
  it("returns the base price when no tier matches", () => {
    expect(tieredUnitPrice(4.5, TIERS, 10)).toBe(4.5);
    expect(tieredUnitPrice(4.5, [], 500)).toBe(4.5);
  });

  it("applies the matching multiplier", () => {
    expect(tieredUnitPrice(10, TIERS, 60)).toBe(12);
    expect(tieredUnitPrice(10, TIERS, 500)).toBe(9);
    expect(tieredUnitPrice(10, TIERS, 1500)).toBe(8);
  });

  // ⚠ Must round exactly like the backend's `utils/moq-tiers.ts`, or the
  // customizer displays one price and the cart charges another.
  it("rounds to 2dp the same way the backend does", () => {
    expect(tieredUnitPrice(5.365, TIERS, 500)).toBe(4.83);
    expect(tieredUnitPrice(0.99, TIERS, 1000)).toBe(0.79);
  });
});
