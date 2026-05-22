import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/products/product-card";
import { products } from "@/lib/products";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export const metadata: Metadata = {
  title: "Browse Packaging Solutions",
  description:
    "Browse and customize quality packaging — shipping cartons, mailer boxes, folding cartons, and export boxes. Instant pricing, built for West African markets.",
  alternates: { canonical: "/products" },
};

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
        <h1 className="text-4xl font-medium leading-10 tracking-[0.37px] text-brand">
          Browse Our Packaging Solutions
        </h1>
        <p className="max-w-3xl text-lg leading-7 tracking-tight text-muted">
          Select a packaging type to customize and get instant pricing. All
          products meet quality standards for West African markets.
        </p>
      </Reveal>

      <Stagger className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {products.map((p) => (
          <StaggerItem key={p.id} className="h-full">
            <ProductCard product={p} />
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
