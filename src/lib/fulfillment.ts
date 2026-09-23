/**
 * Customer self-pickup (2026-09-22) — "did this cart choose pickup?", for
 * DISPLAY and PREFILL only. The backend never trusts this (cart metadata is
 * writable through the public cart API); it reads the charged shipping
 * option. Two signals, either is enough:
 *  - `cart.metadata.fulfillment_method === "pickup"` (written by the backend's
 *    delivery route when the customer chose pickup), and
 *  - `shipping_address.metadata.pickup === true` (the backend's marker on the
 *    pickup-point address it writes for pickup carts).
 */
export type FulfillmentMethod = "delivery" | "pickup";

type Meta = Record<string, unknown> | null | undefined;

export function isPickupCart(
  cartMetadata: Meta,
  shippingAddressMetadata: Meta,
): boolean {
  return (
    cartMetadata?.fulfillment_method === "pickup" ||
    shippingAddressMetadata?.pickup === true
  );
}

/** The method the cart last chose, or null when it never chose one. */
export function chosenMethod(cartMetadata: Meta): FulfillmentMethod | null {
  const m = cartMetadata?.fulfillment_method;
  return m === "pickup" || m === "delivery" ? m : null;
}

/**
 * "12 Spintex Rd, Accra" — without repeating a city the address already names
 * ("…Spintex Road, Accra, Ghana" stays as is). Same rule as the backend's
 * `addressLine` in utils/pickup.ts.
 */
export function addressLine(
  address: string,
  city: string | null | undefined,
): string {
  const a = address.trim();
  const c = (city ?? "").trim();
  if (!c) return a;
  const words = a.toLowerCase().split(/[^a-z0-9]+/);
  return words.includes(c.toLowerCase()) ? a : `${a}, ${c}`;
}
