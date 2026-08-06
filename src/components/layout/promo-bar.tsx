import { Tag } from "lucide-react";
import { getActivePromotion, getPromoBanner } from "@/lib/promotions";
import { promoOffer, promoScope } from "@/lib/promo-copy";

/**
 * Lavender announcement bar (Figma: Easter promo).
 *
 * Two sources, in priority order:
 *  1. The **banner message** set in admin (Promotions → Promotional Banner),
 *     stored in Medusa store metadata. First line is the headline, any further
 *     lines the supporting text — matching the preview the operator sees.
 *  2. Otherwise, copy derived from the live code-triggered promotion, so a
 *     promo advertises itself with no message typed at all.
 *
 * Renders nothing when the operator has paused the bar, or when there is
 * neither a message nor an active promotion — deactivating the promo in admin
 * removes the bar without a storefront deploy.
 */
export async function PromoBar() {
  const [promo, banner] = await Promise.all([
    getActivePromotion(),
    getPromoBanner(),
  ]);

  if (!banner.live) return null;

  const [headline, ...rest] = banner.message.split("\n");
  const subMessage = rest.join(" ").trim();
  const hasMessage = Boolean(headline?.trim());

  if (!hasMessage && !promo) return null;

  return (
    <div className="bg-accent text-accent-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-sm font-bold sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2">
          <Tag className="size-4 shrink-0" aria-hidden />
          {hasMessage ? (
            <span>{headline}</span>
          ) : (
            /* `promo` is non-null here: !hasMessage && !promo returned above. */
            <span>
              Enjoy <span className="text-white">{promoOffer(promo!)}</span>{" "}
              {promoScope(promo!)}
            </span>
          )}
        </span>

        {hasMessage
          ? subMessage && (
              <span className="font-medium text-white/90">{subMessage}</span>
            )
          : promo && (
              <span className="inline-flex items-center gap-2">
                Code:
                <span className="rounded-chip bg-white/25 px-2 py-0.5 tracking-wide">
                  {promo.code}
                </span>
              </span>
            )}
      </div>
    </div>
  );
}
