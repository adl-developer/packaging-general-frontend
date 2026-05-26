import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PromoBar } from "./promo-bar";
import { AccountMenu } from "./account-menu";
import { cn } from "@/lib/utils";

const navButton =
  "inline-flex h-8 items-center gap-2 rounded-button border border-line bg-background px-3 text-sm font-medium text-brand transition-colors hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/**
 * Global site header: brand lockup + Cart/Account, with the promo bar
 * stacked beneath it (matching the Figma). The whole block is sticky.
 * cartCount will be fed from the Medusa cart once the backend is wired.
 */
export function SiteHeader({ cartCount = 0 }: { cartCount?: number }) {
  return (
    <header className="sticky top-0 z-50 shadow-header">
      <div className="border-b border-line bg-surface">
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
              {/* Subtitle is desktop-only — mobile Figma hides it for space. */}
              <span className="hidden text-xs leading-4 text-muted sm:inline">
                Digital-First Packaging
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link href="/cart" className={cn(navButton, "relative")}>
              <ShoppingCart className="size-4" aria-hidden />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <Badge className="absolute -right-2 -top-2">{cartCount}</Badge>
              )}
            </Link>
            {/* TODO(medusa): pass the signed-in user to show the logged-in menu. */}
            <AccountMenu />
          </nav>
        </div>
      </div>
      <PromoBar />
    </header>
  );
}
