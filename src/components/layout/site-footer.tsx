import Link from "next/link";
import { Mail } from "lucide-react";

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

/** Global site footer (Figma: 4-column + business hours + copyright). */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <FooterHeading>Packaging General</FooterHeading>
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              West Africa&apos;s digital-first packaging platform for SMEs and
              growing brands.
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
            <FooterHeading>Community</FooterHeading>
            <p className="text-xs text-muted">
              Join packaging professionals across West Africa
            </p>
            <a
              href="mailto:support@packaginggeneral.com"
              className="inline-flex h-8 items-center justify-center gap-2 rounded-button bg-brand px-3 text-xs font-medium text-brand-foreground transition-colors hover:bg-brand/90"
            >
              <Mail className="size-4" aria-hidden />
              Contact Support
            </a>
            <div className="mt-2 flex flex-col gap-1 border-t border-line pt-4">
              <p className="text-sm font-semibold text-brand">
                Business Hours
              </p>
              <p className="text-xs text-muted">
                Mon - Fri: 8:00 AM - 6:00 PM (GMT)
              </p>
              <p className="text-xs text-muted">Sat: 9:00 AM - 2:00 PM (GMT)</p>
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
