import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for /products/category/[category] while the category, its
 *  products and live stock load. Mirrors the page: back link, heading + lead,
 *  then the two-column product-card grid (208px image band + card body) so
 *  the swap to real cards doesn't shift the page. */
export default function CategoryLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading…</span>

      <Skeleton className="h-5 w-28" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-72 max-w-full sm:h-10" />
        <Skeleton className="h-7 w-full max-w-3xl" />
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-card border border-line bg-surface"
          >
            <Skeleton className="h-52 w-full rounded-none" />
            <div className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-32" />
              </div>
              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <Skeleton className="h-10 w-full rounded-button" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
