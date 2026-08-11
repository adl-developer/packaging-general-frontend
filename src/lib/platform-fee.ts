import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";

/**
 * The platform fee, as the storefront sees it.
 *
 * ⚠ IT IS A LINE ITEM ON THE CART, not a total. Medusa has no order-level fee
 * — the only things it charges are line items, shipping and tax — so the
 * backend adds the configured fee as a custom-priced line flagged in its own
 * metadata. Everything in this file exists to put that line back where a
 * customer expects to see it: as a charge row beneath Subtotal, not as
 * something they think they added to their basket.
 *
 * Backend counterparts:
 *   `api/store/carts/[id]/platform-fee/route.ts` — computes and syncs the line
 *   `api/admin/pg/settings/platform-fee.ts`      — the rules, and this flag
 */

/** Line-item metadata flag. ⚠ Must match `PLATFORM_FEE_ITEM_FLAG` in the
 *  backend verbatim — they are separate repos and nothing checks them against
 *  each other. If they drift, the fee line renders as a product in the cart. */
const PLATFORM_FEE_ITEM_FLAG = "pg_platform_fee";

type MetadataBearing = { metadata?: Record<string, unknown> | null };

/** Tolerates the shapes metadata round-trips as (`true`, `"true"`). */
export function isPlatformFeeLine(line: MetadataBearing): boolean {
  const flag = line.metadata?.[PLATFORM_FEE_ITEM_FLAG];
  return flag === true || flag === "true";
}

/** Cart lines minus the fee line — what a customer means by "my items". */
export function goodsLines<T extends MetadataBearing>(lines: T[]): T[] {
  return lines.filter((l) => !isPlatformFeeLine(l));
}

/** What the fee came to on this cart (0 when none is configured). */
export function platformFeeTotal(cart: HttpTypes.StoreCart | null): number {
  if (!cart) return 0;
  const total = (cart.items ?? [])
    .filter((l) => isPlatformFeeLine(l))
    .reduce(
      (sum, l) => sum + Number(l.unit_price ?? 0) * Number(l.quantity ?? 0),
      0,
    );
  return Math.round(total * 100) / 100;
}

export type PlatformFeeSync = {
  percent: number;
  fixed: number;
  amount: number;
  /** True when the fee line was added, re-priced or removed by this call — the
   *  only case in which the caller's copy of the cart is now out of date. */
  changed: boolean;
};

/**
 * Bring the cart's fee line into agreement with the configured fee.
 *
 * ⚠⚠ THE CALL BEFORE `initiatePaymentSession` IS THE ONE THAT MATTERS. Paystack
 * is handed an amount at initiate and nothing afterwards changes what the
 * customer pays, so that call is the only point where skipping this actually
 * costs money. `getCart()` is where it happens, because `initiatePaystack`
 * begins by calling it — if that ever stops being true, this needs its own
 * explicit call there.
 *
 * Never throws, and a failure returns `null`. A fee that won't sync must not
 * block a customer from checking out: under-collecting a fee is a far smaller
 * failure than a cart that refuses to proceed, so the caller carries on with
 * whatever line the cart already had.
 */
export async function syncPlatformFee(
  cartId: string,
): Promise<PlatformFeeSync | null> {
  try {
    const { platform_fee } = await sdk.client.fetch<{
      platform_fee: PlatformFeeSync;
    }>(`/store/carts/${cartId}/platform-fee`, { method: "POST" });
    return platform_fee ?? null;
  } catch (err) {
    console.error("[platform-fee] sync failed:", err);
    return null;
  }
}
