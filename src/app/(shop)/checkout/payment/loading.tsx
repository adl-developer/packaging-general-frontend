import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for /checkout/payment while the cart + summary load. */
export default function PaymentLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-5 w-36" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
          <div className="border-t border-line pt-3">
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-56 max-w-full" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-button" />
            <Skeleton className="h-12 w-full rounded-button" />
          </div>
          <Skeleton className="h-11 w-full rounded-button" />
        </div>
      </div>
    </div>
  );
}
