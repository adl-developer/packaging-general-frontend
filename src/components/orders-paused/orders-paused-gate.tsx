import { getBusinessContact, getOrderAcceptance } from "@/lib/site-content";
import { OrdersPausedPanel } from "./orders-paused-panel";

/**
 * Shows the "Orders paused" page instead of `children` while Settings →
 * Order Acceptance is OFF. Used by home, cart, the checkout steps and
 * reorder only (`isPausedPageRoute` in lib/order-acceptance.ts lists them).
 * Products stay browsable with Add to Cart / Buy Now disabled ("Just
 * Browse"); every other page shows the header's notice bar (user,
 * 2026-10-16).
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
