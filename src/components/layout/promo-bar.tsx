import { Tag } from "lucide-react";

/**
 * Lavender announcement bar (Figma: Easter promo).
 * TODO: make content CMS/Medusa-driven + dismissible once backend is wired.
 */
export function PromoBar() {
  return (
    <div className="bg-accent text-accent-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-sm sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2">
          <Tag className="size-4 shrink-0" aria-hidden />
          <span>
            Enjoy <span className="font-semibold">10% off</span> for all Easter
            orders
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          Code:
          <span className="rounded-chip bg-white/20 px-2 py-0.5 font-semibold">
            PGEASTER10
          </span>
        </span>
      </div>
    </div>
  );
}
