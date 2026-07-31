/**
 * Buy Now — pure routing decision.
 *
 * See docs/superpowers/specs/2026-07-31-buy-now-design.md.
 *
 * There is only one cart (§3), so "Buy Now" cannot mean "pay for this item in
 * isolation" — it means "add this item, then decide where to send the
 * customer next":
 *
 *   - signed out                          → refused (button isn't even shown,
 *                                            but the server action re-checks —
 *                                            hiding UI is not access control)
 *   - cart had other items already        → cart-with-notice (never silently
 *                                            take payment for items the
 *                                            customer didn't mean to buy now)
 *   - cart was empty, prefill incomplete  → delivery (no saved address/phone —
 *                                            proceeding would fail at
 *                                            initiatePaystack with a generic
 *                                            error)
 *   - cart was empty, prefill complete    → payment (the real Buy Now path)
 *
 * Kept dependency-free (no cookies, no SDK) so it's testable in isolation —
 * see buy-now.test.ts.
 */
export type BuyNowRoute = "payment" | "delivery" | "cart-with-notice" | "refused";

export function decideBuyNowRoute(
  isSignedIn: boolean,
  /** Number of lines already in the cart BEFORE the Buy Now item is added. */
  cartLineCount: number,
  prefillComplete: boolean,
): BuyNowRoute {
  if (!isSignedIn) return "refused";
  if (cartLineCount > 0) return "cart-with-notice";
  return prefillComplete ? "payment" : "delivery";
}

/**
 * A checkout prefill is "complete" enough to skip straight to payment only
 * when it carries a delivery address and at least one phone number — the two
 * fields `initiatePaystack`'s guard chain requires (via shipping_address /
 * shipping_method) that Buy Now can't fabricate. Company name, contact
 * person, and email are either always present for a signed-in customer or
 * non-blocking, so they aren't part of this gate.
 */
export function isPrefillComplete(prefill: {
  address: string;
  contactPhone: string;
  deliveryPhone: string;
}): boolean {
  const hasAddress = Boolean(prefill.address?.trim());
  const hasPhone = Boolean(
    prefill.contactPhone?.trim() || prefill.deliveryPhone?.trim(),
  );
  return hasAddress && hasPhone;
}
