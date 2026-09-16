"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { shouldResetScroll } from "@/lib/scroll-reset";

/**
 * Lands every forward route change at the top of the page.
 *
 * Mounted once in the (shop) layout so it covers the whole shopping flow
 * (browse → product → cart → checkout steps). Runs as a layout effect so the
 * reset happens in the same commit that shows the next route's skeleton,
 * before paint — a page that is already at the top stays there when its real
 * content streams in (verified: the browser only re-anchors when the offset
 * is non-zero). See `shouldResetScroll` for why Next's built-in reset is not
 * enough here, and for the cases deliberately left alone (back/forward,
 * hash links, query-only changes).
 */
export function ScrollReset() {
  const pathname = usePathname();
  const prevPathname = React.useRef<string | null>(null);
  const traversalTarget = React.useRef<string | null>(null);

  React.useEffect(() => {
    // `popstate` fires with the URL already updated, so the recorded pathname
    // is the traversal's destination. Consumed (and cleared) by the effect
    // below on the render that shows it.
    const onPopState = () => {
      traversalTarget.current = window.location.pathname;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  React.useLayoutEffect(() => {
    const reset = shouldResetScroll({
      prevPathname: prevPathname.current,
      pathname,
      hash: window.location.hash,
      traversalTarget: traversalTarget.current,
    });
    prevPathname.current = pathname;
    traversalTarget.current = null;
    if (reset) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
}
