"use client";

import { motion, useReducedMotion } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";

// Enter transition on every shop route change. Opacity only — a transform here
// would break position:sticky inside pages (e.g. the customizer progress bar).
export default function ShopTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

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
