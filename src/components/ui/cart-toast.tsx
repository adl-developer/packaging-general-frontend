"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";

/**
 * Global "Added to cart!" toast — listens to the shared `cart:add` event bus
 * (see `lib/cart-events`) so any Add-to-Cart button anywhere triggers the same
 * confirmation pill without prop-drilling. Auto-dismisses after 2.5s; if a new
 * add fires while a toast is visible, the timer resets so the user sees it
 * extend rather than blink twice.
 */
const EVENT = "cart:add";
const VISIBLE_MS = 2500;

export function CartToast() {
  const [visible, setVisible] = React.useState(false);
  const [pulse, setPulse] = React.useState(0);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    function onAdd() {
      setVisible(true);
      setPulse((p) => p + 1);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(
        () => setVisible(false),
        VISIBLE_MS,
      );
    }
    window.addEventListener(EVENT, onAdd as EventListener);
    return () => {
      window.removeEventListener(EVENT, onAdd as EventListener);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-[140px] z-50 flex justify-center px-4 sm:left-auto sm:right-6 sm:top-[140px] sm:justify-end sm:px-0"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key={pulse}
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
            className="pointer-events-auto inline-flex items-center gap-2.5 rounded-card border border-line/60 bg-white py-3 pl-3 pr-5 text-sm font-medium text-brand shadow-lg"
            role="status"
          >
            <CheckCircle2
              className="size-5 fill-green-500 text-white"
              aria-hidden
            />
            Added to cart!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
