import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for /cart while the live cart loads. */
export default function CartLoading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-28 rounded-button" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-card border border-line bg-surface p-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <Skeleton className="h-44 w-full shrink-0 rounded-2xl sm:h-28 sm:w-28" />
              <div className="flex flex-1 flex-col gap-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <Skeleton className="h-9 w-32 rounded-button" />
                  <Skeleton className="h-7 w-24" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:max-w-xl sm:p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
        <div className="border-t border-line pt-3">
          <Skeleton className="h-6 w-full" />
        </div>
        <Skeleton className="mt-1 h-11 w-full rounded-button" />
        <Skeleton className="h-11 w-full rounded-button" />
      </div>
    </div>
  );
}
