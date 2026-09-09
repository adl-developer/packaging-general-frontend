/**
 * The header's pill trigger (Cart link + Account menu button). Kept in a
 * plain module — not a "use client" file — so the server-rendered Suspense
 * fallbacks in `header-cart.tsx` / `header-account.tsx` can reuse the exact
 * class string and stay pixel-identical to the pill that streams in.
 * (Importing a constant from a "use client" module into a Server Component
 * hands it a client reference, not the string.)
 */
export const navButton =
  "inline-flex h-8 items-center gap-2 rounded-button border border-line bg-background px-3 text-sm font-medium text-brand transition-colors hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";
