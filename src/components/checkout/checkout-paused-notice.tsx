import { Mail, MessageCircle, Phone, PauseCircle } from "lucide-react";
import { CHECKOUT_PAUSED_MESSAGE } from "@/lib/fulfillment-methods";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
  buildWhatsappUrl,
} from "@/lib/whatsapp";

/**
 * Shown on the delivery step instead of any form while BOTH pickup and
 * delivery are switched off in Settings → Platform (client, 2026-10-12):
 * checkout is paused and the customer is pointed at WhatsApp, phone and email.
 * Same contact layout as `OutsideAreaNotice`.
 */
export function CheckoutPausedNotice() {
  const whatsappUrl = buildWhatsappUrl(
    SUPPORT_PHONE,
    "Hello Packaging General, I'd like to place an order.",
  );

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-option border border-[rgba(251,44,54,0.4)] bg-[rgba(231,0,11,0.06)] px-4 py-3 text-sm text-brand"
    >
      <div className="flex items-start gap-3">
        <PauseCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <p className="font-medium leading-snug">{CHECKOUT_PAUSED_MESSAGE}</p>
      </div>

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-button bg-brand px-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <MessageCircle className="size-4" aria-hidden />
          Chat with us on WhatsApp
        </a>
      )}

      <div className="flex flex-col gap-1.5 text-xs text-muted sm:flex-row sm:flex-wrap sm:gap-x-5">
        <a
          href={`tel:${SUPPORT_PHONE}`}
          className="inline-flex items-center gap-1.5 hover:text-brand"
        >
          <Phone className="size-3.5" aria-hidden />
          {SUPPORT_PHONE_DISPLAY}
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-1.5 hover:text-brand"
        >
          <Mail className="size-3.5" aria-hidden />
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}
