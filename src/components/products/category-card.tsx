import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, cardHoverClass } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ShopCategory } from "@/lib/categories";

/** Category card (design frame): circular icon badge, title, description,
 *  "View products →". Shared by the homepage section and /products.
 *
 *  With an admin-uploaded photo (2026-10-05) the card leads with a 16:9
 *  banner instead of the icon badge. The photo is already a compressed WebP
 *  (admin `lib/category-image.ts`); next/image then serves a device-sized
 *  AVIF/WebP of it, lazy-loaded, using `sizes` to match the 1-column phone
 *  grid and the 2-column grids (homepage max-w-4xl, /products max-w-7xl). */
export function CategoryCard({ category: c }: { category: ShopCategory }) {
  return (
    <Link href={c.href} className="block h-full">
      <Card
        className={cn(
          "flex h-full flex-col border-2 border-[rgba(165,154,135,0.3)]",
          cardHoverClass,
          c.image ? "overflow-hidden" : "items-start gap-4 p-8",
        )}
      >
        {c.image ? (
          <>
            <div className="relative aspect-[16/9] w-full bg-background">
              <Image
                src={c.image}
                alt=""
                fill
                sizes="(min-width: 1280px) 616px, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col items-start gap-4 p-8">
              <CardText category={c} />
            </div>
          </>
        ) : (
          <>
            <span
              className="flex size-12 items-center justify-center rounded-full bg-background"
              aria-hidden
            >
              <c.icon className="size-5 text-brand" strokeWidth={1.5} />
            </span>
            <CardText category={c} />
          </>
        )}
      </Card>
    </Link>
  );
}

function CardText({ category: c }: { category: ShopCategory }) {
  return (
    <>
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
    </>
  );
}
