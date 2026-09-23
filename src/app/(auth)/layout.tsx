import Link from "next/link";
import { X } from "lucide-react";
import { BrandLockup } from "@/components/layout/brand-lockup";

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
            className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <BrandLockup priority />
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
