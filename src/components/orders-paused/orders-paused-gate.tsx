import { getBusinessContact, getOrderAcceptance } from "@/lib/site-content";
import { OrdersPausedPanel } from "./orders-paused-panel";

/**
 * Shows the "Orders paused" page instead of `children` while Settings →
 * Order Acceptance is OFF. Used by the shopping routes only (home, products,
 * cart, checkout steps, reorder); track-order, account, sign-in, About, the
 * legal pages, the Paystack callback and the confirmation page keep working
 * (user, 2026-10-16).
 *
 * Presentation only: the backend refuses deliveries and payment sessions
 * while paused, so a stale tab or a direct API call can't place an order.
 */
export async function OrdersPausedGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const panel = await ordersPausedPanel();
  return panel ?? <>{children}</>;
}

/** For pages that return early: the panel when paused, else null. Both reads
 *  are the same cached site-content request. */
export async function ordersPausedPanel(): Promise<React.ReactElement | null> {
  const [state, contact] = await Promise.all([
    getOrderAcceptance(),
    getBusinessContact(),
  ]);
  return state.open ? null : <OrdersPausedPanel state={state} contact={contact} />;
}
