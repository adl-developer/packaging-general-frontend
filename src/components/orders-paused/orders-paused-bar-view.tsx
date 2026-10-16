"use client";

import { usePathname } from "next/navigation";
import { isPausedPageRoute } from "@/lib/order-acceptance";

/**
 * The bar itself. Client-side only to read the pathname: the header lives in
 * the shared shop layout, which can't tell which page is under it, and the
 * pages that show the "Orders paused" page must not repeat its message here.
 */
export function OrdersPausedBarView({
  message,
  reopening,
}: {
  /** The admin's message; empty = just the headline. */
  message: string;
  /** "Monday, 19 October 2026", or null when unset or past. */
  reopening: string | null;
}) {
  const pathname = usePathname();
  if (isPausedPageRoute(pathname)) return null;

  return (
    <div role="status" className="bg-dark text-dark-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-2.5 text-sm leading-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:text-xs sm:leading-4 lg:px-8">
        <p className="flex min-w-0 items-start gap-2 sm:items-center">
          <span
            aria-hidden
            className="mt-[7px] size-1.5 shrink-0 rounded-full bg-rust sm:mt-0"
          />
          <span className="line-clamp-2 min-w-0 sm:truncate">
            <span className="font-semibold">
              We are not accepting orders right now.
            </span>
            {message && <span className="text-white/60"> {message}</span>}
          </span>
        </p>
        {reopening && (
          <p className="shrink-0 pl-3.5 text-xs leading-4 text-white/50 sm:pl-0">
            Reopening {reopening}
          </p>
        )}
      </div>
    </div>
  );
}
