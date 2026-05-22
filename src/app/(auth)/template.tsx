"use client";

import { motion } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";

// Enter transition on auth route changes (sign-in <-> sign-up). Opacity only.
// Reduced motion is handled globally by <MotionConfig reducedMotion="user">.
export default function AuthTemplate({
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
