import { sdk } from "@/lib/medusa";

/** The live code-triggered promotion advertised across the storefront
 *  (promo bar, cart promo box). Served by the custom backend route
 *  GET /store/active-promotion. */
export interface ActivePromotion {
  code: string;
  /** Percentage (e.g. 10) or fixed GHS amount, per `valueType`. */
  value: number;
  valueType: "percentage" | "fixed";
  /** Campaign name (e.g. "Easter") for promo-specific copy, or null. */
  campaignName: string | null;
}

/** The announcement-bar override set in admin (Promotions → Promotional
 *  Banner), persisted in Medusa store metadata. */
export interface PromoBanner {
  /** False = the operator paused the bar; hide it even with a live promotion. */
  live: boolean;
  /** Empty = no override; describe the active promotion instead. First line is
   *  the headline, any further lines the supporting text. */
  message: string;
}

interface ActivePromotionResponse {
  promotion: {
    code: string;
    value: number;
    value_type: string;
    target_type: string;
    campaign_name: string | null;
  } | null;
  /** Absent on a backend older than 2026-08-06 — see `DEFAULT_BANNER`. */
  banner?: { live: boolean; message: string };
}

// Promotions change rarely but the header renders on every request — keep a
// short module-level cache (same pattern as cachedRegionId in lib/products.ts)
// so we don't hit the backend per page view.
interface PromoState {
  promo: ActivePromotion | null;
  banner: PromoBanner;
}

let cached: { state: PromoState; at: number } | undefined;
const TTL_MS = 60_000;

/** What a backend that predates the banner field implies: bar on, no override.
 *  Deploy order must never blank the promo bar. */
const DEFAULT_BANNER: PromoBanner = { live: true, message: "" };

async function getPromoState(): Promise<PromoState> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.state;
  try {
    const { promotion, banner } =
      await sdk.client.fetch<ActivePromotionResponse>(
        "/store/active-promotion"
      );
    const state: PromoState = {
      promo: promotion
        ? {
            code: promotion.code,
            value: Number(promotion.value ?? 0),
            valueType:
              promotion.value_type === "fixed" ? "fixed" : "percentage",
            campaignName: promotion.campaign_name ?? null,
          }
        : null,
      banner: banner
        ? {
            live: banner.live !== false,
            message:
              typeof banner.message === "string" ? banner.message.trim() : "",
          }
        : DEFAULT_BANNER,
    };
    cached = { state, at: Date.now() };
    return state;
  } catch (err) {
    console.error("[promotions] active-promotion fetch failed:", err);
    // Serve the stale value if we have one; otherwise hide promo UI.
    return cached?.state ?? { promo: null, banner: DEFAULT_BANNER };
  }
}

/** Current active promotion, or null when none / backend unreachable.
 *  Displays should hide themselves when this returns null. */
export async function getActivePromotion(): Promise<ActivePromotion | null> {
  return (await getPromoState()).promo;
}

/** The admin-controlled announcement bar. Shares one cached fetch with
 *  `getActivePromotion` — the header needs both and must not pay twice. */
export async function getPromoBanner(): Promise<PromoBanner> {
  return (await getPromoState()).banner;
}
