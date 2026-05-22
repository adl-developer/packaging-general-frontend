"use client";

import { motion, useReducedMotion } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";

// Enter transition on auth route changes (sign-in <-> sign-up). Opacity only.
export default function AuthTemplate({
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
