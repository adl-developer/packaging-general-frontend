"use client";

import { motion } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";

// Enter transition on every shop route change. Opacity only — a transform here
// would break position:sticky inside pages (e.g. the customizer progress bar).
// Reduced motion: <MotionConfig reducedMotion="user"> keeps opacity, so this
// gentle fade still plays (acceptable) without any movement.
export default function ShopTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
    >
      {children}
    </motion.div>
  );
}
