/** The stock facts the storefront reads for one variant. */
export interface VariantStockFields {
  manage_inventory?: boolean | null;
  allow_backorder?: boolean | null;
  inventory_quantity?: number | null;
}

/**
 * Resolved stock for one variant.
 * `available === null` means the quantity is MEANINGLESS (unmanaged or
 * backorder-enabled), not that it is zero — callers must never render it.
 */
export interface StockState {
  purchasable: boolean;
  available: number | null;
}

/**
 * Mirrors the backend aggregate. Unmanaged variants (manage_inventory ===
 * false) — like the two Printing Setup Fee service variants — are always
 * purchasable and carry no meaningful inventory_quantity. Check that first
 * so their quantity is never consulted.
 */
export function isPurchasable(v: VariantStockFields): boolean {
  if (v.manage_inventory === false) return true;
  if (v.allow_backorder === true) return true;
  return (v.inventory_quantity ?? 0) > 0;
}

export function toStockState(v: VariantStockFields): StockState {
  const purchasable = isPurchasable(v);
  const unmanaged = v.manage_inventory === false || v.allow_backorder === true;
  return { purchasable, available: unmanaged ? null : (v.inventory_quantity ?? 0) };
}

/**
 * A product family is out of stock only when EVERY variant is.
 * An empty list means "we know nothing" — it must read as in stock, never out,
 * so a failed stock fetch cannot paint the whole catalog as unavailable.
 */
export function familyOutOfStock(states: StockState[]): boolean {
  return states.length > 0 && states.every((s) => !s.purchasable);
}

/**
 * How far a cart line exceeds what can actually be sold.
 * Unknown availability (`null`) never produces a shortfall — see the
 * fail-open rule in the plan's Global Constraints.
 */
export function shortfall(quantity: number, state: StockState): { reduceTo: number } | null {
  if (state.available === null) return null;
  if (quantity <= state.available) return null;
  return { reduceTo: state.available };
}
