import { describe, expect, it } from "vitest";
import { lineTaxRate, specLines, TAX_RATE } from "./map-cart";

describe("lineTaxRate", () => {
  it("sums the percentages Medusa applied to the line", () => {
    expect(
      lineTaxRate({ tax_lines: [{ rate: 20 }] as never }),
    ).toBe(0.2);
    expect(
      lineTaxRate({ tax_lines: [{ rate: 15 }, { rate: 2.5 }, { rate: 2.5 }] as never }),
    ).toBe(0.2);
  });

  // The admin may set every levy to 0 (allowed since 2026-09-22); the system
  // tax provider still emits a rate-0 line, and the cart must show no tax.
  it("returns 0 for a fetched rate-0 line instead of the statutory fallback", () => {
    expect(lineTaxRate({ tax_lines: [{ rate: 0 }] as never })).toBe(0);
  });

  it("falls back to the statutory rate when tax lines were not fetched", () => {
    expect(lineTaxRate({})).toBe(TAX_RATE);
    expect(lineTaxRate({ tax_lines: undefined })).toBe(TAX_RATE);
    expect(lineTaxRate({ tax_lines: [] })).toBe(TAX_RATE);
  });

  it("ignores a malformed rate rather than producing NaN", () => {
    expect(
      lineTaxRate({ tax_lines: [{ rate: "abc" }, { rate: 5 }] as never }),
    ).toBe(0.05);
  });
});

describe("specLines", () => {
  it("keeps the legacy trio order first, then new titles alphabetically", () => {
    const byOption = new Map([
      ["Window", "No window"],
      ["Material", "Kraft"],
      ["Size", "48mm"],
      ["Board grade", "Single wall"],
    ]);
    expect(specLines(byOption, (k) => k)).toEqual([
      "Size: 48mm",
      "Material: Kraft",
      "Board grade: Single wall",
      "Window: No window",
    ]);
  });
  it("falls back to variant title when there are no options", () => {
    expect(specLines(new Map(), (k) => k)).toEqual([]);
  });
});
