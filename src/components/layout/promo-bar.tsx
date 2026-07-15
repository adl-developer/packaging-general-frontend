import { Tag } from "lucide-react";
import { getActivePromotion } from "@/lib/promotions";
import { formatGhs } from "@/lib/format";

/**
 * Lavender announcement bar (Figma: Easter promo), driven by the live active
 * promotion from Medusa (GET /store/active-promotion). Renders nothing when no
 * code-triggered promotion is active — deactivating the promo in admin removes
 * the bar without a storefront deploy.
 */
export async function PromoBar() {
  const promo = await getActivePromotion();
  if (!promo) return null;

  const offer =
    promo.valueType === "percentage"
      ? `${promo.value}% off`
      : `${formatGhs(promo.value)} off`;

  return (
    <div className="bg-accent text-accent-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-sm font-medium sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2">
          <Tag className="size-4 shrink-0" aria-hidden />
          <span>
            Enjoy <span className="font-extrabold text-white">{offer}</span>{" "}
            {promo.campaignName
              ? `for all ${promo.campaignName} orders`
              : "your order"}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          Code:
          <span className="rounded-chip bg-white/25 px-2 py-0.5 font-extrabold tracking-wide">
            {promo.code}
          </span>
        </span>
      </div>
    </div>
  );
}
