"use client";

import * as React from "react";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface DivProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Grid/list container: reveals (once in view) and staggers its StaggerItems.
 * Reduced motion is handled globally by <MotionConfig reducedMotion="user"> in
 * the root layout (disables the transform rise, keeps the opacity fade). Do NOT
 * branch the tree on useReducedMotion — it causes SSR hydration mismatches.
 */
export function Stagger({ children, className }: DivProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
    >
      {children}
    </motion.div>
  );
}

/** One staggered child. Inherits hidden/visible from the parent Stagger. */
export function StaggerItem({ children, className }: DivProps) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
