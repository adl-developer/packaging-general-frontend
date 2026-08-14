/**
 * MOQ tiers — quantity-bracketed price multipliers, read from
 * `product.metadata.tiers`.
 *
 * ⚠ DISPLAY TWIN of `backend/src/utils/moq-tiers.ts` (separate repos, same
 * rules, same 2dp rounding — nothing checks them against each other). The
 * backend's `POST /store/carts/:id/moq-tiers` is what actually CHARGES the
 * tier price; everything here only previews it in the customizer, so a drift
 * between the two shows customers one price and charges another.
 *
 * This module is deliberately pure and client-safe — no SDK import. The cart
 * sync call lives in `lib/actions/cart.ts` beside the platform-fee sync.
 */

export type MoqTier = {
  /** First quantity the tier applies to. Positive integer. */
  minQuantity: number;
  /** Last quantity the tier applies to, or null for no maximum. */
  maxQuantity: number | null;
  /** Applied to the variant's base unit price. 1.0 = base price. */
  priceMultiplier: number;
  /** Display label, e.g. "50-199 units". */
  label: string;
};

/** "50-199 units" / "1000+ units". */
export function tierLabel(tier: {
  minQuantity: number;
  maxQuantity: number | null;
}): string {
  return tier.maxQuantity === null
    ? `${tier.minQuantity}+ units`
    : `${tier.minQuantity}-${tier.maxQuantity} units`;
}

/** Metadata → tiers, defensively: malformed entries are dropped so a product
 *  with unreadable tiers sells at base price rather than NaN. */
export function parseMoqTiers(value: unknown): MoqTier[] {
  if (!Array.isArray(value)) return [];

  const tiers: MoqTier[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;

    const minQuantity = Number(raw.minQuantity);
    if (!Number.isInteger(minQuantity) || minQuantity < 1) continue;

    const maxRaw = raw.maxQuantity;
    const maxQuantity =
      maxRaw === null || maxRaw === undefined || maxRaw === ""
        ? null
        : Number(maxRaw);
    if (maxQuantity !== null) {
      if (!Number.isInteger(maxQuantity) || maxQuantity < minQuantity) continue;
    }

    const priceMultiplier = Number(raw.priceMultiplier);
    if (!Number.isFinite(priceMultiplier) || priceMultiplier <= 0) continue;

    const label =
      typeof raw.label === "string" && raw.label.trim()
        ? raw.label.trim()
        : tierLabel({ minQuantity, maxQuantity });

    tiers.push({ minQuantity, maxQuantity, priceMultiplier, label });
  }

  return tiers.sort((a, b) => a.minQuantity - b.minQuantity);
}

/** The tier a quantity falls in, or null (below the first tier, in a gap, or
 *  no tiers) — in which case the base price applies. */
export function tierFor(tiers: MoqTier[], quantity: number): MoqTier | null {
  if (!Number.isFinite(quantity) || quantity < 1) return null;
  return (
    tiers.find(
      (t) =>
        quantity >= t.minQuantity &&
        (t.maxQuantity === null || quantity <= t.maxQuantity),
    ) ?? null
  );
}

/** Base × the matching tier's multiplier, rounded to 2dp exactly like the
 *  backend (GHS has two decimals; Paystack takes minor units). */
export function tieredUnitPrice(
  basePrice: number,
  tiers: MoqTier[],
  quantity: number,
): number {
  const tier = tierFor(tiers, quantity);
  if (!tier) return basePrice;
  return Math.round(basePrice * tier.priceMultiplier * 100) / 100;
}
