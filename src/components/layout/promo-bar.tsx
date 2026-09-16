import { Tag } from "lucide-react";
import { getActivePromotion, getPromoBanner } from "@/lib/promotions";
import { promoMessage } from "@/lib/promo-copy";

/**
 * Lavender announcement bar (Figma: Easter promo).
 *
 * The text comes from `promoMessage` — the same helper the cart's promo box
 * uses — so the two surfaces always say the same thing:
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

  const message = promoMessage(promo, banner);
  if (!message) return null;

  return (
    <div className="bg-accent text-accent-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-sm font-bold sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2">
          <Tag className="size-4 shrink-0" aria-hidden />
          <span>{message.headline}</span>
        </span>

        {message.subMessage && (
          <span className="font-medium text-white/90">{message.subMessage}</span>
        )}
        {/* Only when the message doesn't already spell the code out. */}
        {message.code && (
          <span className="inline-flex items-center gap-2">
            Code:
            <span className="rounded-chip bg-white/25 px-2 py-0.5 tracking-wide">
              {message.code}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
