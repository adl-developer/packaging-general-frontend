import Link from "next/link";
import { Card, cardHoverClass } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SectionHeading, SectionSubtitle } from "./section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { SHOP_CATEGORIES } from "@/lib/categories";

// Colorful emoji icons (user preference — see shots/categories.png): richer
// than the flat lucide set and match the playful look of the original build.
// Titles/descriptions/links come from the real catalog categories.
const categories = SHOP_CATEGORIES;

export function ProductCategories() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-2 text-center">
          <SectionHeading className="text-brand">
            Our Product Categories
          </SectionHeading>
          <SectionSubtitle className="text-muted">
            Pre-defined packaging solutions for different business needs
          </SectionSubtitle>
        </Reveal>

        <Stagger className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          {categories.map((c) => (
            <StaggerItem key={c.title} className="h-full">
              <Link href={c.href} className="block h-full">
                <Card
                  className={cn(
                    "flex h-full flex-col items-start gap-4 border-2 border-[rgba(165,154,135,0.3)] p-8",
                    cardHoverClass,
                  )}
                >
                  <span className="text-4xl leading-none" aria-hidden>
                    {c.emoji}
                  </span>
                  <span className="text-xl font-semibold leading-7 text-brand">
                    {c.title}
                  </span>
                  <span className="text-sm leading-relaxed text-muted">
                    {c.description}
                  </span>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
