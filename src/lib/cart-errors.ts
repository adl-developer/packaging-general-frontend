/**
 * Classification of Medusa cart-write failures — pure, no I/O.
 *
 * The Medusa SDK throws `FetchError`, whose `message` is the backend's own
 * `message` field verbatim and whose `status` is the HTTP status (verified
 * against node_modules/@medusajs/js-sdk/dist/esm/client.js:90).
 */

/**
 * True when the write was rejected because the VARIANT is gone — not because
 * the cart is.
 *
 * Medusa's exact wording:
 *   "Variants variant_01ABC do not exist or belong to a product that is not
 *    published"
 *
 * This distinction matters because the two failures demand opposite responses.
 * A dead cart should be dropped so the shopper starts fresh; a dead variant
 * means the cart is perfectly healthy and probably holds other items the
 * shopper still wants. Treating the latter as the former silently emptied real
 * carts whenever an add touched a variant removed by a catalog re-import —
 * found 2026-07-31 while fixing Reorder on order PG-2026-017.
 */
export function isDeadVariantError(err: unknown): boolean {
  const message = (err as { message?: unknown })?.message;
  if (typeof message !== "string") return false;
  return (
    /variants?\b.*\bdo(?:es)? not exist/i.test(message) ||
    // An ARCHIVED variant (2026-10-05): the backend's add-to-cart guard says
    // "This option is no longer available. Please choose another." Same
    // response — the line is gone, the cart is fine.
    /option is no longer available/i.test(message)
  );
}

/**
 * True when Medusa refused the add because there isn't enough stock
 * (2026-09-29). Its wording (core-flows confirm-inventory step):
 *   "Some variant does not have the required inventory"
 *
 * Like a dead variant, this is about the LINE, not the cart: the cart must
 * NOT be cleared (it was, and silently emptied the shopper's other items).
 */
export function isInsufficientInventoryError(err: unknown): boolean {
  const message = (err as { message?: unknown })?.message;
  if (typeof message !== "string") return false;
  return /(does not have the required inventory|insufficient inventory|not enough (?:stock|inventory))/i.test(
    message,
  );
}

/**
 * True when the write failed because the CART itself is gone (2026-10-13,
 * Sentry STOREFRONT-9): the cookie names a cart that was deleted or already
 * completed. Medusa's wording:
 *   404 "Cart id not found: cart_…" / "Cart with id 'cart_…' not found"
 *   400 "Cart cart_… is already completed."
 *
 * Only then is it safe to start a fresh cart and repeat the add: nothing the
 * shopper still wants lives in a cart that no longer exists. A dead variant or
 * a stock shortfall is about the LINE and is never treated as this.
 */
export function isDeadCartError(err: unknown): boolean {
  if (isDeadVariantError(err) || isInsufficientInventoryError(err)) return false;
  const message = (err as { message?: unknown })?.message;
  if (typeof message !== "string") return false;
  const status = (err as { status?: unknown })?.status;
  return (
    (status === 404 && /\bcart\b.*\bnot found\b/i.test(message)) ||
    /\bcart\b.*\balready completed\b/i.test(message)
  );
}
