"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface DivProps {
  children: React.ReactNode;
  className?: string;
}

/** Grid/list container: reveals (once in view) and staggers its StaggerItems. */
export function Stagger({ children, className }: DivProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

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
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
