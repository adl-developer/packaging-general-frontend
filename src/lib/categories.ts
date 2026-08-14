/**
 * The shop's browse categories — LIVE from Medusa since 2026-08-14 (created
 * and edited on the admin portal's Categories subtab). This file is the fetch
 * + icon-resolution edge; every display rule (ordering, canonical fallback
 * copy, hide-empty, single-product direct link) lives in `shop-categories.ts`,
 * which is pure and unit-tested.
 *
 * Offline posture matches `listProducts`' sample-product fallback: if the
 * backend is unreachable (or renders zero cards), the pre-2026-08-14
 * hard-coded list keeps the browse meaningful rather than empty.
 */
import type { ComponentType } from "react";
import {
  Box,
  Layers,
  Package,
  Scissors,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import { RscCartonIcon } from "@/components/ui/icons";
import { sdk } from "@/lib/medusa";
import { listProducts } from "@/lib/products";
import {
  buildShopCategories,
  type CategoryIconKey,
  type ShopCategoryData,
  type StoreCategorySummary,
} from "@/lib/shop-categories";

export interface ShopCategory {
  slug: string;
  /** Medusa product_category name — matches `ProductSummary.category`. */
  medusaName: string;
  title: string;
  description: string;
  /** Line icon shown in the card's circular badge (design frame). */
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  /** Where the browse-page card leads. */
  href: string;
}

/** Admin icon keys → the design's line icons, plus RSC Cartons' custom
 *  drawing (fallback-only; the admin picker doesn't offer it). Keep in step
 *  with the backend's CATEGORY_ICONS and the admin's CATEGORY_ICON_MAP. */
const ICONS: Record<
  CategoryIconKey,
  ComponentType<{ className?: string; strokeWidth?: number | string }>
> = {
  package: Package,
  box: Box,
  layers: Layers,
  scissors: Scissors,
  utensils: UtensilsCrossed,
  tag: Tag,
  "rsc-carton": RscCartonIcon,
};

function withIcon(card: ShopCategoryData): ShopCategory {
  return {
    slug: card.slug,
    medusaName: card.medusaName,
    title: card.title,
    description: card.description,
    icon: ICONS[card.iconKey],
    href: card.href,
  };
}

/** The pre-data-driven list, kept verbatim as the unreachable-backend
 *  fallback. `shop-categories.ts` holds the same copy as CANONICAL — that one
 *  fills gaps in live data, this one stands in for it entirely. */
const STATIC_FALLBACK: ShopCategory[] = [
  {
    slug: "rsc-cartons",
    medusaName: "RSC Cartons",
    title: "RSC Cartons",
    description:
      "Regular slotted container cartons — 11 stock sizes in single or double wall, brown or white.",
    icon: RscCartonIcon,
    href: "/products/rsc-carton",
  },
  {
    slug: "die-cut-boxes",
    medusaName: "Die Cut Boxes",
    title: "Die Cut Boxes",
    description:
      "Purpose-cut boxes for produce and storage — yam, vegetable, mango, archive boxes and trays.",
    icon: Scissors,
    href: "/products/category/die-cut-boxes",
  },
  {
    slug: "food-packaging",
    medusaName: "Food Packaging",
    title: "Food Packaging",
    description:
      "Food-safe boxes — pizza boxes from 10″ to 16″ and takeaway food boxes with or without window.",
    icon: UtensilsCrossed,
    href: "/products/category/food-packaging",
  },
  {
    slug: "packaging-accessories",
    medusaName: "Packaging Accessories",
    title: "Packaging Accessories",
    description:
      "Everything that seals and protects — BOPP tape, stretch and bubble wrap, shredded paper.",
    icon: Layers,
    href: "/products/category/packaging-accessories",
  },
];

/** Same 5-minute TTL and only-cache-success rule as the catalog caches in
 *  `products.ts` — categories ride the same "seed data, rarely changes"
 *  reasoning, and an admin edit shows within the TTL. */
const CATEGORIES_TTL_MS = 5 * 60 * 1000;
let categoriesCache: { data: ShopCategory[]; at: number } | null = null;

async function listStoreCategories(): Promise<StoreCategorySummary[]> {
  const { product_categories } = await sdk.store.category.list({
    fields: "id,name,handle,description,metadata,rank",
    limit: 100,
  });
  return product_categories.map((c) => ({
    id: c.id,
    name: c.name,
    handle: c.handle,
    description: c.description ?? null,
    rank: (c as { rank?: number | null }).rank ?? null,
    metadata: (c.metadata ?? null) as Record<string, unknown> | null,
  }));
}

export async function getShopCategories(): Promise<ShopCategory[]> {
  const cached = categoriesCache;
  if (cached && Date.now() - cached.at < CATEGORIES_TTL_MS) return cached.data;
  try {
    const [categories, products] = await Promise.all([
      listStoreCategories(),
      listProducts(),
    ]);
    const cards = buildShopCategories(
      categories,
      products.map((p) => ({ slug: p.slug, category: p.category })),
    );
    if (cards.length === 0) {
      // Reachable backend but nothing to show usually means listProducts fell
      // back to its sample data (whose category names match nothing here).
      // Same fail-open posture, and deliberately not cached.
      return STATIC_FALLBACK;
    }
    const result = cards.map(withIcon);
    categoriesCache = { data: result, at: Date.now() };
    return result;
  } catch (err) {
    console.error("[getShopCategories] Medusa unreachable; using static categories:", err);
    return STATIC_FALLBACK;
  }
}

/** Category-page lookup by slug (Medusa handle). Async now — the category
 *  page and its metadata both resolve live data. */
export async function getShopCategoryBySlug(
  slug: string,
): Promise<ShopCategory | undefined> {
  return (await getShopCategories()).find((c) => c.slug === slug);
}
