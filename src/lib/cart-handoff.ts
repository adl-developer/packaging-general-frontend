"use client";

import type { CartItem } from "@/app/(shop)/cart/map-cart";

/**
 * Optimistic add-to-cart channel: product page → /cart, decoupled from the
 * backend commit.
 *
 * Add to Cart no longer waits for Medusa before navigating. The customizer
 * (1) deposits the just-configured line(s) here as optimistic items (temp
 * `opt-…` ids, built entirely from on-screen state — option ids ARE the
 * backend option values, so they render identically to committed lines),
 * (2) navigates to /cart immediately, and (3) commits the real mutation in
 * the background, settling this channel with the server truth (or a failure).
 *
 * The cart page paints the optimistic items instantly, merges the server's
 * pre-existing items underneath when its own fetch lands, and swaps in the
 * committed cart when the settle event fires. On failure it drops the
 * optimistic lines and shows an error — the shopper never sees a dead click
 * or a skeleton.
 *
 * Module-level state survives the client-side router.push (no reload).
 * Take-once + expiry keep any other /cart entry (deep link, reload, back
 * after idle) on the normal fetch path.
 */

export type AddSettleResult = { ok: true; items: CartItem[] } | { ok: false };

type PendingAdd = {
  optimisticItems: CartItem[];
  at: number;
  /** Set when the background commit finishes before /cart mounts. */
  result: AddSettleResult | null;
};

let pending: PendingAdd | null = null;
const listeners = new Set<(r: AddSettleResult) => void>();

/** Covers the instant push → mount hop plus a slow commit; far too short to
 *  ever resurrect a stale snapshot on a later, unrelated /cart visit. */
const MAX_AGE_MS = 30_000;

/** Product page, on click: stage the optimistic lines, then navigate.
 *  Temp ids are assigned here (not by the caller) so component code stays
 *  pure — `opt-…` marks a line whose commit is still in flight. */
export function beginOptimisticAdd(lines: Omit<CartItem, "id">[]): void {
  const stamp = Date.now();
  pending = {
    optimisticItems: lines.map((line, i) => ({ ...line, id: `opt-${stamp}-${i}` })),
    at: stamp,
    result: null,
  };
}

/** Product page, when the background mutation settles. Stores the result for
 *  a not-yet-mounted cart page AND notifies a mounted one. */
export function settleOptimisticAdd(result: AddSettleResult): void {
  if (pending) pending.result = result;
  for (const listener of [...listeners]) listener(result);
}

/** Cart page, on mount (take-once): the staged add, if fresh. `result` is
 *  non-null when the commit already finished during the navigation. */
export function takeOptimisticAdd(): {
  optimisticItems: CartItem[];
  result: AddSettleResult | null;
} | null {
  if (!pending) return null;
  const taken = pending;
  pending = null;
  if (Date.now() - taken.at > MAX_AGE_MS) return null;
  return { optimisticItems: taken.optimisticItems, result: taken.result };
}

/** Cart page: subscribe to the in-flight commit settling. */
export function onAddSettled(fn: (r: AddSettleResult) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** True for lines that exist only optimistically (commit still in flight). */
export function isOptimisticLine(id: string): boolean {
  return id.startsWith("opt-");
}

/**
 * Commit-request channel: the product page must NOT run the server action
 * itself — it unmounts when the instant navigation lands, and Next drops a
 * server-action dispatch whose component dies (observed: the POST never
 * reaches the backend and the promise never settles). Instead the customizer
 * publishes the add input here and `CartAddAgent` — a tiny client component
 * mounted in the (shop) layout, which SURVIVES the navigation — executes the
 * action and settles the channel above.
 */
export interface AddCommitRequest {
  variantId: string;
  quantity: number;
  setupPrintingValue?: string | null;
  notes?: string;
}

let pendingRequest: AddCommitRequest | null = null;
let requestListener: ((req: AddCommitRequest) => void) | null = null;

/** Product page: hand the mutation input to the long-lived executor. */
export function requestAddCommit(req: AddCommitRequest): void {
  if (requestListener) requestListener(req);
  else pendingRequest = req; // agent not mounted yet — deliver on subscribe
}

/** CartAddAgent: receive commit requests (drains any buffered one). */
export function onAddCommitRequested(
  fn: (req: AddCommitRequest) => void
): () => void {
  requestListener = fn;
  if (pendingRequest) {
    const buffered = pendingRequest;
    pendingRequest = null;
    fn(buffered);
  }
  return () => {
    if (requestListener === fn) requestListener = null;
  };
}
