import { describe, expect, it } from "vitest";
import {
  buildShopCategories,
  type StoreCategorySummary,
} from "./shop-categories";

const cat = (over: Partial<StoreCategorySummary>): StoreCategorySummary => ({
  id: "cat_x",
  name: "Gift Boxes",
  handle: "gift-boxes",
  description: null,
  rank: 0,
  metadata: null,
  ...over,
});

/** The live catalog, reduced to what the combiner reads. */
const CATALOG = [
  { slug: "rsc-carton", category: "RSC Cartons" },
  { slug: "yam-box", category: "Die Cut Boxes" },
  { slug: "archive-box", category: "Die Cut Boxes" },
  { slug: "pizza-box", category: "Food Packaging" },
  { slug: "food-box", category: "Food Packaging" },
  { slug: "bopp-tape", category: "Packaging Accessories" },
  { slug: "wrap", category: "Packaging Accessories" },
];

/** The 4 imported categories exactly as the import left them: no rank, no
 *  description, no metadata. */
const IMPORTED = [
  cat({ id: "c_d", name: "Die Cut Boxes", handle: "die-cut-boxes" }),
  cat({ id: "c_p", name: "Packaging Accessories", handle: "packaging-accessories" }),
  cat({ id: "c_r", name: "RSC Cartons", handle: "rsc-cartons" }),
  cat({ id: "c_f", name: "Food Packaging", handle: "food-packaging" }),
];

describe("buildShopCategories", () => {
  // The load-bearing test: with the exact data that exists in production
  // today, the data-driven browse must render what the hard-coded list did.
  it("reproduces the legacy browse from bare imported categories", () => {
    const cards = buildShopCategories(IMPORTED, CATALOG);

    expect(cards.map((c) => c.slug)).toEqual([
      "rsc-cartons",
      "die-cut-boxes",
      "food-packaging",
      "packaging-accessories",
    ]);
    // RSC Cartons has ONE product → straight to its customizer (the old
    // hard-coded special case, now a data rule).
    expect(cards[0].href).toBe("/products/rsc-carton");
    expect(cards[1].href).toBe("/products/category/die-cut-boxes");
    // Canonical copy fills the empty descriptions.
    expect(cards[0].description).toMatch(/Regular slotted container/);
    expect(cards[2].description).toMatch(/pizza boxes/);
    // RSC keeps its custom icon while nothing is stored.
    expect(cards[0].iconKey).toBe("rsc-carton");
    expect(cards[1].iconKey).toBe("scissors");
    expect(cards[2].iconKey).toBe("utensils");
    expect(cards[3].iconKey).toBe("layers");
  });

  it("hides a category with no products in the catalog", () => {
    const cards = buildShopCategories(
      [...IMPORTED, cat({ id: "c_new", name: "Gift Boxes", handle: "gift-boxes" })],
      CATALOG,
    );
    expect(cards.map((c) => c.slug)).not.toContain("gift-boxes");
  });

  it("shows a new category once it has a product, linking direct when single", () => {
    const cards = buildShopCategories(
      [cat({ name: "Gift Boxes", handle: "gift-boxes" })],
      [{ slug: "ribbon-box", category: "Gift Boxes" }],
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].href).toBe("/products/ribbon-box");
    expect(cards[0].title).toBe("Gift Boxes");
    // No canonical entry, nothing stored → default icon, empty description.
    expect(cards[0].iconKey).toBe("package");
    expect(cards[0].description).toBe("");
  });

  it("prefers stored description and icon over the canonical fallback", () => {
    const cards = buildShopCategories(
      [
        cat({
          name: "Food Packaging",
          handle: "food-packaging",
          description: "Fresh copy from the admin.",
          metadata: { icon: "tag" },
        }),
      ],
      CATALOG,
    );
    expect(cards[0].description).toBe("Fresh copy from the admin.");
    expect(cards[0].iconKey).toBe("tag");
  });

  it("ignores an unknown stored icon key", () => {
    const cards = buildShopCategories(
      [cat({ name: "Food Packaging", handle: "food-packaging", metadata: { icon: "rocket" } })],
      CATALOG,
    );
    expect(cards[0].iconKey).toBe("utensils");
  });

  it("orders by rank when ranks are distinct, ignoring the canonical order", () => {
    const cards = buildShopCategories(
      [
        cat({ id: "c_f", name: "Food Packaging", handle: "food-packaging", rank: 1 }),
        cat({ id: "c_r", name: "RSC Cartons", handle: "rsc-cartons", rank: 2 }),
      ],
      CATALOG,
    );
    expect(cards.map((c) => c.slug)).toEqual(["food-packaging", "rsc-cartons"]);
  });

  it("matches products to categories by name, not handle", () => {
    const cards = buildShopCategories(
      [cat({ name: "Renamed Food", handle: "food-packaging" })],
      CATALOG,
    );
    // The products still say "Food Packaging", so the renamed category is
    // empty until the catalog cache refreshes — hidden, not broken.
    expect(cards).toEqual([]);
  });
});
