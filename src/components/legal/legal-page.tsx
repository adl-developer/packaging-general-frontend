import { cn } from "@/lib/utils";

/**
 * Shared layout primitives for the legal pages (/terms, /privacy).
 * These pages have no Figma frame — they follow the site's design tokens.
 */

export function LegalShell({
  eyebrow,
  title,
  updated,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  lead: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <p className="text-xs font-bold uppercase tracking-wide text-rust">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-brand">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
      <p className="mt-6 text-base leading-7">{lead}</p>
      {children}
    </div>
  );
}

export function LegalToc({
  heading,
  items,
}: {
  heading: string;
  items: { id: string; label: string }[];
}) {
  return (
    <nav
      aria-label={heading}
      className="mt-8 rounded-card border border-line bg-surface px-6 py-5"
    >
      <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
        {heading}
      </h2>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm sm:columns-2 sm:gap-x-8">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-muted transition-colors hover:text-brand hover:underline"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-32">
      <h2 className="text-xl font-semibold text-brand">{title}</h2>
      {children}
    </section>
  );
}

export function LegalSubheading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-base font-semibold text-brand">{children}</h3>;
}

export function LegalText({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("mt-3 text-[15px] leading-7", className)}>{children}</p>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7">
      {children}
    </ul>
  );
}

export function LegalContactCard({ intro }: { intro: string }) {
  return (
    <div className="mt-12 rounded-card border border-line bg-surface px-6 py-6">
      <h2 className="text-xl font-semibold text-brand">Contact us</h2>
      <p className="mt-3 text-[15px] leading-7">{intro}</p>
      <p className="mt-3 text-[15px] leading-7">
        Email:{" "}
        <a
          href="mailto:info@packaginggeneral.com"
          className="underline hover:text-rust"
        >
          info@packaginggeneral.com
        </a>
        <br />
        Phone / WhatsApp:{" "}
        <a href="tel:02560999720" className="underline hover:text-rust">
          0256 099 9720
        </a>
        <br />
        Packaging General · EON Investments &amp; Industries · Accra, Ghana
      </p>
    </div>
  );
}
