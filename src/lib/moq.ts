/**
 * Minimum order quantity (`product.metadata.moq`) — client-safe, no SDK.
 *
 * The rule is PER CART LINE: each product variant (one box type) must be
 * ordered in at least its product's minimum, the same rule the product page
 * applies when adding. Until 2026-11-13 only the product page checked it; the
 * cart's stepper went down to 1 and an order of 5 + 5 went through against a
 * minimum of 10 each. Now the cart page, the payment page, `initiatePaystack`
 * and the backend's payment-session guard
 * (`backend/src/api/utils/minimum-quantity-guard.ts`, the same rules) all
 * enforce it.
 */

/** A product's minimum order quantity; anything missing or invalid is 1. */
export function productMoq(
  metadata: Record<string, unknown> | null | undefined,
): number {
  const n = Number(metadata?.moq);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function belowMoqMessage(name: string, moq: number): string {
  return `The minimum order for ${name} is ${moq} units.`;
}

type MoqLine = {
  quantity?: number | null;
  product_title?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
  product?: { metadata?: Record<string, unknown> | null } | null;
};

/** Medusa cart lines under their product's minimum (fee and service lines never are). */
export function cartLinesBelowMoq(
  lines: MoqLine[],
): { name: string; moq: number; quantity: number }[] {
  const out: { name: string; moq: number; quantity: number }[] = [];
  for (const line of lines) {
    if (line.metadata?.pg_platform_fee) continue;
    const meta = line.product?.metadata ?? null;
    if (meta?.service) continue;
    const moq = productMoq(meta);
    const quantity = Number(line.quantity ?? 0);
    if (moq > 1 && quantity < moq) {
      out.push({ name: line.product_title || line.title || "An item", moq, quantity });
    }
  }
  return out;
}

/** The customer-facing refusal for a cart that can't be paid for yet. */
export function cartBelowMoqMessage(
  below: { name: string; moq: number }[],
): string {
  const parts = below.map((b) => `${b.name} (minimum ${b.moq} units)`);
  return `Some items are below their minimum order quantity: ${parts.join(", ")}. Please update your cart.`;
}
