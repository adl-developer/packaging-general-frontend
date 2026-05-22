import Image from "next/image";
import { Receipt, Shield, Truck, type LucideIcon } from "lucide-react";
import { SectionHeading } from "./section-heading";

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
      <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <SectionHeading>Why Packaging General?</SectionHeading>
        <p className="mt-2 text-base leading-6 tracking-tight text-white/80">
          Built for Africa&apos;s growing businesses
        </p>
      </div>

      {/* Full-width photo band with a 60% black overlay holding the features */}
      <div className="relative isolate w-full overflow-hidden">
        <Image
          src="/home/worker-assembling.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover"
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-black/60" aria-hidden />
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-4 p-6 text-center"
            >
              <span className="grid size-14 place-items-center rounded-full bg-white/20">
                <Icon className="size-7" aria-hidden />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-semibold leading-6 tracking-tight">
                  {title}
                </h3>
                <p className="text-sm leading-5 text-white/80">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
