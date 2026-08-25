import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { Earth, Factory, Globe, Layers, LayoutGrid, MapPin } from "lucide-react";
import { FOUNDER_PHOTO_FALLBACK } from "@/lib/about-content";
import { getAboutContent } from "@/lib/site-content";

/**
 * /about — Figma "About Us Page" (node 3780:310, 1140×2190), built to that
 * frame's exact numbers. The frame's palette maps 1:1 onto the design tokens
 * (#3d3428 brand, #e8e5de background, #fefdfb surface, #c4bcb0 line,
 * #7a7575 muted, #b8a8d9 accent); the only off-token colour is the lavender
 * icon tile #ede9f7. The frame's Arial is the design file's stand-in — text
 * renders in the site's Inter per the typography system.
 *
 * Every text on the page (and the founder photo) is admin-editable via the
 * portal's Settings → About Us Page; `getAboutContent` falls back to the
 * identical built-in copy when the backend is unreachable. The structure —
 * three feature cards, three journey stages with the first as current — is
 * fixed; the icons belong to the layout, not the content.
 */

/** Re-render periodically so an admin edit (Settings → About Us Page)
 *  reaches this page without a redeploy. */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const about = await getAboutContent();
  return {
    title: "About Us",
    description: about.intro.body,
    alternates: { canonical: "/about" },
  };
}

/** The three feature-card icons and three stage icons, in design order. */
const FEATURE_ICONS: LucideIcon[] = [Factory, Layers, LayoutGrid];
const STAGE_ICONS: LucideIcon[] = [MapPin, Globe, Earth];

export default async function AboutPage() {
  const about = await getAboutContent();
  const photoSrc = about.founder.photo_url || FOUNDER_PHOTO_FALLBACK;

  return (
    <div className="pb-20">
      {/* Hero — dark band, 760px content column (Figma: pad 72/64, title
          44/52.8 #fefdfb, body 17/30.6 #c4bcb0 at 580px, 48×3 accent tick) */}
      <section className="bg-brand">
        <div className="mx-auto w-full max-w-[808px] px-6 pb-14 pt-14 sm:pb-16 sm:pt-[72px]">
          <Eyebrow size="lg">{about.hero.label}</Eyebrow>
          <h1 className="mt-3 whitespace-pre-line text-3xl font-bold leading-[1.2] tracking-[-0.6px] text-brand-foreground sm:text-[44px]">
            {about.hero.title}
          </h1>
          <p className="mt-6 max-w-[580px] text-[17px] leading-[1.8] tracking-[-0.37px] text-line">
            {about.hero.body}
          </p>
          <div className="mt-9 h-[3px] w-12 rounded-[2px] bg-accent" />
        </div>
      </section>
      {/* Full-width lavender rule under the hero */}
      <div className="h-1 bg-accent" aria-hidden />

      {/* What we are — lead copy beside the three feature cards.
          Body sections are a 712px column (Figma: a 760 container with 24px
          inner padding); the hero's text column is the full 760. */}
      <section className="mx-auto w-full max-w-[760px] px-6 pt-14 sm:pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1fr_322px] sm:gap-12">
          <div>
            <Eyebrow>{about.intro.label}</Eyebrow>
            <h2 className="mt-2.5 text-2xl font-bold leading-[1.3] text-brand">
              {about.intro.heading}
            </h2>
            <p className="mt-5 text-[15px] leading-[1.8] tracking-[-0.2px] text-brand">
              {about.intro.body}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {about.intro.features.map((feature, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div
                  key={i}
                  className="flex gap-3.5 rounded-[10px] border border-line bg-surface px-5 py-[18px]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#ede9f7]">
                    <Icon
                      className="size-[18px] text-brand"
                      strokeWidth={1.3}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold leading-6 text-brand">
                      {feature.title}
                    </span>
                    <span className="mt-[5px] block text-[13px] leading-[1.6] text-muted">
                      {feature.body}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our foundation — the dark card */}
      <section className="mx-auto w-full max-w-[760px] px-6 pt-12">
        <div className="rounded-[14px] bg-brand px-6 py-8 sm:px-11 sm:py-10">
          <Eyebrow>{about.foundation.label}</Eyebrow>
          <h2 className="mt-2.5 text-[22px] font-bold leading-[1.3] tracking-[-0.3px] text-brand-foreground">
            {about.foundation.heading}
          </h2>
          <p className="mt-[18px] max-w-[580px] text-[15px] leading-[1.8] tracking-[-0.2px] text-line">
            {about.foundation.body}
          </p>
        </div>
      </section>

      {/* The founder — photo beside name, role and bio */}
      <section className="mx-auto w-full max-w-[760px] px-6 pt-12">
        <Eyebrow>{about.founder.label}</Eyebrow>
        <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:gap-9">
          {/* eslint-disable-next-line @next/next/no-img-element -- an
              admin-uploaded photo may live on an older media host than
              next/image's configured one; a plain img degrades gracefully
              instead of crashing the page. */}
          <img
            src={photoSrc}
            alt={`${about.founder.name}, ${about.founder.role}`}
            width={200}
            height={240}
            loading="lazy"
            className="h-60 w-50 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <h2 className="text-[22px] font-bold leading-[1.5] tracking-[-0.3px] text-brand">
              {about.founder.name}
            </h2>
            <p className="mt-1 text-[13px] leading-6 tracking-[0.39px] text-muted">
              {about.founder.role}
            </p>
            <div className="mt-5 h-0.5 w-8 rounded-[2px] bg-accent" />
            <p className="mt-5 text-[15px] leading-[1.85] tracking-[-0.2px] text-brand">
              {about.founder.bio}
            </p>
          </div>
        </div>
      </section>

      {/* Where we're going — copy beside the three stage pills; the first
          stage renders as the current one (dark pill, lavender icon) */}
      <section className="mx-auto w-full max-w-[760px] px-6 pt-12">
        <div className="flex flex-col gap-8 rounded-[14px] border border-line bg-surface px-6 py-8 sm:flex-row sm:items-center sm:px-11 sm:py-10">
          <div className="flex-1">
            <Eyebrow>{about.journey.label}</Eyebrow>
            <h2 className="mt-2.5 text-[22px] font-bold leading-[1.3] tracking-[-0.3px] text-brand">
              {about.journey.heading}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.8] tracking-[-0.2px] text-brand">
              {about.journey.body}
            </p>
          </div>
          {/* Figma draws this column at 208px, but its Arial stand-in is
              narrower than the site's Inter — at 208 the longer stage labels
              wrap to two lines. 216 keeps each on one line as designed. */}
          <ul className="flex w-full flex-col gap-3 sm:w-[216px] sm:shrink-0">
            {about.journey.stages.map((stage, i) => {
              const Icon = STAGE_ICONS[i];
              const current = i === 0;
              return (
                <li
                  key={i}
                  className={
                    current
                      ? "flex items-center gap-3 rounded-lg border border-brand bg-brand px-[18px] py-3"
                      : "flex items-center gap-3 rounded-lg border border-line bg-background px-[18px] py-3"
                  }
                >
                  <span
                    className={
                      current
                        ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/25"
                        : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ede9f7]"
                    }
                  >
                    <Icon
                      className={
                        current ? "size-4 text-accent" : "size-4 text-brand"
                      }
                      strokeWidth={1.2}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={
                      current
                        ? "text-sm font-bold text-brand-foreground"
                        : "text-sm text-muted"
                    }
                  >
                    {stage}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}

/** The small uppercase lavender section label. Figma: 10px (11px in the
 *  hero) Bold, +1.4 letter-spacing, #b8a8d9. */
function Eyebrow({
  size = "md",
  children,
}: {
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  return (
    <p
      className={
        size === "lg"
          ? "text-[11px] font-bold uppercase leading-normal tracking-[1.54px] text-accent"
          : "text-[10px] font-bold uppercase leading-normal tracking-[1.4px] text-accent"
      }
    >
      {children}
    </p>
  );
}
