import { Skeleton } from "@/components/ui/skeleton";

/** Widths for the table-of-contents rows, varied so the list doesn't read as
 *  a uniform grid. */
const TOC_ROW_WIDTHS = ["w-28", "w-24", "w-36", "w-32", "w-20", "w-40", "w-32", "w-28"];

/** Instant shell for /terms while the (possibly admin-edited) document loads.
 *  Mirrors LegalShell: eyebrow, title, "last updated", lead paragraph, the
 *  table-of-contents card, then the first sections. */
export default function TermsLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16"
    >
      <span className="sr-only">Loading…</span>

      <Skeleton className="h-4 w-14" />
      <Skeleton className="mt-2 h-9 w-72 max-w-full" />
      <Skeleton className="mt-2 h-5 w-44" />
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="mt-8 rounded-card border border-line bg-surface px-6 py-5">
        <Skeleton className="h-4 w-20" />
        <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {TOC_ROW_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-3.5 ${w}`} />
          ))}
        </div>
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="mt-10">
          <Skeleton className="h-7 w-56" />
          <div className="mt-3 flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
