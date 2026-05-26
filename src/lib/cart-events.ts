"use client";

import * as React from "react";

/**
 * Lightweight session-local cart pulse — a CustomEvent bus that lets every
 * Add-to-Cart button trigger a visual bump on the header cart icon, without a
 * cart-state provider yet. SSR-safe (count is 0 on the server; client picks up
 * subsequent events).
 *
 * TODO(medusa): once the live Medusa cart store is wired, replace useCartPulse
 * with the real cart-count hook; the header icon animates the same way on
 * count change.
 */
const EVENT = "cart:add";

/** Fire a cart-add event so the header CartLink can animate. */
export function notifyCartAdd(detail?: { qty?: number }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
}

interface CartPulse {
  count: number;
  /** Monotonically increasing — use as a motion `key` to retrigger the icon bump. */
  lastBumpAt: number;
}

/** Session-local cart pulse. */
export function useCartPulse(): CartPulse {
  const [pulse, setPulse] = React.useState<CartPulse>({
    count: 0,
    lastBumpAt: 0,
  });

  React.useEffect(() => {
    function onAdd(e: Event) {
      const ce = e as CustomEvent<{ qty?: number } | undefined>;
      const qty = ce.detail?.qty ?? 1;
      setPulse((p) => ({
        count: p.count + qty,
        lastBumpAt: p.lastBumpAt + 1,
      }));
    }
    window.addEventListener(EVENT, onAdd as EventListener);
    return () => window.removeEventListener(EVENT, onAdd as EventListener);
  }, []);

  return pulse;
}
