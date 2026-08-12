import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getFooterHoursLines } from "@/lib/site-content";
import { supportWhatsappUrl } from "@/lib/whatsapp";

// Neutral opener — deliberately not page-aware. A footer button is a
// general-purpose entry point; guessing intent from the current URL would
// produce wrong messages on most pages.
const SUPPORT_MESSAGE = "Hi Packaging General — I need help with an order.";

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
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
 *  never goes blank on a store that has not saved any. */
const STATIC_HOURS_LINES = [
  "Mon - Fri: 8:00 AM - 6:00 PM (GMT)",
  "Sat: 9:00 AM - 2:00 PM (GMT)",
];

/** Global site footer (Figma: 4-column + business hours + copyright). */
export async function SiteFooter() {
  // supportWhatsappUrl returns null when NEXT_PUBLIC_SUPPORT_WHATSAPP is
  // unset/blank. The heading + sub-line + button are ONE CTA unit: the
  // sub-line ("Chat with our support team") is a verbal promise the button
  // fulfils, so rendering it with no button beneath would read worse than
  // showing nothing at all — hide all three together, never just the
  // button. Business Hours is unrelated, informationally independent
  // content (posted opening hours are useful whether or not chat is
  // configured) and always renders regardless.
  const whatsappUrl = supportWhatsappUrl(SUPPORT_MESSAGE);
  // Admin-configured hours (Settings → Business Hours) win once saved; the
  // static lines above render until then or when the backend is unreachable.
  const hoursLines = (await getFooterHoursLines()) ?? STATIC_HOURS_LINES;

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <FooterHeading>Packaging General</FooterHeading>
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
            {whatsappUrl && (
              <>
                <FooterHeading>Need Help?</FooterHeading>
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
            <div
              className={
                whatsappUrl
                  ? "mt-2 flex flex-col gap-1 border-t border-line pt-4"
                  : "flex flex-col gap-1"
              }
            >
              <p className="text-sm font-semibold text-brand">
                Business Hours
              </p>
              {hoursLines.map((line) => (
                <p key={line} className="text-xs text-muted">
                  {line}
                </p>
              ))}
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
