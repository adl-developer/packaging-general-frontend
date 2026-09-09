import { ChevronDown, Menu, User } from "lucide-react";
import { getCustomer } from "@/lib/actions/auth";
import { AccountMenu, type AccountUser } from "./account-menu";
import { navButton } from "./nav-button";

/**
 * The header's account menu, streamed. `getCustomer()` reads the auth cookie
 * and, when signed in, calls the backend — so it lives in its own async
 * Server Component behind a <Suspense> in SiteHeader. The auth actions call
 * `revalidatePath("/", "layout")`, so sign-in/out re-runs this on the next
 * render exactly as it re-ran the old async header.
 *
 * Called exactly once per render: only here, never in the fallback.
 */
export async function HeaderAccount() {
  const customer = await getCustomer();
  const user: AccountUser | undefined = customer
    ? {
        name:
          [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
          customer.email,
        email: customer.email,
      }
    : undefined;
  return <AccountMenu user={user} />;
}

/**
 * Suspense fallback — the AccountMenu trigger's exact shape (User icon +
 * "Account" + hamburger/chevron in the same `navButton` pill, inside the
 * same `relative` wrapper) as an inert, aria-hidden <div>. The signed-in and
 * signed-out menus share this trigger and differ only in the dropdown, so
 * nothing here reads as "Sign in" to a signed-in customer, and the swap to
 * the real <button> is zero layout shift. Deliberately not a <button>: it
 * must not be focusable or announced while it cannot open anything.
 */
export function HeaderAccountFallback() {
  return (
    <div className="relative">
      <div aria-hidden className={navButton}>
        <User className="size-4" aria-hidden />
        <span className="hidden sm:inline">Account</span>
        <Menu className="size-4 sm:hidden" aria-hidden />
        <ChevronDown
          className="hidden size-3 transition-transform sm:inline-block"
          aria-hidden
        />
      </div>
    </div>
  );
}
