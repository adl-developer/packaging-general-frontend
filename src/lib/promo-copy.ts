import { formatGhs } from "@/lib/format";
import type { ActivePromotion, PromoBanner } from "@/lib/promotions";

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

/**
 * The one message every promo surface shows.
 *
 * Source of truth (user decision 2026-09-16): the **banner message typed in
 * admin** (Promotions → Promotional Banner). When it is set and the bar is
 * live, the promo bar headline and the cart box show that exact text, so an
 * operator who writes "15% OFF" sees "15% OFF" in both places — or in neither.
 * Only when no message is typed do both fall back to copy derived from the
 * promotion record ("Enjoy 10% off for all Easter orders").
 *
 * `null` when there is nothing to advertise.
 *
 * `code` is the promotion code the surface should add beside the text
 * ("Code: X" / "Use code X at checkout") — a fact of the promotion record, not
 * a claim that can contradict the message. It is null when there is no active
 * promotion, and ALSO null when the operator already wrote the code into the
 * message ("…with code: PGEASTER10"), so it is never shown twice.
 */
export function promoMessage(
  promo: ActivePromotion | null,
  banner: PromoBanner,
): { headline: string; subMessage: string; code: string | null } | null {
  if (!banner.live) return null;

  const [first = "", ...rest] = banner.message.split("\n");
  const headline = first.trim();
  if (headline) {
    const subMessage = rest.join(" ").trim();
    const mentionsCode =
      !!promo &&
      `${headline} ${subMessage}`.toLowerCase().includes(promo.code.toLowerCase());
    return {
      headline,
      subMessage,
      code: promo && !mentionsCode ? promo.code : null,
    };
  }

  if (!promo) return null;
  return {
    headline: `Enjoy ${promoOffer(promo)} ${promoScope(promo)}`,
    subMessage: "",
    code: promo.code,
  };
}
