import Link from "next/link";
import Image from "next/image";
import { PromoBar } from "./promo-bar";
import { AccountMenu, type AccountUser } from "./account-menu";
import { CartLink } from "./cart-link";
import { getCustomer } from "@/lib/actions/auth";

/**
 * Global site header: brand lockup + Cart/Account, with the promo bar
 * stacked beneath it (matching the Figma). The whole block is sticky. The
 * cart count + bump animation come from useCartPulse via <CartLink/>.
 *
 * Server Component — resolves the signed-in customer so the account menu shows
 * the logged-in variant (name/email + My Orders/Logout) when authenticated.
 */
export async function SiteHeader() {
  const customer = await getCustomer();
  const user: AccountUser | undefined = customer
    ? {
        name:
          [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
          customer.email,
        email: customer.email,
      }
    : undefined;

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
            <CartLink />
            <AccountMenu user={user} />
          </nav>
        </div>
      </div>
      <PromoBar />
    </header>
  );
}
