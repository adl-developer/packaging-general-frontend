import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for the product customizer while the product loads. */
export default function ProductDetailLoading() {
  return (
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

      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-6 w-full max-w-md" />
        </div>

        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="flex flex-col gap-2 border-b border-line p-6">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-64 max-w-full" />
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
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Skeleton className="h-10 w-full rounded-button sm:w-32" />
              <Skeleton className="h-10 w-full rounded-button sm:w-32" />
              <Skeleton className="h-10 w-full rounded-button sm:w-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
