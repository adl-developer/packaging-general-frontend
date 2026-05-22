"use client";

import * as React from "react";
import { motion } from "motion/react";
import { DURATION, EASE_PREMIUM, REVEAL_DISTANCE } from "@/lib/motion";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** When false, keep opacity 1 and only translate (use for LCP elements). */
  fade?: boolean;
}

/**
 * Fades + rises its children when scrolled into view (once). Reduced motion is
 * handled globally by <MotionConfig reducedMotion="user"> in the root layout,
 * which disables the transform (rise) while keeping the opacity fade. Do NOT
 * branch the rendered tree on useReducedMotion here — the server can't know the
 * preference, so a structural branch causes SSR hydration mismatches.
 */
export function Reveal({ children, className, fade = true }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: fade ? 0 : 1, y: REVEAL_DISTANCE }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
    >
      {children}
    </motion.div>
  );
}
