"use client";

import * as React from "react";

/**
 * Cart pulse bus — a CustomEvent channel that keeps the header cart badge in
 * sync with the rest of the app.
 *
 * Two events:
 *  - "cart:add"  → increment by qty (used when we don't know the new total,
 *                  e.g. cross-sell adds).
 *  - "cart:set"  → set the count absolutely (preferred — fired by the /cart
 *                  page after remove/edit/empty and by the customizer with
 *                  the cart returned from addLineItem, so the badge mirrors
 *                  the real Medusa cart line-item count).
 *
 * Both events bump `lastBumpAt` so the icon re-plays its scale/rotate
 * keyframes. SSR-safe (count is 0 on the server; client picks up events).
 */
const ADD_EVENT = "cart:add";
const SET_EVENT = "cart:set";

/** Fire a relative add (badge increments by qty). */
export function notifyCartAdd(detail?: { qty?: number }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADD_EVENT, { detail }));
}

/** Fire an absolute count — preferred when you know the real cart total. */
export function notifyCartCount(count: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SET_EVENT, { detail: { count } }),
  );
}

interface CartPulse {
  count: number;
  /** Monotonically increasing — use as a motion `key` to retrigger the icon bump. */
  lastBumpAt: number;
}

/** Header cart pulse — listens for both relative adds and absolute sets.
 *  `initialCount` seeds the badge with the real Medusa line count (fetched
 *  server-side in the header) so it's correct on first paint, not 0. */
export function useCartPulse(initialCount = 0): CartPulse {
  const [pulse, setPulse] = React.useState<CartPulse>({
    count: initialCount,
    lastBumpAt: 0,
  });

  React.useEffect(() => {
    const onAdd = (e: Event) => {
      const ce = e as CustomEvent<{ qty?: number } | undefined>;
      const qty = ce.detail?.qty ?? 1;
      setPulse((p) => ({
        count: Math.max(0, p.count + qty),
        lastBumpAt: p.lastBumpAt + 1,
      }));
    };
    const onSet = (e: Event) => {
      const ce = e as CustomEvent<{ count?: number } | undefined>;
      const next = Number(ce.detail?.count ?? 0);
      setPulse((p) => ({
        count: Math.max(0, Number.isFinite(next) ? next : 0),
        lastBumpAt: p.lastBumpAt + 1,
      }));
    };
    window.addEventListener(ADD_EVENT, onAdd as EventListener);
    window.addEventListener(SET_EVENT, onSet as EventListener);
    return () => {
      window.removeEventListener(ADD_EVENT, onAdd as EventListener);
      window.removeEventListener(SET_EVENT, onSet as EventListener);
    };
  }, []);

  return pulse;
}
