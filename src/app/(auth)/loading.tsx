import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell shared by the (auth) routes — /sign-in, /sign-up,
 *  /forgot-password, /reset-password and /verify-email all render the same
 *  centred 448px column (heading + subtitle, then a form) inside the auth
 *  layout, and none has a finer boundary below. Modelled on the Sign In card,
 *  the most-visited of the five: tabs, social button, divider, two fields,
 *  submit, divider, guest button, terms line. */
export default function AuthLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex w-full max-w-[448px] flex-col gap-8 px-4 pt-8"
    >
      <span className="sr-only">Loading…</span>

      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-80 max-w-full" />
      </div>

      <div className="flex flex-col gap-10">
        <Skeleton className="h-10 w-full rounded-option" />

        <div className="flex flex-col gap-6">
          <Skeleton className="h-11 w-full rounded-button" />
          <div className="h-px w-full bg-line" aria-hidden />

          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-11 w-full rounded-button" />
              </div>
            ))}
            <Skeleton className="h-11 w-full rounded-button" />
          </div>

          <div className="h-px w-full bg-line" aria-hidden />
          <Skeleton className="h-11 w-full rounded-button" />
        </div>

        <Skeleton className="mx-auto h-4 w-72 max-w-full" />
      </div>
    </div>
  );
}
