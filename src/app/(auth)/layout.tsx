import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";

// Minimal auth chrome (Figma "Sign In" frame 458:14565): white page, header
// with brand lockup + close (X → home). No nav/promo/footer.
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-full flex-col bg-surface">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Image
              src="/logo.png"
              alt="Packaging General"
              width={33}
              height={40}
              priority
              className="h-10 w-auto"
            />
            <span className="flex flex-col">
              <span className="text-lg font-bold leading-7 tracking-tight text-brand">
                Packaging General
              </span>
              <span className="text-xs leading-4 text-muted">
                Digital-First Packaging
              </span>
            </span>
          </Link>
          <Link
            href="/"
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full text-brand transition-colors hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <X className="size-5" aria-hidden />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col justify-center py-8">{children}</main>
    </div>
  );
}
