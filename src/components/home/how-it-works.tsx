import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading, SectionSubtitle } from "./section-heading";
import { Reveal } from "@/components/motion/reveal";

const steps = [
  {
    n: 1,
    title: "Customize",
    description: "Pick your size, material, and print options in seconds",
  },
  {
    n: 2,
    title: "Set Delivery",
    description: "Choose your delivery location and preferred timeframe",
  },
  {
    n: 3,
    title: "Review",
    description: "See instant pricing with full breakdown — no hidden fees",
  },
  {
    n: 4,
    title: "Pay",
    description: "Quick checkout with Mobile Money or card payment",
  },
  {
    n: 5,
    title: "Track",
    description: "Get your order in 3 weeks and track progress anytime",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-mist">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-2 text-center">
          <SectionHeading className="text-brand">How It Works</SectionHeading>
          <SectionSubtitle className="text-muted">
            Order custom packaging in minutes, not days — 5 easy steps
          </SectionSubtitle>
        </Reveal>

        <Reveal>
          <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {steps.map((step) => (
              <li key={step.n} className="flex flex-col items-center gap-3 text-center">
                <span className="grid size-16 place-items-center rounded-full border-2 border-[#a59a87] text-2xl font-bold text-brand">
                  {step.n}
                </span>
                <h3 className="text-lg font-semibold leading-7 tracking-tight text-brand">
                  {step.title}
                </h3>
                <p className="text-sm text-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/products"
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            Shop Now
          </Link>
          <Link
            href="/track-order"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Track Order
          </Link>
        </div>
      </div>
    </section>
  );
}
