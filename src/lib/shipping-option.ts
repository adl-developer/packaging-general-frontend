/**
 * Which shipping option checkout attaches to the cart.
 *
 * Checkout shows no shipping choice. Since 2026-09-08 the intended option is
 * the CALCULATED "Yango Delivery" one: the backend's Yango provider prices
 * it live (Yango quote + markup) or at the configured fallback fee, so it
 * always carries a price once Medusa's `calculate` call has run for it (the
 * option LIST never prices calculated options — `saveDeliveryAddress` calls
 * `calculate` per calculated option first).
 *
 * Rule: prefer the first calculated option with a positive price; otherwise
 * the first flat option (today's manual "Standard Delivery", which stays as
 * the safety net for a store without the Yango option, or a `calculate`
 * call that failed outright); otherwise none. A calculated option priced at
 * zero is never attached — that was the Yango-outage fail-open case before
 * the provider learned to return the fallback fee, and it stays guarded.
 *
 * ⚠ Customer self-pickup (2026-09-22): the free "Store Pickup" option (type
 * code `pickup`) is NEVER a delivery candidate — as "the first flat option"
 * it would otherwise be picked as the delivery fallback. Pickup is attached
 * only by the backend's delivery route when the customer chooses it.
 */
export type ShippingOptionLike = {
  id: string;
  price_type?: string | null;
  amount?: number | null;
  calculated_price?: { calculated_amount?: number | null } | null;
  type?: { code?: string | null } | null;
};

export function isPickupShippingOption(option: ShippingOptionLike): boolean {
  return option.type?.code === "pickup";
}

export function shippingOptionPrice(option: ShippingOptionLike): number | null {
  const calculated = option.calculated_price?.calculated_amount;
  const raw = calculated ?? option.amount;
  const n = Number(raw);
  return raw == null || !Number.isFinite(n) ? null : n;
}

export function isUsableShippingOption(option: ShippingOptionLike): boolean {
  if (option.price_type !== "calculated") return true;
  const price = shippingOptionPrice(option);
  return price != null && price > 0;
}

export function pickShippingOption<T extends ShippingOptionLike>(
  options: readonly T[] | null | undefined,
): T | null {
  const usable = (options ?? []).filter(
    (o) => !isPickupShippingOption(o) && isUsableShippingOption(o),
  );
  return (
    usable.find((o) => o.price_type === "calculated") ??
    usable.find((o) => o.price_type !== "calculated") ??
    null
  );
}
