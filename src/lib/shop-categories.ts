/**
 * Pure combiner behind the data-driven category browse (2026-08-14; replaces
 * the hard-coded SHOP_CATEGORIES list). Categories come from Medusa — created
 * and edited on the admin portal's Categories subtab — and this module turns
 * them plus the live catalog into the cards the homepage and /products render.
 *
 * Client-safe and side-effect free on purpose (same rule as `moq-tiers.ts`):
 * the fetching lives in `categories.ts`, this file is the tested logic.
 *
 * Display rules (agreed 2026-08-14):
 *  - A category with NO products in the browsable catalog is hidden — a card
 *    must never lead to an empty page. (The admin screen states this rule.)
 *  - A category with exactly ONE product links straight to that product's
 *    page. This reproduces the old hard-coded RSC Cartons special case — one
 *    configurable product, card → customizer — as a data rule.
 *  - Products are matched to categories BY NAME (`ProductSummary.category`).
 *    After a rename, products follow within the catalog cache's ~5 minutes;
 *    in between the category reads as empty and is hidden, not broken.
 */

/** Icon keys the admin can store (mirrors the backend's CATEGORY_ICONS), plus
 *  `rsc-carton` — the storefront-only custom drawing used as RSC Cartons'
 *  fallback. It is not offered by the admin picker; a stored icon wins. */
export type CategoryIconKey =
  | "package"
  | "box"
  | "layers"
  | "scissors"
  | "utensils"
  | "tag"
  | "rsc-carton";

const STORABLE_ICONS: readonly string[] = [
  "package",
  "box",
  "layers",
  "scissors",
  "utensils",
  "tag",
];

/** What `getShopCategories` fetches per category — mirrors the Store API's
 *  `fields=id,name,handle,description,metadata,rank`. */
export type StoreCategorySummary = {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  rank: number | null;
  metadata: Record<string, unknown> | null;
};

export type CatalogProductLite = {
  /** Product handle — the customizer route is `/products/<slug>`. */
  slug: string;
  /** Category NAME, as `ProductSummary.category` carries it. */
  category: string;
};

/** One browse card. `medusaName` is what product rows are matched against. */
export type ShopCategoryData = {
  slug: string;
  medusaName: string;
  title: string;
  description: string;
  iconKey: CategoryIconKey;
  href: string;
};

/**
 * The original hard-coded card copy, now the fallback for categories that
 * haven't been edited in the admin yet. ⚠ Deliberately duplicated in
 * `admin/src/lib/category-canonical.ts`, which prefills the edit dialog with
 * the same words — stored data wins over both copies.
 */
const CANONICAL: Record<
  string,
  { description: string; iconKey: CategoryIconKey }
> = {
  "rsc-cartons": {
    description:
      "Regular slotted container cartons — 11 stock sizes in single or double wall, brown or white.",
    iconKey: "rsc-carton",
  },
  "die-cut-boxes": {
    description:
      "Purpose-cut boxes for produce and storage — yam, vegetable, mango, archive boxes and trays.",
    iconKey: "scissors",
  },
  "food-packaging": {
    description:
      "Food-safe boxes — pizza boxes from 10″ to 16″ and takeaway food boxes with or without window.",
    iconKey: "utensils",
  },
  "packaging-accessories": {
    description:
      "Everything that seals and protects — BOPP tape, stretch and bubble wrap, shredded paper.",
    iconKey: "layers",
  },
};

/** Rank-tie order for the untouched import (all ranks 0) — the curated legacy
 *  card order. One deliberate reorder in the admin renumbers ranks distinctly
 *  and this stops mattering. Mirrors the backend's KNOWN_HANDLE_ORDER. */
const KNOWN_HANDLE_ORDER = [
  "rsc-cartons",
  "die-cut-boxes",
  "food-packaging",
  "packaging-accessories",
];

export function buildShopCategories(
  categories: StoreCategorySummary[],
  products: CatalogProductLite[],
): ShopCategoryData[] {
  const knownIndex = (handle: string) => {
    const i = KNOWN_HANDLE_ORDER.indexOf(handle);
    return i === -1 ? KNOWN_HANDLE_ORDER.length : i;
  };

  const ordered = [...categories].sort(
    (a, b) =>
      (a.rank ?? 0) - (b.rank ?? 0) ||
      knownIndex(a.handle) - knownIndex(b.handle) ||
      a.name.localeCompare(b.name),
  );

  return ordered.flatMap((c) => {
    const inCategory = products.filter((p) => p.category === c.name);
    if (inCategory.length === 0) return [];

    const canonical = CANONICAL[c.handle];
    const storedIcon = c.metadata?.icon;
    const iconKey: CategoryIconKey =
      typeof storedIcon === "string" && STORABLE_ICONS.includes(storedIcon)
        ? (storedIcon as CategoryIconKey)
        : (canonical?.iconKey ?? "package");

    return [
      {
        slug: c.handle,
        medusaName: c.name,
        title: c.name,
        description: c.description || canonical?.description || "",
        iconKey,
        href:
          inCategory.length === 1
            ? `/products/${inCategory[0].slug}`
            : `/products/category/${c.handle}`,
      },
    ];
  });
}
