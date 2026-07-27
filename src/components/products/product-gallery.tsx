"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/lib/product-images";

/**
 * Product image panel for the customizer — Figma frame 3933:25640.
 *
 * Outer shell 535×516 (bg #f5f4f2, radius 16) = a 535×428 main image area
 * (24px inset, prev/next 36px circle buttons) above a 64px thumbnail strip
 * (8px gaps, 2px border — #3d3428 selected / #c4bcb0 idle).
 *
 * On desktop the parent pins this panel with `lg:sticky` so only the
 * customizer column scrolls. Products with no images yet (see
 * `lib/product-images.ts`) render the neutral placeholder instead.
 */
export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const [index, setIndex] = React.useState(0);
  const count = images.length;
  const active = count ? images[Math.min(index, count - 1)] : null;
  const step = (delta: number) =>
    setIndex((i) => (i + delta + count) % count);

  return (
    <div className="overflow-hidden rounded-option bg-[#f5f4f2]">
      {/* Main image — 535×428 with a 24px inset (Figma: image box 487×380).
          The inset lives on the image itself: `fill` covers the border box and
          ignores the container's padding. */}
      <div className="relative aspect-[535/428]">
        {active ? (
          <Image
            key={active.src}
            src={active.src}
            alt={active.alt}
            fill
            sizes="(min-width: 1024px) 535px, 100vw"
            className="object-contain p-6"
            priority
          />
        ) : (
          <div
            role="img"
            aria-label={`No photo of the ${productName} is available yet`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-muted"
          >
            <Package className="size-10" aria-hidden />
            <span aria-hidden className="text-center text-sm">
              Product photo coming soon
            </span>
          </div>
        )}

        {count > 1 && (
          <>
            <GalleryArrow
              side="left"
              label="Previous image"
              onClick={() => step(-1)}
            />
            <GalleryArrow
              side="right"
              label="Next image"
              onClick={() => step(1)}
            />
          </>
        )}
      </div>

      {/* Thumbnail strip — Figma pad 8/16/16/16, gap 8. */}
      {count > 1 && (
        <div className="flex gap-2 px-4 pb-4 pt-2">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1} of ${count}`}
              aria-current={i === index || undefined}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-option border-2 bg-surface transition-colors",
                i === index
                  ? "border-brand"
                  : "border-line hover:border-brand/40",
              )}
            >
              <Image
                src={img.src}
                alt=""
                width={60}
                height={60}
                className="size-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 36px circle nav button — bg rgba(232,229,222,0.9), 1px #c4bcb0 border. */
function GalleryArrow({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-[rgba(232,229,222,0.9)] text-brand transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
