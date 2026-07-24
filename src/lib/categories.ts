/**
 * The 4 top-level shop categories (manager's flow, [Internal] PG Universal
 * Product List Sheet2): the browse page shows ONLY these as cards; each
 * category page then lists its products as cards.
 *
 * RSC Cartons is one configurable product, so its card skips the category
 * page and goes straight to the customizer.
 */
import type { LucideIcon } from "lucide-react";
import { Box, Layers, Scissors, UtensilsCrossed } from "lucide-react";

export interface ShopCategory {
  slug: string;
  /** Medusa product_category name — matches `ProductSummary.category`. */
  medusaName: string;
  title: string;
  description: string;
  /** Line icon shown in the card's circular badge (design frame). */
  icon: LucideIcon;
  /** Where the browse-page card leads. */
  href: string;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    slug: "rsc-cartons",
    medusaName: "RSC Cartons",
    title: "RSC Cartons",
    description:
      "Regular slotted container cartons — 11 stock sizes in single or double wall, brown or white.",
    icon: Box,
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

export function categoryBySlug(slug: string): ShopCategory | undefined {
  return SHOP_CATEGORIES.find((c) => c.slug === slug);
}
