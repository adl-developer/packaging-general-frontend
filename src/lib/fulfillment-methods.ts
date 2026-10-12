/**
 * Settings → Platform → "Customer pickup" / "Home delivery" switches (client,
 * 2026-10-12). Mirrors `backend/src/api/admin/pg/settings/fulfillment-methods.ts`.
 *
 * Decisions (user, 2026-10-12): a switched-off method stays VISIBLE at
 * checkout, greyed out as "Currently unavailable"; with BOTH off checkout is
 * paused and the customer is pointed at WhatsApp / phone / email.
 *
 * The backend's delivery route enforces the switches; this module only drives
 * what the delivery and payment steps show. Pure, client-safe.
 */

export type FulfillmentMethods = { pickup: boolean; delivery: boolean };

/** A store that never saved the switches offers both, as before they existed. */
export const DEFAULT_FULFILLMENT_METHODS: FulfillmentMethods = {
  pickup: true,
  delivery: true,
};

/** ⚠ Verbatim twins of the backend's 409 messages. */
export const PICKUP_OFF_MESSAGE =
  "Pickup is currently unavailable. Please choose delivery or contact us.";
export const DELIVERY_OFF_MESSAGE =
  "Delivery is currently unavailable. Please choose pickup or contact us.";
export const CHECKOUT_PAUSED_MESSAGE =
  "We're not taking orders online right now. Please contact us to place your order.";

export const UNAVAILABLE_LABEL = "Currently unavailable";

/** Parse the backend's `fulfillment_methods`; anything malformed reads as ON
 *  (same rule as the backend). */
export function parseFulfillmentMethods(raw: unknown): FulfillmentMethods {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FULFILLMENT_METHODS };
  const r = raw as Record<string, unknown>;
  return {
    pickup: typeof r.pickup === "boolean" ? r.pickup : true,
    delivery: typeof r.delivery === "boolean" ? r.delivery : true,
  };
}

/**
 * Can checkout go ahead at all? `pickupOffered` is whether the store has a
 * pickup point set up (pickup can be switched on but not configured). False
 * means the delivery step shows the paused notice instead of any form.
 */
export function checkoutOpen(
  methods: FulfillmentMethods,
  pickupOffered: boolean,
): boolean {
  return methods.delivery || (methods.pickup && pickupOffered);
}

/** Why a cart that already chose `method` can't be paid for now, or null. */
export function methodOffMessage(
  methods: FulfillmentMethods,
  method: "pickup" | "delivery",
): string | null {
  if (!methods.pickup && !methods.delivery) return CHECKOUT_PAUSED_MESSAGE;
  if (method === "pickup" && !methods.pickup) return PICKUP_OFF_MESSAGE;
  if (method === "delivery" && !methods.delivery) return DELIVERY_OFF_MESSAGE;
  return null;
}
