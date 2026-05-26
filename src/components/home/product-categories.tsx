import Link from "next/link";
import { FileText, Mailbox, Package, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeading, SectionSubtitle } from "./section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

// Colored lucide icons (Figma mobile 452:8306) replace the earlier emoji set —
// closer to the designed illustrations and consistent with the rest of the UI.
const categories = [
  {
    Icon: Package,
    iconClass: "text-[#8b6f47]", // kraft brown box
    title: "Shipping Cartons",
    description: "Durable single and double-wall cartons for general shipping needs",
    href: "/products?category=shipping-cartons",
  },
  {
    Icon: Mailbox,
    iconClass: "text-[#dc2626]", // red mailer
    title: "Mailer Boxes",
    description:
      "Custom-designed boxes perfect for e-commerce and subscription brands",
    href: "/products?category=mailer-boxes",
  },
  {
    Icon: FileText,
    iconClass: "text-muted", // muted document
    title: "Folding Cartons (FMCG)",
    description: "Retail-ready packaging for food and consumer goods",
    href: "/products?category=folding-cartons",
  },
  {
    Icon: Truck,
    iconClass: "text-rust", // terracotta truck
    title: "Export/Agro Boxes",
    description: "Heavy-duty packaging for agricultural exports and produce",
    href: "/products?category=export-agro-boxes",
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

        <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {categories.map((c) => (
            <StaggerItem key={c.title} className="h-full">
              <Link href={c.href} className="group block h-full">
                <Card className="flex h-full flex-col items-start gap-4 border-2 border-[rgba(165,154,135,0.3)] p-8 transition-colors group-hover:border-[rgba(61,52,40,0.4)]">
                  <c.Icon className={`size-10 ${c.iconClass}`} aria-hidden />
                  <span className="text-xl font-semibold leading-7 tracking-tight text-brand">
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
