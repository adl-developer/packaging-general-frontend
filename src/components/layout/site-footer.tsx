import { Suspense } from "react";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { getFooterHoursLines } from "@/lib/site-content";
import { SUPPORT_EMAIL, supportWhatsappUrl } from "@/lib/whatsapp";
import { BrandLockup } from "./brand-lockup";

// Neutral opener — deliberately not page-aware. A footer button is a
// general-purpose entry point; guessing intent from the current URL would
// produce wrong messages on most pages.
const SUPPORT_MESSAGE = "Hi Packaging General, I need help with an order.";

// "Contact" is deliberately absent: there is no /contact page yet, and a
// footer link to a 404 (plus its prefetch on every page view) is worse than no
// link. Support reaches customers through the WhatsApp CTA in the same footer.
// Re-add `{ label: "Contact", href: "/contact" }` once the page exists.
const companyLinks = [
  { label: "About Us", href: "/about" },
];

const legalLinks = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
];

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-brand">
      {children}
    </h3>
  );
}

function LinkList({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {links.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            className="text-xs text-muted transition-colors hover:text-brand"
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The footer's original static hours — still shown until business hours are
 *  configured in the admin portal (Settings → Business Hours), so the footer
 *  never goes blank on a store that has not saved any.
 *  ⚠ The admin editor's prefill (`backend/src/api/admin/pg/settings/
 *  site-content.ts`, `defaultBusinessHours`) mirrors these exact times —
 *  change both together. */
const STATIC_HOURS_LINES = [
  "Mon - Fri: 8:00 AM - 6:00 PM (GMT)",
  "Sat: 9:00 AM - 2:00 PM (GMT)",
];

function HoursLines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line} className="text-xs text-muted">
          {line}
        </p>
      ))}
    </>
  );
}

/**
 * The hours lines, streamed. `getFooterHoursLines()` is the footer's only
 * backend read, so it is the only part behind a <Suspense> — the rest of the
 * footer is part of the shell. Admin-configured hours (Settings → Business
 * Hours) win once saved; the static lines render until then or when the
 * backend is unreachable. The Suspense fallback is those same static lines,
 * so the swap is either a no-op or a text change within the same block.
 */
async function FooterHours() {
  const hoursLines = (await getFooterHoursLines()) ?? STATIC_HOURS_LINES;
  return <HoursLines lines={hoursLines} />;
}

/** Global site footer (Figma: 4-column + business hours + copyright).
 *  Synchronous shell — the one await lives in <FooterHours>. */
export function SiteFooter() {
  // supportWhatsappUrl returns null only if SUPPORT_PHONE is ever blanked
  // (lib/whatsapp.ts). The sub-line + button are ONE CTA unit: the sub-line
  // ("Chat with our support team") is a verbal promise the button fulfils,
  // so they hide together, never just the button. The "Need Help?" heading
  // stays because the support email below it always renders. Business Hours
  // is independent content and always renders regardless.
  const whatsappUrl = supportWhatsappUrl(SUPPORT_MESSAGE);

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <BrandLockup size="footer" />
            </Link>
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              Standardized packaging for SMEs and growing brands across Ghana
              &amp; West Africa.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <FooterHeading>Company</FooterHeading>
            <LinkList links={companyLinks} />
          </div>

          <div className="flex flex-col gap-3">
            <FooterHeading>Legal</FooterHeading>
            <LinkList links={legalLinks} />
          </div>

          <div className="flex flex-col gap-3">
            <FooterHeading>Need Help?</FooterHeading>
            {whatsappUrl && (
              <>
                <p className="text-xs text-muted">Chat with our support team</p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-button bg-brand px-2.5 text-xs font-medium text-brand-foreground transition-colors hover:bg-brand/90"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  Chat Live with Support
                </a>
              </>
            )}
            {/* Support email under the chat button (user, 2026-10-05). Always
                shown, so "Need Help?" never goes empty even if the WhatsApp
                line is blanked. Same address as the legal pages and the
                checkout's outside-area notice (`SUPPORT_EMAIL`). */}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 self-start text-xs text-muted transition-colors hover:text-brand"
            >
              <Mail className="size-4 shrink-0" aria-hidden />
              {SUPPORT_EMAIL}
            </a>
            <div className="mt-2 flex flex-col gap-1 border-t border-line pt-4">
              <p className="text-sm font-semibold text-brand">
                Business Hours
              </p>
              <Suspense fallback={<HoursLines lines={STATIC_HOURS_LINES} />}>
                <FooterHours />
              </Suspense>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-6 text-center">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Packaging General. Built for Africa.
          </p>
        </div>
      </div>
    </footer>
  );
}
