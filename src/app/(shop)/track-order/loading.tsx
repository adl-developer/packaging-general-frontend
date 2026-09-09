import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for /track-order while the auth cookie is read. Mirrors the
 *  TrackOrder search card (tinted header band, then the form) in its
 *  logged-out shape — order number + email fields and the two action
 *  buttons — which is what most visitors arriving from an email/SMS link
 *  get. The card's borders match the real ones so nothing flashes on swap. */
export default function TrackOrderLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8"
    >
      <span className="sr-only">Loading…</span>

      <section className="overflow-hidden rounded-card border-2 border-[#e2e1e0] bg-surface">
        <div className="flex flex-col gap-1 border-b-2 border-[#e2e1e0] bg-[linear-gradient(90deg,rgba(150,64,34,0.05)_0%,rgba(164,154,135,0.05)_100%)] p-4 sm:p-6">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-5 w-full max-w-xl sm:h-6" />
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-[42px] w-full rounded-button" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-[42px] w-full rounded-button" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Skeleton className="h-9 w-full rounded-button sm:w-36" />
            <Skeleton className="h-9 w-full rounded-button sm:w-36" />
          </div>
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </section>
    </div>
  );
}
