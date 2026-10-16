import { formatReopenDate } from "@/lib/order-acceptance";
import { getOrderAcceptance } from "@/lib/site-content";
import { OrdersPausedBarView } from "./orders-paused-bar-view";

/**
 * Dark "We are not accepting orders right now" bar under the promo bar
 * (client mockup, 2026-10-16), shown while Order Acceptance is off on every
 * shop page EXCEPT the ones that show the "Orders paused" page itself (user,
 * 2026-10-16). Rendered inline in the sticky header like <PromoBar>: it
 * changes the header height, and the read is the cached site content.
 */
export async function OrdersPausedBar() {
  const state = await getOrderAcceptance();
  if (state.open) return null;
  return (
    <OrdersPausedBarView
      message={state.message}
      reopening={formatReopenDate(state.reopenDate)}
    />
  );
}
