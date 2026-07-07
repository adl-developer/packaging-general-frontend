"use client";

import * as React from "react";

/**
 * Cart pulse bus — a CustomEvent channel that keeps the header cart badge in
 * sync with the rest of the app.
 *
 * The badge counts cart LINES (distinct items), never unit quantities — a
 * single line of 50 cartons shows "1", matching the /cart page.
 *
 * Two events:
 *  - "cart:add"  → increment by `lines` NEW CART LINES (default 1; used for
 *                  optimistic adds when we don't know the new total, e.g.
 *                  cross-sell). Pass lines: 0 to only pulse the icon + toast
 *                  when an absolute cart:set was already fired.
 *  - "cart:set"  → set the line count absolutely (preferred — fired by the
 *                  /cart page after remove/edit/empty and by the customizer
 *                  with the cart returned from addLineItem, so the badge
 *                  mirrors the real Medusa cart line-item count).
 *
 * Both events bump `lastBumpAt` so the icon re-plays its scale/rotate
 * keyframes. SSR-safe (count is 0 on the server; client picks up events).
 */
const ADD_EVENT = "cart:add";
const SET_EVENT = "cart:set";

/** Fire a relative add — badge increments by `lines` (new cart LINES, not
 *  unit quantity). lines: 0 = pulse + toast only. */
export function notifyCartAdd(detail?: { lines?: number }) {
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
      const ce = e as CustomEvent<{ lines?: number } | undefined>;
      const lines = ce.detail?.lines ?? 1;
      setPulse((p) => ({
        count: Math.max(0, p.count + lines),
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
