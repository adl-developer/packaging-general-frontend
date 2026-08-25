/**
 * About Us page content — types and the built-in copy for /about.
 *
 * The content is admin-editable (admin portal → Settings → About Us Page) and
 * arrives via `GET /store/site-content` out of Medusa store metadata; see
 * `lib/site-content.ts` for the fetch. This module is the pure, client-safe
 * side: the shape, the canonical default copy, and the guard that decides
 * whether a backend payload is usable.
 *
 * ⚠ THE DEFAULT TEXT IS THE REAL PAGE — no dual-render rule like the legal
 * pages. `DEFAULT_ABOUT` mirrors `backend/src/api/admin/pg/settings/about.ts`
 * verbatim, so a fresh store, an unreachable backend and an unsaved admin
 * form all show the same canonical page. If the copy changes, change both
 * together.
 *
 * ⚠ Features and stages are EXACTLY three — the layout is built for three
 * cards and three stage pills (first = current); the backend refuses other
 * counts, and `coerceAbout` treats them as malformed.
 */

export interface AboutFeature {
  title: string;
  body: string;
}

export interface AboutContent {
  hero: { label: string; title: string; body: string };
  intro: { label: string; heading: string; body: string; features: AboutFeature[] };
  foundation: { label: string; heading: string; body: string };
  /** `photo_url: ""` = render the built-in photo (`FOUNDER_PHOTO_FALLBACK`). */
  founder: { label: string; name: string; role: string; bio: string; photo_url: string };
  journey: { label: string; heading: string; body: string; stages: string[] };
}

/** Built-in founder photo, exported from the Figma frame (600×720, rendered
 *  at 200×240) — used whenever no custom photo has been uploaded. */
export const FOUNDER_PHOTO_FALLBACK = "/about/founder.jpg";

export const ABOUT_FEATURE_COUNT = 3;
export const ABOUT_STAGE_COUNT = 3;

export const DEFAULT_ABOUT: AboutContent = {
  hero: {
    label: "About Us",
    title: "Ghana's packaging supply chain\nhas never had real structure.",
    body: "Buyers, especially SMEs, have no reliable way to compare suppliers, see fair pricing, or place an order and know it will actually show up. Sourcing runs on WhatsApp threads, phone calls, and cash. It stays that way because no one has built anything better.",
  },
  intro: {
    label: "What we are",
    heading: "Ghana's first structured packaging marketplace",
    body: "Packaging General is Ghana's first structured marketplace for industrial and commercial packaging. We manufacture what we sell — so we hold real stock and full order visibility. No middlemen. No reselling someone else's inventory. No guessing whether it will arrive.",
    features: [
      {
        title: "We manufacture what we sell",
        body: "Corrugated cartons, Kraft bags, stretch wrap, woven bags, food-grade packaging — made in-house, not sourced on your behalf.",
      },
      {
        title: "Real stock, real visibility",
        body: "No middlemen, no reselling someone else's inventory. Full order visibility from placement to doorstep.",
      },
      {
        title: "Structured for business",
        body: "Fair, transparent pricing. Place an order and know it will arrive — on a timeline you can plan around.",
      },
    ],
  },
  foundation: {
    label: "Our foundation",
    heading: "Built on real manufacturing",
    body: "Packaging General is a venture of EON Investments & Industries, with over a decade of manufacturing experience behind it. That manufacturing base is what makes the platform possible. We're not listing products we hope to source. We're selling what we already know how to make well.",
  },
  founder: {
    label: "The founder",
    name: "Emmanuel Osei Ntim",
    role: "Founder, Packaging General",
    bio: "Emmanuel built Packaging General out of a simple observation: Ghana's manufacturers and retailers were losing time and money because packaging sourcing had never been given proper structure. With years of operations and supply chain work behind him, the next step was building a direct channel to buyers — one where they get certainty instead of a phone call and a maybe.",
    photo_url: "",
  },
  journey: {
    label: "Where we're going",
    heading: "Earning trust in Ghana first",
    body: "From there, we intend to expand across Africa, bringing the same model to manufacturers and retailers who face the same sourcing problems at a larger scale.",
    stages: ["Ghana — Now", "West Africa — Next", "Pan-Africa — Vision"],
  },
};

const isText = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

/**
 * A backend payload → typed content, or null when anything about it is off —
 * the page then renders `DEFAULT_ABOUT` whole (half a page from a stale or
 * disagreeing backend is worse than the canonical default; same fall-back
 * rule as the backend's own reader).
 */
export function coerceAbout(raw: unknown): AboutContent | null {
  if (!raw || typeof raw !== "object") return null;
  const about = raw as Record<string, Record<string, unknown>>;
  const { hero, intro, foundation, founder, journey } = about;
  if (
    !hero ||
    !isText(hero.label) ||
    !isText(hero.title) ||
    !isText(hero.body)
  ) {
    return null;
  }
  if (
    !intro ||
    !isText(intro.label) ||
    !isText(intro.heading) ||
    !isText(intro.body) ||
    !Array.isArray(intro.features) ||
    intro.features.length !== ABOUT_FEATURE_COUNT ||
    !intro.features.every(
      (f: unknown) =>
        !!f &&
        typeof f === "object" &&
        isText((f as AboutFeature).title) &&
        isText((f as AboutFeature).body),
    )
  ) {
    return null;
  }
  if (
    !foundation ||
    !isText(foundation.label) ||
    !isText(foundation.heading) ||
    !isText(foundation.body)
  ) {
    return null;
  }
  if (
    !founder ||
    !isText(founder.label) ||
    !isText(founder.name) ||
    !isText(founder.role) ||
    !isText(founder.bio) ||
    typeof founder.photo_url !== "string"
  ) {
    return null;
  }
  if (
    !journey ||
    !isText(journey.label) ||
    !isText(journey.heading) ||
    !isText(journey.body) ||
    !Array.isArray(journey.stages) ||
    journey.stages.length !== ABOUT_STAGE_COUNT ||
    !journey.stages.every(isText)
  ) {
    return null;
  }
  return {
    hero: { label: hero.label, title: hero.title, body: hero.body },
    intro: {
      label: intro.label,
      heading: intro.heading,
      body: intro.body,
      features: (intro.features as AboutFeature[]).map((f) => ({
        title: f.title,
        body: f.body,
      })),
    },
    foundation: {
      label: foundation.label,
      heading: foundation.heading,
      body: foundation.body,
    },
    founder: {
      label: founder.label,
      name: founder.name,
      role: founder.role,
      bio: founder.bio,
      photo_url: founder.photo_url,
    },
    journey: {
      label: journey.label,
      heading: journey.heading,
      body: journey.body,
      stages: (journey.stages as string[]).slice(),
    },
  };
}
