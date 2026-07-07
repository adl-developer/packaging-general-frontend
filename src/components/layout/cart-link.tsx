"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCartPulse } from "@/lib/cart-events";
import { DURATION, EASE_PREMIUM, SPRING_TAP } from "@/lib/motion";

const navButton =
  "inline-flex h-8 items-center gap-2 rounded-button border border-line bg-background px-3 text-sm font-medium text-brand transition-colors hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/**
 * Header Cart link (client island). Seeded with the live Medusa line count
 * (server-fetched in SiteHeader) so the badge is right on first paint, then
 * subscribes to "cart:add"/"cart:set" events fired by Add-to-Cart buttons and
 * the cart page; bumps the icon (scale + tilt) and spring-pops the badge on
 * each event. Reduced motion is handled globally by
 * <MotionConfig reducedMotion="user"> — transforms drop out, opacity stays, so
 * the badge still fades in but the icon doesn't wiggle.
 */
export function CartLink({ initialCount = 0 }: { initialCount?: number }) {
  const { count, lastBumpAt } = useCartPulse(initialCount);

  return (
    <Link href="/cart" className={cn(navButton, "relative")}>
      {/* Icon: re-keyed on each bump so the keyframes replay once per add. */}
      <motion.span
        key={`icon-${lastBumpAt}`}
        animate={
          lastBumpAt === 0
            ? { scale: 1, rotate: 0 }
            : { scale: [1, 1.25, 1], rotate: [0, -10, 10, 0] }
        }
        transition={{ duration: DURATION.slow, ease: EASE_PREMIUM }}
        className="inline-flex"
      >
        <ShoppingCart className="size-4" aria-hidden />
      </motion.span>
      <span className="hidden sm:inline">Cart</span>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={SPRING_TAP}
            className="absolute -right-2 -top-2"
          >
            <Badge>{count}</Badge>
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
