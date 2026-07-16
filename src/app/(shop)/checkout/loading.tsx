import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for /checkout (Company Information) while prefill loads. */
export default function CheckoutLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-5 w-28" />
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-card border border-line bg-surface p-6">
        <div className="flex items-start gap-3">
          <Skeleton className="size-5 rounded" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-full max-w-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-9 w-full rounded-button" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-button" />
      </div>
    </div>
  );
}
