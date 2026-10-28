/**
 * What to tell a customer when Medusa accepted a promotion code and then
 * dropped it from the cart.
 *
 * Medusa keeps a code on a cart only while it takes money off. A free-delivery
 * code (admin Promotions → "Free shipping") takes nothing off when delivery
 * already costs GH₵0 (Settings → Platform: live quotes off, fallback fee 0),
 * on a pickup order, or before delivery is chosen, so it is dropped and this
 * page used to say "Invalid discount code" for a valid code (2026-10-28).
 * The backend's `GET /store/promo-code-kind` says which kind the code is;
 * this picks the words. Pure, so it is unit-tested.
 *
 * `tone: "info"` = not the customer's mistake: shown as a plain note, not a
 * red error.
 */
export type PromoCodeKind = "free_delivery" | "discount";

export type DroppedCodeMessage = { error: string; tone: "error" | "info" };

export const INVALID_CODE_MESSAGE = "Invalid discount code";
export const DELIVERY_ALREADY_FREE_MESSAGE = "Delivery is already free on your order.";
export const FREE_DELIVERY_PICKUP_MESSAGE =
  "This code gives free delivery, so it doesn't apply to pickup orders.";
export const FREE_DELIVERY_NO_METHOD_MESSAGE =
  "This code gives free delivery. Choose delivery first, then apply it.";

export function droppedCodeMessage(
  kind: PromoCodeKind | null,
  cart: { pickup: boolean; hasDeliveryMethod: boolean },
): DroppedCodeMessage {
  if (kind !== "free_delivery") return { error: INVALID_CODE_MESSAGE, tone: "error" };
  if (cart.pickup) return { error: FREE_DELIVERY_PICKUP_MESSAGE, tone: "info" };
  if (cart.hasDeliveryMethod) return { error: DELIVERY_ALREADY_FREE_MESSAGE, tone: "info" };
  return { error: FREE_DELIVERY_NO_METHOD_MESSAGE, tone: "info" };
}
