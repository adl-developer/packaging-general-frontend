import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for /products while the live categories load. Mirrors the
 *  page: back link, heading + lead, then the two-column category-card grid
 *  (icon badge, title, description, "View products" line) so the swap to real
 *  cards doesn't shift the page. The `sm:hidden` lines stand in for the
 *  heading and lead wrapping on mobile. */
export default function ProductsLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading…</span>

      <Skeleton className="h-5 w-14" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-full max-w-xl sm:h-10" />
        <Skeleton className="h-9 w-2/3 sm:hidden" />
        <div className="flex max-w-3xl flex-col gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full sm:hidden" />
          <Skeleton className="h-5 w-full sm:hidden" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-start gap-4 rounded-card border-2 border-[rgba(165,154,135,0.3)] bg-surface p-8"
          >
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-7 w-1/2" />
            <div className="flex w-full flex-col gap-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <Skeleton className="mt-auto h-5 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
