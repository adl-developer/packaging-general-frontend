import { Poppins } from "next/font/google";
import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import {
  formatGhanaPhone,
  formatReopenDate,
  pausedMessage,
  type OrderAcceptance,
} from "@/lib/order-acceptance";
import type { BusinessContact } from "@/lib/site-content";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
} from "@/lib/whatsapp";

/**
 * "Orders paused" page (client mockup, light version, 2026-10-16). Rendered
 * in place of a shopping page's content while Settings → Order Acceptance is
 * OFF; the site header, promo bar and footer stay around it.
 *
 * Built from the mockup image (no Figma frame). Deviations by decision
 * (user, 2026-10-16): the real support line instead of the mockup's
 * placeholder number, no Instagram/Facebook icons until there are links, no
 * second logo (the "Temporarily closed" badge sits alone, centred) and no
 * copyright line in the contact strip (the site footer has one).
 */
/**
 * Heading: Poppins ExtraBold for EVERY visitor (user, 2026-10-16), at the
 * Figma frame's 120px, line height 110.4px (0.92), letter-spacing -3.6px
 * (-0.03em), #282827.
 *
 * ⚠ Figma names Century Gothic Bold, but it was deliberately not used:
 *  - it is a commercial face with no web licence here, so it would only show
 *    on PCs that have it installed, never on Android/iPhone;
 *  - it renders much lighter than the mockup (stroke ÷ letter height 0.18 vs
 *    the mockup's 0.26). Poppins ExtraBold measures 0.28, Bold 0.24.
 * Inter, the site font, read too narrow.
 */
const heading = Poppins({ subsets: ["latin"], weight: "800", display: "swap" });

export function OrdersPausedPanel({
  state,
  contact,
  now,
}: {
  state: OrderAcceptance;
  /** Settings → Business Location; unset fields fall back to the support
   *  line and "Accra, Ghana". */
  contact: BusinessContact;
  now?: Date;
}) {
  const reopening = formatReopenDate(state.reopenDate, now);
  const phoneDisplay = contact.phone
    ? formatGhanaPhone(contact.phone)
    : SUPPORT_PHONE_DISPLAY;
  const phoneHref = (contact.phone ?? SUPPORT_PHONE).replace(/[^\d+]/g, "");
  const location = contact.location ?? "Accra, Ghana";

  return (
    <section
      aria-labelledby="orders-paused-heading"
      className="relative isolate overflow-hidden border-b border-line bg-[#f3eee9]"
    >
      {/* Soft warm glows from the mockup: rose top-right, grey left. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_85%_10%,rgba(214,170,150,0.28),transparent_70%),radial-gradient(45%_60%_at_0%_45%,rgba(196,188,176,0.35),transparent_70%)]"
      />

      {/* Top bar: the status badge alone, centred. The mockup's second logo
          was dropped (user, 2026-10-16): the site header already has it. */}
      <div className="border-b border-[rgba(196,188,176,0.6)]">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-5 sm:px-6 lg:px-8">
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(150,64,34,0.45)] bg-[rgba(150,64,34,0.07)] px-3 py-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.18em] text-rust sm:px-3.5 sm:text-[11px]">
            <span aria-hidden className="size-1.5 rounded-full bg-rust" />
            Temporarily closed
          </span>
        </div>
      </div>

      {/* Hero copy. */}
      <div className="mx-auto max-w-7xl px-4 pt-14 pb-14 sm:px-6 sm:pt-20 sm:pb-20 lg:px-8 lg:pl-[8.5rem]">
        <p className="text-xs font-medium uppercase leading-4 tracking-[0.25em] text-taupe sm:text-sm">
          We will be back shortly
        </p>
        <h1
          id="orders-paused-heading"
          // 120px on desktop per Figma, scaled down on smaller screens with
          // the same ratios.
          className={`${heading.className} mt-6 font-extrabold leading-[0.92] tracking-[-0.03em] text-[4rem] sm:text-[6rem] lg:text-[120px]`}
        >
          <span className="block text-dark">Orders</span>
          <span className="block text-rust">paused.</span>
        </h1>
        <p className="mt-8 max-w-[34rem] text-base leading-7 text-[#6b625a] sm:text-lg sm:leading-7">
          {pausedMessage(state)}
        </p>
        {reopening && (
          <p className="mt-7 inline-flex max-w-full items-center gap-2.5 rounded-button border border-line bg-surface px-4 py-2.5 text-sm leading-5 text-muted">
            <Clock className="size-4 shrink-0 text-rust" aria-hidden />
            <span>
              Expected reopening:{" "}
              <span className="font-medium text-brand">{reopening}</span>
            </span>
          </p>
        )}
        <div
          aria-hidden
          className="mt-12 h-px max-w-3xl bg-gradient-to-r from-[rgba(150,64,34,0.35)] via-[rgba(196,188,176,0.6)] to-transparent sm:mt-14"
        />
        {/* "Just Browse" (client mockup, 2026-10-16): products stay viewable
            while paused, with Add to Cart / Buy Now disabled. */}
        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/products"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-button bg-dark px-5 text-sm font-medium text-dark-foreground transition-colors hover:bg-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Just Browse
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <p className="text-xs leading-4 text-[#a49a87]">
            Explore our products - ordering will be available once we reopen.
          </p>
        </div>
      </div>

      {/* Contact strip. */}
      <div className="border-t border-[rgba(196,188,176,0.6)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <ul className="flex flex-col gap-3 text-sm leading-5 text-[#5a5048] sm:flex-row sm:flex-wrap sm:gap-x-8">
            <li>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 transition-colors hover:text-brand"
              >
                <Mail className="size-4 shrink-0 text-muted" aria-hidden />
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li>
              <a
                href={`tel:${phoneHref}`}
                className="inline-flex items-center gap-2 transition-colors hover:text-brand"
              >
                <Phone className="size-4 shrink-0 text-muted" aria-hidden />
                {phoneDisplay}
              </a>
            </li>
            <li className="inline-flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
              {location}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
