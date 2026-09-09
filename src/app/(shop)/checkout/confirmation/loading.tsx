import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for /checkout/confirmation while the order is retrieved and
 *  the account status resolved. Mirrors OrderConfirmation: the centred card
 *  with its status disc, title + subtitle, summary box, "What's next" box,
 *  notification box and the two-button row. The page is reached by a server
 *  redirect from /checkout/callback (a full document load), so this — the
 *  innermost boundary — is the fallback the streamed HTML carries, not the
 *  coarser checkout/loading.tsx above it. */
export default function ConfirmationLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading…</span>

      <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 rounded-card border-2 border-line bg-surface px-6 pb-6 pt-12">
        <Skeleton className="size-36 rounded-full" />

        <div className="flex w-full flex-col items-center gap-3">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-7 w-96 max-w-full" />
        </div>

        <div className="flex w-full max-w-[448px] flex-col gap-4 rounded-option border border-line bg-mist p-[33px]">
          <Skeleton className="h-5 w-full" />
          <div className="h-px w-full bg-line" aria-hidden />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>

        <div className="flex w-full max-w-[448px] flex-col gap-3 rounded-option border border-line bg-line/30 p-[25px]">
          <Skeleton className="h-6 w-32" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        </div>

        <div className="flex w-full max-w-[448px] flex-col gap-3 rounded-option border border-line bg-surface p-[25px]">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-10 w-full rounded-button" />
        </div>

        <div className="flex w-full max-w-[448px] gap-4">
          <Skeleton className="h-10 flex-1 rounded-button" />
          <Skeleton className="h-10 flex-1 rounded-button" />
        </div>
      </div>
    </div>
  );
}
