import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { categoryBySlug } from "@/lib/categories";
import { listProducts } from "@/lib/products";
import { ProductCard } from "@/components/products/product-card";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = categoryBySlug(category);
  if (!cat) return { title: "Category not found" };
  return {
    title: cat.title,
    description: cat.description,
    alternates: { canonical: `/products/category/${cat.slug}` },
  };
}

/** Category page — the products of one category as cards (manager's flow:
 *  browse → category → product customize). */
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = categoryBySlug(category);
  if (!cat) notFound();

  const all = await listProducts();
  const products = all.filter((p) => p.category === cat.medusaName);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand/70"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All categories
        </Link>
      </div>

      <Reveal className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold sm:text-4xl text-brand">
          {cat.title}
        </h1>
        <p className="max-w-3xl text-lg leading-7 text-muted">
          {cat.description}
        </p>
      </Reveal>

      {products.length === 0 ? (
        <Reveal className="rounded-card border border-line bg-surface px-6 py-16 text-center">
          <p className="text-base text-muted">
            No products available in this category right now. Please check back
            soon.
          </p>
        </Reveal>
      ) : (
        <Stagger className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {products.map((p) => (
            <StaggerItem key={p.id} className="h-full">
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
