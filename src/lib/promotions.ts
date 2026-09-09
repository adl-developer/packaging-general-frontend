import { unstable_cache } from "next/cache";
import { sdk } from "@/lib/medusa";
import { CACHE_TAGS } from "@/lib/revalidate";

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

// Promotions change rarely but the header renders on every request. The
// state lives in Next's shared Data Cache (one entry for every function
// instance) for five minutes, tagged so an admin save of the banner drops it
// immediately via POST /api/revalidate; a Medusa promotion toggled in the
// admin shows within the five minutes. The module-level copy below is only
// the last-known-good value served when the backend is unreachable.
interface PromoState {
  promo: ActivePromotion | null;
  banner: PromoBanner;
}

let lastKnown: PromoState | undefined;
const PROMO_REVALIDATE_SECONDS = 5 * 60;

/** What a backend that predates the banner field implies: bar on, no override.
 *  Deploy order must never blank the promo bar. */
const DEFAULT_BANNER: PromoBanner = { live: true, message: "" };

const cachedPromoState = unstable_cache(
  async (): Promise<PromoState> => {
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
    return state;
  },
  ["promo-state"],
  { tags: [CACHE_TAGS.promotions], revalidate: PROMO_REVALIDATE_SECONDS },
);

async function getPromoState(): Promise<PromoState> {
  try {
    const state = await cachedPromoState();
    lastKnown = state;
    return state;
  } catch (err) {
    console.error("[promotions] active-promotion fetch failed:", err);
    // Serve the stale value if we have one; otherwise hide promo UI.
    return lastKnown ?? { promo: null, banner: DEFAULT_BANNER };
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
