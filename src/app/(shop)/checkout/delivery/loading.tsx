import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for /checkout/delivery while prefill loads. */
export default function DeliveryLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-5 w-28" />
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-card border border-line bg-surface p-6">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-64 max-w-full" />
        </div>
        <Skeleton className="h-14 w-full rounded-option" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-9 w-full rounded-button" />
            <Skeleton className="h-9 w-full rounded-button" />
          </div>
          <Skeleton className="h-9 w-full rounded-button" />
        </div>
        <div className="h-px w-full bg-line" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-full rounded-button" />
          <Skeleton className="h-9 w-full rounded-button" />
          <Skeleton className="h-48 w-full rounded-option" />
          <Skeleton className="h-16 w-full rounded-button" />
        </div>
        <Skeleton className="h-10 w-full rounded-button" />
      </div>
    </div>
  );
}
