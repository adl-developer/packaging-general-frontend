import { describe, expect, it } from "vitest";
import { specLines } from "./map-cart";

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
