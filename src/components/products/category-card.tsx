import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, cardHoverClass } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ShopCategory } from "@/lib/categories";

/** Category card (design frame): circular icon badge, title, description,
 *  "View products →". Shared by the homepage section and /products. */
export function CategoryCard({ category: c }: { category: ShopCategory }) {
  return (
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
  );
}
