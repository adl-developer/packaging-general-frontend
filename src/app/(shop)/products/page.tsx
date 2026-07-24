import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SHOP_CATEGORIES } from "@/lib/categories";
import { CategoryCard } from "@/components/products/category-card";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export const metadata: Metadata = {
  title: "Browse Packaging Solutions",
  description:
    "Browse quality packaging by category — RSC cartons, die cut boxes, food packaging, and accessories. Instant pricing, built for West African markets.",
  alternates: { canonical: "/products" },
};

/** The browse page shows ONLY the 4 top-level categories (manager's flow).
 *  Each card leads to its category page of product cards — except RSC
 *  Cartons, which is one configurable product and links straight to its
 *  customizer. */
export default function ProductsPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand/70"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
      </div>

      <Reveal className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold sm:text-4xl text-brand">
          Browse Our Packaging Solutions
        </h1>
        <p className="max-w-3xl text-lg leading-7 text-muted">
          Pick a category to see its products, customize, and get instant
          pricing. All products meet quality standards for West African
          markets.
        </p>
      </Reveal>

      <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {SHOP_CATEGORIES.map((c) => (
          <StaggerItem key={c.slug} className="h-full">
            <CategoryCard category={c} />
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
