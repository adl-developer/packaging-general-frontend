import Image from "next/image";
import { Receipt, Shield, Truck, type LucideIcon } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

const features: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Receipt,
    title: "Transparent Pricing",
    description:
      "Know exactly what you're paying with our clear, upfront pricing",
  },
  {
    icon: Shield,
    title: "Quality Materials",
    description: "Premium packaging materials from trusted suppliers",
  },
  {
    icon: Truck,
    title: "Local Delivery",
    description: "Fast and reliable delivery across West Africa",
  },
];

export function WhyUs() {
  return (
    <section className="bg-taupe text-dark-foreground">
      <Reveal className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <SectionHeading>Why Packaging General?</SectionHeading>
        <p className="mt-2 text-base leading-6 text-white/80">
          Built for Africa&apos;s growing businesses
        </p>
      </Reveal>

      {/* Full-width photo band with a 60% black overlay holding the features.
          User preference: keep the photo bg on mobile too (same as desktop). */}
      <div className="relative isolate w-full overflow-hidden bg-dark">
        <Image
          src="/home/worker-assembling.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover"
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-black/60" aria-hidden />
        <Stagger className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <StaggerItem
              key={title}
              className="flex flex-col items-center gap-4 p-6 text-center"
            >
              <span className="grid size-14 place-items-center rounded-full bg-white/20">
                <Icon className="size-7" aria-hidden />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-semibold leading-6">
                  {title}
                </h3>
                <p className="text-sm leading-5 text-white/80">{description}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
