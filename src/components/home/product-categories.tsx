import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeading, SectionSubtitle } from "./section-heading";

const categories = [
  {
    emoji: "📦",
    title: "Shipping Cartons",
    description: "Durable single and double-wall cartons for general shipping needs",
    href: "/products?category=shipping-cartons",
  },
  {
    emoji: "📮",
    title: "Mailer Boxes",
    description:
      "Custom-designed boxes perfect for e-commerce and subscription brands",
    href: "/products?category=mailer-boxes",
  },
  {
    emoji: "📄",
    title: "Folding Cartons (FMCG)",
    description: "Retail-ready packaging for food and consumer goods",
    href: "/products?category=folding-cartons",
  },
  {
    emoji: "🚚",
    title: "Export/Agro Boxes",
    description: "Heavy-duty packaging for agricultural exports and produce",
    href: "/products?category=export-agro-boxes",
  },
];

export function ProductCategories() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-2 text-center">
          <SectionHeading className="text-brand">
            Our Product Categories
          </SectionHeading>
          <SectionSubtitle className="text-muted">
            Pre-defined packaging solutions for different business needs
          </SectionSubtitle>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {categories.map((c) => (
            <Link key={c.title} href={c.href} className="group">
              <Card className="flex h-full flex-col items-start gap-4 border-2 border-[rgba(165,154,135,0.3)] p-8 transition-colors group-hover:border-[rgba(61,52,40,0.4)]">
                <span className="text-4xl leading-10" aria-hidden>
                  {c.emoji}
                </span>
                <span className="text-xl font-semibold leading-7 tracking-tight text-brand">
                  {c.title}
                </span>
                <span className="text-sm leading-relaxed text-muted">
                  {c.description}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
