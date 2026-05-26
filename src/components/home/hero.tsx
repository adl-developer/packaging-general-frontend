import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

// Full-bleed filmstrip (Figma: 320×256 each, white mat border 16px top/bottom,
// 8px left/right), scrolling infinitely. Each cell is 336px wide (320 + 8px
// border per side). One "half" repeats the 3 photos 4× (12 cells ≈ 4032px) so
// it spans even ultra-wide viewports without gaps; the track renders the half
// twice and animate-marquee slides it by exactly one half-width for a seamless
// loop. See --animate-marquee / @keyframes marquee in globals.css.
const photos = [
  { src: "/home/worker-assembling.jpg", alt: "Worker assembling packaging boxes" },
  { src: "/home/workers-facility.jpg", alt: "Workers in a packaging facility" },
  {
    src: "/home/warehouse-qc.jpg",
    alt: "Warehouse worker quality-checking packages",
  },
];
const marqueeHalf = [...photos, ...photos, ...photos, ...photos];
const galleryImages = [...marqueeHalf, ...marqueeHalf];

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
          {/* Mobile (Figma 452:8306): both CTAs full-width, stacked vertically. */}
          <div className="flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
            <Link
              href="/products"
              className={buttonVariants({ variant: "primary", size: "lg", fullWidth: true, className: "sm:w-auto" })}
            >
              Shop now
            </Link>
            <Link
              href="/track-order"
              className={buttonVariants({ variant: "outline", size: "lg", fullWidth: true, className: "sm:w-auto" })}
            >
              Track Order
            </Link>
          </div>
        </Reveal>

      </div>

      {/* Full-bleed infinite filmstrip with white matting (matches Figma).
          Decorative motion, so the strip is hidden from assistive tech and the
          duplicated images carry empty alt text. Pauses on hover. */}
      <div aria-hidden className="group overflow-hidden pb-16">
        <div className="flex w-max animate-marquee will-change-transform group-hover:[animation-play-state:paused]">
          {galleryImages.map((img, i) => (
            <div
              key={i}
              className="relative h-64 w-80 shrink-0 border-x-8 border-y-[16px] border-white bg-white"
            >
              <Image
                src={img.src}
                alt=""
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
