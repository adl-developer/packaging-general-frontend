"use client";

import { m } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";

// Enter transition on every shop route change. Opacity only — a transform here
// would break position:sticky inside pages (e.g. the customizer progress bar).
// Reduced motion: <MotionConfig reducedMotion="user"> keeps opacity, so this
// gentle fade still plays (acceptable) without any movement.
// DURATION.fast, not base: the fade sits on the critical path of every
// navigation, after the server has already answered — 0.4 s of it was pure
// wait (speed review 2026-09-08).
export default function ShopTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.fast, ease: EASE_PREMIUM }}
    >
      {children}
    </m.div>
  );
}
