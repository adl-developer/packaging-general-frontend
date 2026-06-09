import { sdk } from "@/lib/medusa";

/** The live code-triggered promotion advertised across the storefront
 *  (promo bar, cart promo box). Served by the custom backend route
 *  GET /store/active-promotion. */
export interface ActivePromotion {
  code: string;
  /** Percentage (e.g. 10) or fixed GHS amount, per `valueType`. */
  value: number;
  valueType: "percentage" | "fixed";
}

interface ActivePromotionResponse {
  promotion: {
    code: string;
    value: number;
    value_type: string;
    target_type: string;
  } | null;
}

// Promotions change rarely but the header renders on every request — keep a
// short module-level cache (same pattern as cachedRegionId in lib/products.ts)
// so we don't hit the backend per page view.
let cached: { promo: ActivePromotion | null; at: number } | undefined;
const TTL_MS = 60_000;

/** Current active promotion, or null when none / backend unreachable.
 *  Displays should hide themselves when this returns null. */
export async function getActivePromotion(): Promise<ActivePromotion | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.promo;
  try {
    const { promotion } = await sdk.client.fetch<ActivePromotionResponse>(
      "/store/active-promotion"
    );
    const promo: ActivePromotion | null = promotion
      ? {
          code: promotion.code,
          value: Number(promotion.value ?? 0),
          valueType: promotion.value_type === "fixed" ? "fixed" : "percentage",
        }
      : null;
    cached = { promo, at: Date.now() };
    return promo;
  } catch (err) {
    console.error("[promotions] active-promotion fetch failed:", err);
    // Serve the stale value if we have one; otherwise hide promo UI.
    return cached?.promo ?? null;
  }
}
