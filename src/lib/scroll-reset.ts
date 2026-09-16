/**
 * Decides whether a client-side route change should land the customer at the
 * top of the page. Pure so it can be unit-tested without a DOM; the
 * `ScrollReset` layout component feeds it from the router.
 *
 * Why this exists at all: Next's own scroll-to-top runs once per navigation,
 * at the moment the route's `loading.tsx` skeleton commits — it sits outside
 * the loading boundary. When that skeleton is shorter than the page being
 * left (e.g. delivery → payment), the browser clamps the scroll offset while
 * the skeleton is up, so the new segment's top edge reads as "already in the
 * viewport" and Next skips the reset. When the real page then streams in,
 * the browser keeps the old offset and the customer lands mid-page
 * (reproduced on staging 2026-09-16). Resetting explicitly on every forward
 * route change closes that gap regardless of skeleton height.
 */
export type ScrollResetInput = {
  /** Pathname of the previous render; `null` on the first render. */
  prevPathname: string | null;
  /** Pathname now being rendered. */
  pathname: string;
  /** `window.location.hash` at commit time ("" when none). */
  hash: string;
  /**
   * Pathname recorded by the last `popstate` event, i.e. the destination of a
   * back/forward traversal that has not been consumed yet. `null` otherwise.
   */
  traversalTarget: string | null;
};

export function shouldResetScroll({
  prevPathname,
  pathname,
  hash,
  traversalTarget,
}: ScrollResetInput): boolean {
  // First render: the browser already put us where it wants us.
  if (prevPathname === null) return false;
  // Same route (query/search changes only): keep the customer's place.
  if (prevPathname === pathname) return false;
  // Back/forward: the browser restores the saved scroll position; leave it.
  if (traversalTarget === pathname) return false;
  // In-page anchor: Next scrolls the target element into view itself.
  if (hash) return false;
  return true;
}
