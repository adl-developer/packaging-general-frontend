import Link from "next/link";
import { ImageIcon, Package } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatGhs } from "@/lib/format";
import type { ProductSummary } from "@/lib/products";
import { cardHoverClass } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Browse/catalog product card — exact specs from Figma frame 389:928.
 * Fed by the live Medusa catalog (`listProducts()`). Image placeholder remains
 * until product images are added in the backend.
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface",
        cardHoverClass,
      )}
    >
      {/* Product image / placeholder (208px), with category badge */}
      <div className="relative flex h-52 items-center justify-center bg-[#f3f4f6]">
        <span className="absolute left-4 top-4 rounded-full border border-line bg-[#a59a87] px-2.5 py-0.5 text-xs font-semibold text-white">
          {product.category}
        </span>
        <ImageIcon className="size-20 text-muted/40" aria-hidden />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold leading-7 tracking-tight text-brand">
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
