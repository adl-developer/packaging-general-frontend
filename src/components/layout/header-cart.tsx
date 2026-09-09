import { getCartLineCount } from "@/lib/actions/cart";
import { CartLink } from "./cart-link";

/**
 * The header's cart pill, streamed. `getCartLineCount()` reads the cart
 * cookie and, when a cart exists, calls the backend — so it lives here, in
 * its own async Server Component behind a <Suspense> in SiteHeader, rather
 * than in the header itself. The header shell (and every page's loading.tsx
 * beneath this layout) is sent before this resolves; the pill then swaps in
 * place with the real count.
 *
 * Called exactly once per render: only here, never in the fallback.
 */
export async function HeaderCart() {
  const count = await getCartLineCount();
  return <CartLink initialCount={count} />;
}

/**
 * Suspense fallback — the same <CartLink> at count 0, which renders the pill
 * with no badge (the badge is gated on `count > 0`, and is absolutely
 * positioned anyway), so the swap to the real count is zero layout shift and
 * never shows a wrong number. When the streamed content replaces it, this
 * instance unmounts (its useCartPulse listeners go in the effect cleanup)
 * and the real one mounts fresh, seeded with the server count.
 */
export function HeaderCartFallback() {
  return <CartLink initialCount={0} />;
}
