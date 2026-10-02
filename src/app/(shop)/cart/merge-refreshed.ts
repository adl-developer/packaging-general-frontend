import type { CartItem } from "./map-cart";

/**
 * Fold the cart the backend just brought up to date (a product's price or
 * weight changed, 2026-10-02) into what the cart page is showing.
 *
 * Goods lines take the refreshed figures, except the QUANTITY of a line the
 * customer is still stepping (its debounced sync owns that number). Lines the
 * refresh doesn't know, such as an optimistic add still committing, stay as
 * they are. The platform fee is a charge, recomputed by the refresh, so the
 * refreshed fee line replaces the old one outright.
 */
export function mergeRefreshedItems(
  current: CartItem[],
  refreshed: CartItem[],
  dirtyQtyIds: ReadonlySet<string>,
): CartItem[] {
  const byId = new Map(refreshed.filter((x) => !x.isPlatformFee).map((x) => [x.id, x]));
  const goods = current
    .filter((x) => !x.isPlatformFee)
    .map((x) => {
      const fresh = byId.get(x.id);
      if (!fresh) return x;
      return dirtyQtyIds.has(x.id) ? { ...fresh, quantity: x.quantity } : fresh;
    });
  return [...goods, ...refreshed.filter((x) => x.isPlatformFee)];
}
