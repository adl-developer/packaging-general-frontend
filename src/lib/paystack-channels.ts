/**
 * The payment step's Mobile Money / Card choice, as Paystack channels.
 *
 * Sent as `data.channels` on initiatePaymentSession; the backend's patched
 * Paystack plugin forwards it to /transaction/initialize (see backend
 * `scripts/patch-paystack-rounding.mjs`), so the hosted page opens on that
 * method only. Anything unrecognised gives `undefined`: no restriction, and
 * Paystack offers every channel as it did before (2026-10-06).
 */
export type PaymentMethodChoice = "mobile_money" | "card";

export function paystackChannels(method: unknown): string[] | undefined {
  if (method === "mobile_money") return ["mobile_money"];
  if (method === "card") return ["card"];
  return undefined;
}
