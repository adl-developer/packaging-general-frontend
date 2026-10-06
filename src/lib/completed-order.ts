/**
 * Finds the order a cart already became, for the Paystack callback.
 *
 * The Paystack WEBHOOK completes the cart on the backend too, and when it gets
 * there first the browser's own `cart.complete()` fails: a 404 while the
 * webhook's completion is still running, a 400 once it has finished. Both
 * happened on 2026-10-06, and the customer saw the "payment received, order
 * needs confirmation" screen for an order that had been placed. So before
 * showing that screen, ask the backend (`GET /store/carts/:id/order`), and
 * keep asking for a few seconds: in the 404 case the order appeared ~3 s later.
 *
 * Pure apart from the injected lookup and sleep, so it is unit-testable. A
 * failed lookup counts as "not yet": this must never make the outcome worse
 * than the pending screen the customer would get anyway.
 */
export const COMPLETED_ORDER_DELAYS_MS = [0, 1500, 1500, 2000, 2000];

export async function findCompletedOrder(
  lookup: () => Promise<string | null>,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
  delaysMs: number[] = COMPLETED_ORDER_DELAYS_MS,
): Promise<string | null> {
  for (const delay of delaysMs) {
    if (delay > 0) await sleep(delay);
    try {
      const orderId = await lookup();
      if (orderId) return orderId;
    } catch {
      // Treat as "no order yet" and try again.
    }
  }
  return null;
}
