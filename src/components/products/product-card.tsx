import Link from "next/link";
import Image from "next/image";
import { ImageIcon, Package } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatGhs } from "@/lib/format";
import type { ProductSummary } from "@/lib/products";
import { getProductImages } from "@/lib/product-images";
import { cardHoverClass } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Browse/catalog product card — exact specs from Figma frame 389:928.
 * Fed by the live Medusa catalog (`listProducts()`). The card thumbnail uses
 * the first image from the same `product-images` manifest that feeds the
 * customizer's gallery, so a product only needs listing in one place; products
 * with no photo yet keep the placeholder icon.
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const cover = getProductImages(product.slug, product.name)[0];
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface",
        cardHoverClass,
      )}
    >
      {/* Product image / placeholder (208px), with category badge. The band is
          ~2.8:1, wider than the 4:3 sources, so the photo is cropped to fill
          it edge-to-edge (user's preference over letterboxing). */}
      <div className="relative flex h-52 items-center justify-center overflow-hidden bg-[#f3f4f6]">
        {cover ? (
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <ImageIcon className="size-20 text-muted/40" aria-hidden />
        )}
        <span className="absolute left-4 top-4 z-10 rounded-full border border-line bg-[#a59a87] px-2.5 py-0.5 text-xs font-semibold text-white">
          {product.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold leading-7 text-brand">
            {product.name}
          </h3>
          <p className="text-sm leading-relaxed text-muted">
            {product.description}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">
            Starts at
          </p>
          <p className="text-2xl font-bold text-brand">
            {formatGhs(product.startingPrice)}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-line pt-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Package className="size-3.5 shrink-0" aria-hidden />
            <span>MOQ: {product.moq} units</span>
          </div>
          {product.features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-muted">
              <span className="text-muted/50" aria-hidden>
                •
              </span>
              {f}
            </div>
          ))}
        </div>

        <Link
          href={`/products/${product.slug}`}
          className={buttonVariants({
            variant: "primary",
            size: "lg",
            fullWidth: true,
            className: "mt-auto",
          })}
        >
          Place Order
        </Link>
      </div>
    </div>
  );
}
