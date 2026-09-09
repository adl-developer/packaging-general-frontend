import { Skeleton } from "@/components/ui/skeleton";

/** Instant shell for /about while the admin-editable content loads. Mirrors
 *  the page's bands — dark hero, lavender rule, then the 760px column with
 *  the intro + three feature cards, the dark foundation card and the founder
 *  row — so the swap to real content doesn't shift the page. Blocks on the
 *  dark bands use a cream tint so they read on `bg-brand`. */
export default function AboutLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="pb-20">
      <span className="sr-only">Loading…</span>

      {/* Hero */}
      <section className="bg-brand">
        <div className="mx-auto w-full max-w-[808px] px-6 pb-14 pt-14 sm:pb-16 sm:pt-[72px]">
          <Skeleton className="h-4 w-24 bg-brand-foreground/15" />
          <div className="mt-3 flex flex-col gap-2">
            <Skeleton className="h-10 w-full max-w-xl bg-brand-foreground/15 sm:h-[52px]" />
            <Skeleton className="h-10 w-2/3 max-w-md bg-brand-foreground/15 sm:h-[52px]" />
          </div>
          <div className="mt-6 flex max-w-[580px] flex-col gap-2.5">
            <Skeleton className="h-5 w-full bg-brand-foreground/15" />
            <Skeleton className="h-5 w-full bg-brand-foreground/15" />
            <Skeleton className="h-5 w-3/4 bg-brand-foreground/15" />
          </div>
          <div className="mt-9 h-[3px] w-12 rounded-[2px] bg-accent" />
        </div>
      </section>
      <div className="h-1 bg-accent" aria-hidden />

      {/* What we are — lead copy beside the three feature cards */}
      <section className="mx-auto w-full max-w-[760px] px-6 pt-14 sm:pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1fr_322px] sm:gap-12">
          <div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2.5 h-8 w-3/4" />
            <div className="mt-5 flex flex-col gap-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3.5 rounded-[10px] border border-line bg-surface px-5 py-[18px]"
              >
                <Skeleton className="size-10 shrink-0 rounded-[10px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our foundation — the dark card */}
      <section className="mx-auto w-full max-w-[760px] px-6 pt-12">
        <div className="rounded-[14px] bg-brand px-6 py-8 sm:px-11 sm:py-10">
          <Skeleton className="h-4 w-20 bg-brand-foreground/15" />
          <Skeleton className="mt-2.5 h-7 w-2/3 bg-brand-foreground/15" />
          <div className="mt-[18px] flex max-w-[580px] flex-col gap-2.5">
            <Skeleton className="h-4 w-full bg-brand-foreground/15" />
            <Skeleton className="h-4 w-full bg-brand-foreground/15" />
            <Skeleton className="h-4 w-3/4 bg-brand-foreground/15" />
          </div>
        </div>
      </section>

      {/* The founder — photo beside name, role and bio */}
      <section className="mx-auto w-full max-w-[760px] px-6 pt-12">
        <Skeleton className="h-4 w-24" />
        <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:gap-9">
          <Skeleton className="h-60 w-50 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col">
            <Skeleton className="h-8 w-56 max-w-full" />
            <Skeleton className="mt-1 h-6 w-40" />
            <div className="mt-5 h-0.5 w-8 rounded-[2px] bg-accent" />
            <div className="mt-5 flex flex-col gap-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
