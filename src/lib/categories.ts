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
import { listProducts } from "@/lib/catalog";
import { CACHE_TAGS } from "@/lib/revalidate";
import { unstable_cache } from "next/cache";
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

/**
 * The category CARDS (serialisable data only — icons are re-attached after)
 * in Next's shared Data Cache: one entry for every function instance, an hour
 * long, tagged so the backend's `POST /api/revalidate` drops it the moment a
 * category or product is saved in the admin. Only a successful, non-empty
 * build is stored: the loader throws otherwise, and `unstable_cache` never
 * stores a rejection — the reader below falls back exactly as before.
 */
const CATEGORIES_REVALIDATE_SECONDS = 60 * 60;
const cachedCategoryCards = unstable_cache(
  async (): Promise<ShopCategoryData[]> => {
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
      // back to its sample data (whose category names match nothing here) —
      // fail open, and never cache it.
      throw new Error("no categories to show");
    }
    return cards;
  },
  ["shop-categories"],
  {
    tags: [CACHE_TAGS.categories, CACHE_TAGS.catalog],
    revalidate: CATEGORIES_REVALIDATE_SECONDS,
  },
);

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
  try {
    return (await cachedCategoryCards()).map(withIcon);
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
