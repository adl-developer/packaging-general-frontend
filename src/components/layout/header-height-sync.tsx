"use client";

import * as React from "react";

/**
 * Publishes the site header's real rendered height as `--site-header-h` on
 * <html>, so anything pinned beneath it (the product page's Back / "Step 1 of
 * 5" strip) sits flush against it. The height is not a constant: the logo row
 * is shorter on mobile and the promo bar comes and goes, and a hard-coded
 * offset left a see-through gap above the strip (user, 2026-10-05).
 *
 * Renders nothing; it finds its own <header> from an empty marker span.
 */
export function HeaderHeightSync() {
  const markerRef = React.useRef<HTMLSpanElement | null>(null);

  React.useEffect(() => {
    const header = markerRef.current?.closest("header");
    if (!header) return;
    const root = document.documentElement;
    const apply = () =>
      root.style.setProperty(
        "--site-header-h",
        `${header.getBoundingClientRect().height}px`,
      );
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  return <span ref={markerRef} hidden />;
}
