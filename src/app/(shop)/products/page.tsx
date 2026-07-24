import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SHOP_CATEGORIES } from "@/lib/categories";
import { Card, cardHoverClass } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
            <Link href={c.href} className="block h-full">
              <Card
                className={cn(
                  "flex h-full flex-col items-start gap-4 border-2 border-[rgba(165,154,135,0.3)] p-8",
                  cardHoverClass,
                )}
              >
                <span
                  className="flex size-12 items-center justify-center rounded-full bg-background"
                  aria-hidden
                >
                  <c.icon className="size-5 text-brand" strokeWidth={1.5} />
                </span>
                <span className="text-xl font-semibold leading-7 text-brand">
                  {c.title}
                </span>
                <span className="text-sm leading-relaxed text-muted">
                  {c.description}
                </span>
                <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-brand">
                  View products
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
