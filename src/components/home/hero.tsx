import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

// Full-bleed filmstrip: the 3 photos repeated to 9 cells (Figma: 320×256
// each, white mat border 16px top/bottom, 8px left/right), bleeding both edges.
const photos = [
  { src: "/home/worker-assembling.jpg", alt: "Worker assembling packaging boxes" },
  { src: "/home/workers-facility.jpg", alt: "Workers in a packaging facility" },
  {
    src: "/home/warehouse-qc.jpg",
    alt: "Warehouse worker quality-checking packages",
  },
];
const galleryImages = [...photos, ...photos, ...photos];

export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal fade={false} className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <h1 className="text-[2.5rem] font-medium leading-tight tracking-[0.26px] text-brand sm:text-[60px] sm:leading-[60px]">
            Quality Packaging for Africa&apos;s Growing Businesses
          </h1>
          <p className="max-w-2xl text-lg leading-7 tracking-tight text-muted">
            {
              "West Africa's first digital-first packaging platform. We simplify how SMEs discover, customize, and order quality packaging with transparent pricing and trusted suppliers."
            }
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/products"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              Shop now
            </Link>
            <Link
              href="/track-order"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Track Order
            </Link>
          </div>
        </Reveal>

      </div>

      {/* Full-bleed filmstrip with white matting (matches Figma). */}
      <div className="overflow-hidden pb-16">
        <div className="flex justify-center">
          {galleryImages.map((img, i) => (
            <div
              key={i}
              className="relative h-64 w-80 shrink-0 border-x-8 border-y-[16px] border-white bg-white"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
