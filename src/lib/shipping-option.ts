/**
 * Which shipping option checkout attaches to the cart.
 *
 * Checkout shows no shipping choice today — it silently takes the first
 * option Medusa lists. That was fine while the only option was the flat
 * GH₵30 manual rate, but a CALCULATED option (the Yango provider) answers
 * GH₵0 whenever its upstream quote fails — the provider fails open so a
 * Yango outage cannot take the whole checkout down — and "first option"
 * would happily bill a customer nothing for a courier (review 2026-09-04,
 * latent until a Yango option exists in prod).
 *
 * Rule: a calculated option is usable only with a positive price; flat
 * options are always usable. Among the usable ones, keep Medusa's order.
 */
export type ShippingOptionLike = {
  id: string;
  price_type?: string | null;
  amount?: number | null;
  calculated_price?: { calculated_amount?: number | null } | null;
};

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
  return (options ?? []).find(isUsableShippingOption) ?? null;
}
