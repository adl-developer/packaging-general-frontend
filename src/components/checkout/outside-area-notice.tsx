"use client";

import * as React from "react";
import { Mail, MapPinOff, MessageCircle, Phone } from "lucide-react";
import { getCartItemSummary } from "@/lib/actions/checkout";
import {
  OUTSIDE_DELIVERY_AREA_MESSAGE,
  SUPPORT_EMAIL,
  outsideAreaEnquiry,
} from "@/lib/delivery-area";
import { buildWhatsappUrl } from "@/lib/whatsapp";

/**
 * Shown on the delivery step when the pin is outside Greater Accra (client,
 * 2026-09-24): home delivery is Greater Accra only, and anyone elsewhere is
 * pointed at support. WhatsApp opens with a message naming the address and
 * the cart's items; the phone and email sit beside it as plain text.
 *
 * The item summary is fetched only once this notice shows — the checkout
 * prefill read deliberately carries no items. Until it arrives the WhatsApp
 * message names the address alone, so the button works from the first frame.
 */
export function OutsideAreaNotice({
  readAddress,
  coords,
  pickupAvailable,
}: {
  /** The Delivery Address field's CURRENT text. A getter, not a value: Google
   *  Places and reverse-geocoding write the input directly (no React state),
   *  so the link re-reads it at click time. */
  readAddress: () => string;
  coords: { lat: number; lng: number } | null;
  /** Pickup is open to everyone; say so when the chooser offers it. */
  pickupAvailable: boolean;
}) {
  const [items, setItems] = React.useState<string[]>([]);
  React.useEffect(() => {
    let live = true;
    getCartItemSummary()
      .then((lines) => {
        if (live) setItems(lines);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const supportNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";
  const urlFor = (address: string) =>
    buildWhatsappUrl(supportNumber, outsideAreaEnquiry({ address, coords, items }));
  const whatsappUrl = urlFor(readAddress());
  const phone = formatGhanaPhone(supportNumber);

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-option border border-[rgba(251,44,54,0.4)] bg-[rgba(231,0,11,0.06)] px-4 py-3 text-sm text-brand"
    >
      <div className="flex items-start gap-3">
        <MapPinOff className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <div className="flex flex-col gap-1 leading-snug">
          <p className="font-medium">{OUTSIDE_DELIVERY_AREA_MESSAGE}</p>
          {pickupAvailable && (
            <p className="text-muted">
              You can also choose pickup and collect your order from our Accra
              location.
            </p>
          )}
        </div>
      </div>

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // Refresh with the address text as it is NOW (see readAddress).
            const fresh = urlFor(readAddress());
            if (fresh) e.currentTarget.href = fresh;
          }}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-button bg-brand px-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <MessageCircle className="size-4" aria-hidden />
          Chat with us on WhatsApp
        </a>
      )}

      <div className="flex flex-col gap-1.5 text-xs text-muted sm:flex-row sm:flex-wrap sm:gap-x-5">
        {phone && (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-1.5 hover:text-brand"
          >
            <Phone className="size-3.5" aria-hidden />
            {phone}
          </a>
        )}
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

/** "0241234567" / "233241234567" → "+233 24 123 4567"; "" when unset. */
function formatGhanaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const intl = digits.startsWith("0") ? `233${digits.slice(1)}` : digits;
  const m = /^233(\d{2})(\d{3})(\d{4})$/.exec(intl);
  return m ? `+233 ${m[1]} ${m[2]} ${m[3]}` : `+${intl}`;
}
