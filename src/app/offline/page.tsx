import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

/**
 * Static offline fallback, served by the service worker (`public/sw.js`)
 * when a navigation request fails with no network. Deliberately outside the
 * `(shop)` route group: it must render with zero live data (no cart, no
 * catalog fetch) since the whole point is that there is no network to fetch
 * from.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-background px-6 text-center text-brand">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted">
        Packaging General needs a connection to show live prices and stock.
        Reconnect and try again.
      </p>
    </div>
  );
}
