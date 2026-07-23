"use client";

import type { CartItem } from "@/app/(shop)/cart/map-cart";

/**
 * Client-side cart handoff: Add to Cart → /cart without re-fetching.
 *
 * The add-to-cart server actions already return the FULL updated cart in the
 * mutation response, yet the /cart page used to re-fetch that same cart from
 * the backend on arrival — the entire "skeleton hangs before items appear"
 * wait. Instead, the add flow deposits the mapped line items here (a plain
 * module-level variable — it survives a client-side router.push because no
 * page reload happens) and the cart page picks them up on mount and paints
 * instantly, skipping its own fetch.
 *
 * Freshness: the handoff is single-use (taking it clears it) and expires after
 * a few seconds — it only exists to cover the add → navigate hop. Any other
 * entry to /cart (deep link, reload, back-button after long idle) finds no
 * handoff and does its normal fetch.
 */
let handoff: { items: CartItem[]; at: number } | null = null;

/** How long a deposited cart stays valid. Generous vs the ~instant router.push
 *  it needs to survive, but far too short to ever serve a stale cart. */
const MAX_AGE_MS = 15_000;

export function setCartHandoff(items: CartItem[]): void {
  handoff = { items, at: Date.now() };
}

/** Take (and clear) the handed-off cart, or null when absent/expired. */
export function takeCartHandoff(): CartItem[] | null {
  if (!handoff) return null;
  const { items, at } = handoff;
  handoff = null;
  return Date.now() - at <= MAX_AGE_MS ? items : null;
}
