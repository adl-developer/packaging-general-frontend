import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for the product customizer while the product loads. Mirrors
 *  the two-column layout (pinned image panel + scrolling card) and the pinned
 *  action bar so the swap to real content doesn't shift the page. */
export default function ProductDetailLoading() {
  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-7xl">
        <div className="sticky top-[121px] z-40 border-b border-line bg-surface">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[535fr_657fr] lg:items-start lg:px-8">
          <Skeleton className="aspect-[535/428] w-full rounded-option" />

          <div className="overflow-hidden rounded-option border border-line bg-surface">
            <div className="flex flex-col gap-2 border-b border-line p-6">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-8 w-64 max-w-full" />
              <Skeleton className="h-5 w-full max-w-md" />
            </div>
            <div className="flex flex-col gap-10 p-6">
              {Array.from({ length: 2 }).map((_, s) => (
                <div key={s} className="flex flex-col gap-4">
                  <Skeleton className="h-5 w-40" />
                  {Array.from({ length: 3 }).map((_, r) => (
                    <Skeleton key={r} className="h-16 w-full rounded-option" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-4 lg:px-8">
          <Skeleton className="h-10 w-full rounded-button sm:mr-auto sm:w-36" />
          <Skeleton className="h-10 w-full rounded-button sm:w-36" />
          <Skeleton className="h-10 w-full rounded-button sm:w-28" />
        </div>
      </div>
    </div>
  );
}
