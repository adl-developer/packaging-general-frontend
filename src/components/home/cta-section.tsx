import Link from "next/link";
import { cn } from "@/lib/utils";
import { SectionHeading, SectionSubtitle } from "./section-heading";
import { Reveal } from "@/components/motion/reveal";

const baseBtn =
  "inline-flex h-10 items-center justify-center rounded-button px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

export function CtaSection() {
  return (
    <section className="bg-dark text-dark-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <SectionHeading>Ready to Get Started?</SectionHeading>
          <SectionSubtitle className="text-white/70">
            Browse our catalog, customize your packaging, and get instant
            pricing. No commitments required.
          </SectionSubtitle>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/products"
              className={cn(baseBtn, "bg-surface text-brand hover:bg-surface/90")}
            >
              Shop now
            </Link>
            <Link
              href="/track-order"
              className={cn(
                baseBtn,
                "border border-white/40 bg-white/10 text-dark-foreground hover:bg-white/20",
              )}
            >
              Track Order
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
