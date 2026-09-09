import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell shared by /account/orders and /account/settings while the
 *  customer (and, for orders, the order list) loads. Both pages use the same
 *  max-w-4xl column — back link, heading row + subtitle, then surface cards —
 *  so one skeleton at the `account` segment (which has no page of its own)
 *  serves either child without a finer boundary below to shadow. */
export default function AccountLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading…</span>

      <Skeleton className="h-5 w-40" />

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-40 rounded-button" />
        </div>
        <Skeleton className="h-6 w-64 max-w-full" />
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <Skeleton className="h-5 w-full max-w-md" />
              <Skeleton className="h-5 w-full max-w-sm" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-9 w-48 rounded-button" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
