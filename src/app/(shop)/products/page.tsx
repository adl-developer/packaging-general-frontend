import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/products/product-card";
import { listProducts } from "@/lib/products";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export const metadata: Metadata = {
  title: "Browse Packaging Solutions",
  description:
    "Browse and customize quality packaging — RSC cartons, die cut boxes, pizza and food boxes, tape and accessories. Instant pricing, built for West African markets.",
  alternates: { canonical: "/products" },
};

/** URL-safe slug for a category name ("RSC Cartons" → "rsc-cartons") —
 *  matches the hrefs on the home page category tiles. */
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const products = await listProducts();

  // Category chips from the live catalog (stable order of first appearance).
  const categories = [...new Set(products.map((p) => p.category))];
  const active = categories.find((c) => slugify(c) === category);
  const visible = active
    ? products.filter((p) => p.category === active)
    : products;

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
          Select a packaging type to customize and get instant pricing. All
          products meet quality standards for West African markets.
        </p>
      </Reveal>

      {/* Category filter chips — deep-linked from the home page tiles. */}
      {categories.length > 1 && (
        <Reveal className="flex flex-wrap gap-2">
          <CategoryChip href="/products" label="All" selected={!active} />
          {categories.map((c) => (
            <CategoryChip
              key={c}
              href={`/products?category=${slugify(c)}`}
              label={c}
              selected={active === c}
            />
          ))}
        </Reveal>
      )}

      {visible.length === 0 ? (
        <Reveal className="rounded-card border border-line bg-surface px-6 py-16 text-center">
          <p className="text-base text-muted">
            No products available right now. Please check back soon.
          </p>
        </Reveal>
      ) : (
        <Stagger className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {visible.map((p) => (
            <StaggerItem key={p.id} className="h-full">
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

function CategoryChip({
  href,
  label,
  selected,
}: {
  href: string;
  label: string;
  selected: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center rounded-button border px-4 text-sm font-medium transition-colors",
        selected
          ? "border-brand bg-brand text-brand-foreground"
          : "border-line bg-surface text-brand hover:border-brand/40",
      )}
    >
      {label}
    </Link>
  );
}
