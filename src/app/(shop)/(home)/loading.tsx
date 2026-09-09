import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for the home page while the live category cards load.
 *  Mirrors the landing bands top to bottom — centred hero + white-matted
 *  filmstrip, the two-column category grid, the taupe "Why us" band with its
 *  dark three-up feature strip, the five-step "How it works" row, the dark
 *  CTA and the certifications card — so the swap to real content doesn't
 *  shift the page. Blocks on the taupe/dark bands use a cream tint so they
 *  read there; the extra `sm:hidden` lines stand in for mobile line-wrap. */
export default function HomeLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* Hero — centred heading, lead and the two CTAs, then the filmstrip */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
            <div className="flex w-full flex-col items-center gap-2">
              <Skeleton className="h-9 w-full max-w-3xl sm:h-[52px]" />
              <Skeleton className="h-9 w-3/4 max-w-xl sm:h-[52px]" />
              <Skeleton className="h-9 w-1/2 sm:hidden" />
            </div>
            <div className="flex w-full max-w-2xl flex-col items-center gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full sm:hidden" />
              <Skeleton className="h-5 w-full sm:hidden" />
              <Skeleton className="h-5 w-2/3" />
            </div>
            <div className="flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
              <Skeleton className="h-10 w-full rounded-button sm:w-28" />
              <Skeleton className="h-10 w-full rounded-button sm:w-32" />
            </div>
          </div>
        </div>

        {/* Filmstrip — static stand-in for the marquee, same white matting */}
        <div aria-hidden className="overflow-hidden pb-16">
          <div className="flex w-max">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-64 w-80 shrink-0 border-x-8 border-y-[16px] border-white bg-white"
              >
                <Skeleton className="h-full w-full rounded-none" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product categories — heading, then the two-column card grid */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-2">
            <Skeleton className="h-9 w-72 max-w-full sm:h-10 sm:w-96" />
            <Skeleton className="h-7 w-full max-w-xl" />
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-start gap-4 rounded-card border-2 border-[rgba(165,154,135,0.3)] bg-surface p-8"
              >
                <Skeleton className="size-12 rounded-full" />
                <Skeleton className="h-7 w-1/2" />
                <div className="flex w-full flex-col gap-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <Skeleton className="mt-auto h-5 w-28" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us — taupe heading band, then the dark three-up feature strip */}
      <section className="bg-taupe">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-12 sm:px-6 lg:px-8">
          <Skeleton className="h-9 w-80 max-w-full bg-dark-foreground/15 sm:h-10 sm:w-96" />
          <Skeleton className="h-6 w-64 max-w-full bg-dark-foreground/15" />
        </div>
        <div className="w-full bg-dark">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-4 p-6">
                <Skeleton className="size-14 rounded-full bg-dark-foreground/15" />
                <div className="flex w-full flex-col items-center gap-2">
                  <Skeleton className="h-6 w-40 bg-dark-foreground/15" />
                  <Skeleton className="h-5 w-64 max-w-full bg-dark-foreground/15" />
                  <Skeleton className="h-5 w-40 bg-dark-foreground/15" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — heading, the five-step row and the two CTAs */}
      <section className="bg-mist">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3">
            <Skeleton className="h-9 w-56 sm:h-10 sm:w-64" />
            <Skeleton className="h-7 w-full max-w-xl" />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-4">
                <Skeleton className="size-16 rounded-full" />
                <div className="flex w-full flex-col items-center gap-2">
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-5 w-48 max-w-full" />
                  <Skeleton className="h-5 w-36 max-w-full" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-[72px] flex flex-wrap items-center justify-center gap-4">
            <Skeleton className="h-10 w-28 rounded-button" />
            <Skeleton className="h-10 w-32 rounded-button" />
          </div>
        </div>
      </section>

      {/* CTA — the dark band */}
      <section className="bg-dark">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
            <Skeleton className="h-9 w-72 max-w-full bg-dark-foreground/15 sm:h-10 sm:w-80" />
            <div className="flex w-full flex-col items-center gap-2">
              <Skeleton className="h-5 w-full bg-dark-foreground/15" />
              <Skeleton className="h-5 w-2/3 bg-dark-foreground/15" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Skeleton className="h-10 w-28 rounded-button bg-dark-foreground/15" />
              <Skeleton className="h-10 w-32 rounded-button bg-dark-foreground/15" />
            </div>
          </div>
        </div>
      </section>

      {/* Certifications — the surface card with its six-up tile grid */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-card bg-surface p-8">
            <Skeleton className="mx-auto mb-8 h-5 w-64 max-w-full" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-option" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
