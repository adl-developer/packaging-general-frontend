/**
 * Finds the order a Paystack payment already became, for the callback.
 *
 * The Paystack WEBHOOK places the order on the backend too. On 2026-10-06 two
 * customers paid on production but Paystack's callback brought them back to
 * staging: a different host, different cookies, a stale cart. Our own
 * `cart.complete()` failed on that stale cart, and they saw the "payment
 * received, your order needs confirmation" screen for orders the webhook had
 * already placed. So before showing that screen, the callback asks the
 * backend which order the payment's REFERENCE became
 * (`GET /store/paystack/orders/:reference`), retrying briefly in case the
 * webhook is still finishing.
 *
 * Pure apart from the injected lookup and sleep, so it is unit-testable. A
 * failed lookup counts as "not yet": this must never make the outcome worse
 * than the pending screen the customer would get anyway.
 */
export const COMPLETED_ORDER_DELAYS_MS = [0, 1000, 1500];

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
