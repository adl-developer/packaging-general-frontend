"use client";

/**
 * Reorder → /cart notice channel.
 *
 * Mirrors the take-once, module-scope pattern in `cart-handoff.ts`: the
 * Reorder button computes the real (server-verified) result BEFORE
 * navigating, so by the time it calls `router.push("/cart")` the message is
 * already known. Stashing it here lets the cart page read it once on mount
 * and show it as a plain inline banner — no toast, no snackbar (see the
 * design's §2.1 "no toast" decision) — instead of it being lost across the
 * client-side navigation.
 *
 * Only set when there's something to say (a cap or a skip) — a clean reorder
 * sets nothing, matching the Figma "reorder clicked" frame, which shows no
 * banner at all.
 */
let pending: { message: string; at: number } | null = null;

/** Long enough to cover the push → mount hop; short enough that a later,
 *  unrelated /cart visit can never resurrect a stale notice. */
const MAX_AGE_MS = 30_000;

export function setReorderNotice(message: string): void {
  pending = { message, at: Date.now() };
}

/** Cart page, on mount (take-once). Returns null if there's no fresh notice. */
export function takeReorderNotice(): string | null {
  if (!pending) return null;
  const taken = pending;
  pending = null;
  if (Date.now() - taken.at > MAX_AGE_MS) return null;
  return taken.message;
}
