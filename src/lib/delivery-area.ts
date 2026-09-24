import { GREATER_ACCRA_RING } from "@/lib/greater-accra-boundary";

/**
 * Greater Accra only home delivery (client, 2026-09-24) — the storefront's
 * DISPLAY twin of `backend/src/utils/delivery-area.ts`. Same outline, same
 * 200 m border tolerance, same messages. The backend's delivery route is the
 * rule (it refuses the save with 409); this copy only lets the delivery form
 * warn the moment the pin lands outside, instead of after "Continue".
 *
 * Pure and client-safe: no SDK, no `next/cache`.
 */

export const BORDER_TOLERANCE_M = 200;

/** ⚠ Verbatim copy of the backend's message. The SDK surfaces only a 409's
 *  message (not its `code`), so `isOutsideAreaRefusal` matches on this. */
export const OUTSIDE_DELIVERY_AREA_MESSAGE =
  "We currently deliver only within Greater Accra. To order for delivery elsewhere in Ghana, please contact us.";

export const SUPPORT_EMAIL = "info@packaginggeneral.com";

const EARTH_RADIUS_M = 6_371_000;
const RAD = Math.PI / 180;

function insideRing(lat: number, lng: number): boolean {
  let inside = false;
  const ring = GREATER_ACCRA_RING;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToBorderM(lat: number, lng: number): number {
  const ring = GREATER_ACCRA_RING;
  const kx = Math.cos(lat * RAD) * EARTH_RADIUS_M * RAD;
  const ky = EARTH_RADIUS_M * RAD;
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax = (ring[j][1] - lng) * kx;
    const ay = (ring[j][0] - lat) * ky;
    const bx = (ring[i][1] - lng) * kx;
    const by = (ring[i][0] - lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? -(ax * dx + ay * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

export function isWithinGreaterAccra(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (insideRing(lat, lng)) return true;
  return distanceToBorderM(lat, lng) <= BORDER_TOLERANCE_M;
}

/** True only when the restriction is on AND a pin is set AND it is outside.
 *  No pin yet = nothing to warn about (the form asks for one separately). */
export function isOutsideDeliveryArea(
  accraOnly: boolean,
  coords: { lat: number; lng: number } | null,
): boolean {
  if (!accraOnly || !coords) return false;
  return !isWithinGreaterAccra(coords.lat, coords.lng);
}

/** Did the backend refuse the delivery save for being out of area? */
export function isOutsideAreaRefusal(message: string | null | undefined): boolean {
  return message === OUTSIDE_DELIVERY_AREA_MESSAGE;
}

/** The WhatsApp message a customer outside the area sends support: where
 *  (address text + a map link to the exact pin) and what (the cart's goods). */
export function outsideAreaEnquiry(o: {
  address: string;
  coords?: { lat: number; lng: number } | null;
  items: string[];
}): string {
  const address = o.address.trim();
  const where = address ? ` to ${address}` : " outside Greater Accra";
  const pin = o.coords
    ? ` Map pin: https://maps.google.com/?q=${o.coords.lat.toFixed(6)},${o.coords.lng.toFixed(6)}.`
    : "";
  const items = o.items.length ? ` My order: ${o.items.join("; ")}.` : "";
  return `Hi Packaging General, I'd like to place an order for delivery${where}.${pin}${items} Can you help?`;
}
