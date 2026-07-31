import { Tag } from "lucide-react";
import { getActivePromotion } from "@/lib/promotions";
import { promoOffer, promoScope } from "@/lib/promo-copy";

/**
 * Lavender announcement bar (Figma: Easter promo), driven by the live active
 * promotion from Medusa (GET /store/active-promotion). Renders nothing when no
 * code-triggered promotion is active — deactivating the promo in admin removes
 * the bar without a storefront deploy.
 */
export async function PromoBar() {
  const promo = await getActivePromotion();
  if (!promo) return null;

  return (
    <div className="bg-accent text-accent-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-sm font-bold sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2">
          <Tag className="size-4 shrink-0" aria-hidden />
          <span>
            Enjoy <span className="text-white">{promoOffer(promo)}</span>{" "}
            {promoScope(promo)}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          Code:
          <span className="rounded-chip bg-white/25 px-2 py-0.5 tracking-wide">
            {promo.code}
          </span>
        </span>
      </div>
    </div>
  );
}
