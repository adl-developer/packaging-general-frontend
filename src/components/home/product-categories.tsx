import { SectionHeading, SectionSubtitle } from "./section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { CategoryCard } from "@/components/products/category-card";
import { SHOP_CATEGORIES } from "@/lib/categories";

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
          {SHOP_CATEGORIES.map((c) => (
            <StaggerItem key={c.slug} className="h-full">
              <CategoryCard category={c} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
