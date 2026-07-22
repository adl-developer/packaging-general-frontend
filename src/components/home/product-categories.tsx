import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeading, SectionSubtitle } from "./section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

// Colorful emoji icons (user preference — see shots/categories.png): richer
// than the flat lucide set and match the playful look of the original build.
const categories = [
  {
    emoji: "📦",
    title: "RSC Cartons",
    description:
      "Regular Slotted Containers in single and double wall — the workhorse shipping carton",
    href: "/products?category=rsc-cartons",
  },
  {
    emoji: "🥭",
    title: "Die Cut Boxes",
    description:
      "Yam, mango and vegetable cartons, archive boxes, trays and custom shapes",
    href: "/products?category=die-cut-boxes",
  },
  {
    emoji: "🍕",
    title: "Food Packaging",
    description: "Pizza boxes and takeaway food boxes in a full range of sizes",
    href: "/products?category=food-packaging",
  },
  {
    emoji: "📼",
    title: "Packaging Accessories",
    description:
      "BOPP tape, stretch wrap, bubble wrap and void fill to complete every shipment",
    href: "/products?category=packaging-accessories",
  },
];

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
              <Link href={c.href} className="group block h-full">
                <Card className="flex h-full flex-col items-start gap-4 border-2 border-[rgba(165,154,135,0.3)] p-8 transition-colors group-hover:border-[rgba(61,52,40,0.4)]">
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
