import type { Transition, Variants } from "motion/react";

/** Motion tokens — single source of truth for the storefront's animation feel. */
export const DURATION = { fast: 0.2, base: 0.4, slow: 0.6 } as const;

/** Premium ease-out cubic bezier (calm settle). */
export const EASE_PREMIUM: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
};
export const SPRING_TAP: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
};

/** Distance (px) elements rise as they reveal. */
export const REVEAL_DISTANCE = 16;
/** Delay (s) between staggered children. */
export const STAGGER_CHILD = 0.06;

/** Container that staggers its (variant-driven) children on reveal. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_CHILD } },
};

/** Child of a stagger container — fade + rise. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: REVEAL_DISTANCE },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_PREMIUM },
  },
};
