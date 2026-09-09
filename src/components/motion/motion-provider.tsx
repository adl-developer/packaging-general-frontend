"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * Root motion providers, composed once here because both are client
 * components and `domAnimation` (an object of functions) can't cross the RSC
 * boundary as a prop from the server-rendered root layout.
 *
 * `LazyMotion` + `m`: every animated element in `src/**` renders `m.*`
 * (never `motion.*`), so the app ships only the `domAnimation` feature set —
 * animate / exit / whileInView + hover / tap / focus gestures — instead of the
 * full `motion` bundle (which is exactly `m` + `domMax`: drag + layout /
 * projection on top). `strict` makes any stray `motion.*` throw in
 * development, which is what keeps the migration complete.
 *
 * The one place that needs `domMax` — the shared-`layoutId` tab pill in
 * `components/auth/auth-form-fields.tsx` — loads it with its own nested
 * `<LazyMotion>`, so only routes that render it pay for the layout code.
 * Features register globally, so a nested provider is additive.
 *
 * `reducedMotion="user"`: disables transform/layout animations for users who
 * prefer reduced motion, while keeping opacity fades. Centralized here so
 * motion components never branch their render tree on the client-only
 * preference (which would cause SSR hydration mismatches).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
