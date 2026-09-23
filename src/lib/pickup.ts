import { sdk } from "@/lib/medusa";

/**
 * Customer self-pickup (2026-09-22) — where a pickup customer collects from.
 * Served by the backend's `GET /store/pickup-location` from Settings →
 * Business Location in the admin portal.
 */
export interface PickupLocation {
  address: string;
  city: string;
  lat: number;
  lng: number;
  /** The number the customer calls before coming. */
  phone: string | null;
  instructions: string | null;
  /** Plain Google Maps link to the pin. */
  maps_url: string;
  /** One-line address for customers (absent on an older backend). */
  display?: string;
}

/**
 * The pickup point, or null when pickup is not offered (no location, no
 * phone, or no pickup option on the store — the backend decides) or the
 * backend can't be reached / predates pickup. Null always means "show
 * delivery only", which is exactly the checkout that existed before pickup —
 * so an outage here never blocks an order.
 *
 * Not cached on purpose: /checkout/delivery is force-dynamic and this is one
 * small request run beside the prefill read; the backend already sends a
 * 60 s Cache-Control.
 */
export async function getPickupLocation(): Promise<PickupLocation | null> {
  try {
    const res = await sdk.client.fetch<{
      available: boolean;
      location: PickupLocation | null;
    }>("/store/pickup-location");
    return res.available && res.location ? res.location : null;
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status !== 404) console.error("[pickup] location unavailable:", err);
    return null;
  }
}
