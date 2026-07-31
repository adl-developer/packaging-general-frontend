import { formatGhs } from "@/lib/format";
import type { ActivePromotion } from "@/lib/promotions";

/**
 * Shared copy for the advertised promotion. Both surfaces that show it — the
 * header promo bar and the cart's promo box — build their text from these, so
 * the two can never drift apart when the promotion is changed in admin.
 *
 * Pure (no SDK import) so client components can use it too.
 */

/** The discount itself: "10% off" or "GH₵ 50.00 off". */
export function promoOffer(promo: ActivePromotion): string {
  return promo.valueType === "percentage"
    ? `${promo.value}% off`
    : `${formatGhs(promo.value)} off`;
}

/** What the discount applies to: "for all Easter orders" / "your order". */
export function promoScope(promo: ActivePromotion): string {
  return promo.campaignName
    ? `for all ${promo.campaignName} orders`
    : "your order";
}
