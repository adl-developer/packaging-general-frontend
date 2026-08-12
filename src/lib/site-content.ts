import { sdk } from "@/lib/medusa";

/**
 * Admin-editable site content, served by the custom backend route
 * GET /store/site-content out of Medusa store metadata: the Terms &
 * Conditions and Privacy Policy documents, and the store's business hours.
 *
 * ⚠ `customized: false` on a legal document means no admin has saved one —
 * the /terms and /privacy pages keep rendering their built-in text and the
 * body returned here is only the admin editor's prefill. Same rule for
 * `business_hours.configured: false`: hours nobody set are not hours to warn
 * customers about, so checkout shows no outside-hours notice.
 *
 * Same module-level cache pattern as `lib/promotions.ts` — this content
 * changes rarely, and on failure we serve stale or fall back to the built-in
 * behaviour (built-in legal pages, no hours notice).
 */

export type LegalDocKey = "terms" | "privacy";

export interface LegalDoc {
  /** ISO date (YYYY-MM-DD) shown as "Last updated". */
  effectiveDate: string;
  /** Markdown-lite: `## Heading`, `### Subheading`, `- item`, blank-line
   *  paragraphs — rendered by `components/legal/custom-legal.tsx`. */
  body: string;
  /** False = render the built-in page instead of this body. */
  customized: boolean;
}

export const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export interface DayHours {
  open: boolean;
  /** "HH:MM" 24h; empty on closed days. */
  from: string;
  to: string;
}

export interface BusinessHours {
  configured: boolean;
  hours: Record<DayKey, DayHours>;
}

interface SiteContentResponse {
  terms?: { effective_date: string; body: string; customized: boolean };
  privacy?: { effective_date: string; body: string; customized: boolean };
  business_hours?: { configured: boolean; hours: BusinessHours["hours"] };
}

interface SiteContentState {
  terms: LegalDoc | null;
  privacy: LegalDoc | null;
  businessHours: BusinessHours | null;
}

let cached: { state: SiteContentState; at: number } | undefined;
const TTL_MS = 60_000;

const EMPTY: SiteContentState = {
  terms: null,
  privacy: null,
  businessHours: null,
};

function mapDoc(
  raw: SiteContentResponse["terms"] | undefined,
): LegalDoc | null {
  if (!raw || typeof raw.body !== "string" || !raw.body.trim()) return null;
  return {
    effectiveDate:
      typeof raw.effective_date === "string" ? raw.effective_date : "",
    body: raw.body,
    customized: raw.customized === true,
  };
}

async function getSiteContent(): Promise<SiteContentState> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.state;
  try {
    const res = await sdk.client.fetch<SiteContentResponse>(
      "/store/site-content",
    );
    const state: SiteContentState = {
      terms: mapDoc(res.terms),
      privacy: mapDoc(res.privacy),
      businessHours:
        res.business_hours && res.business_hours.configured === true
          ? { configured: true, hours: res.business_hours.hours }
          : null,
    };
    cached = { state, at: Date.now() };
    return state;
  } catch (err) {
    console.error("[site-content] fetch failed:", err);
    // Serve the stale value if we have one; otherwise fall back to built-in
    // legal pages and no business-hours notice.
    return cached?.state ?? EMPTY;
  }
}

/** The admin-edited document, or null when none has been saved (or the
 *  backend is unreachable) — callers render the built-in page then. */
export async function getCustomLegalDoc(
  key: LegalDocKey,
): Promise<LegalDoc | null> {
  const state = await getSiteContent();
  const doc = state[key];
  return doc && doc.customized ? doc : null;
}

/** Saved business hours, or null when never configured / unreachable —
 *  callers show no outside-hours notice then. */
export async function getBusinessHours(): Promise<BusinessHours | null> {
  return (await getSiteContent()).businessHours;
}

const DAY_ABBREV: Record<DayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

/** "08:00" → "8:00 AM". Falls back to the raw string on anything odd. */
export function formatTime12h(hhmm: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;
  const hour = Number(match[1]);
  const suffix = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${match[2]} ${suffix}`;
}

/**
 * The configured week condensed into footer lines — consecutive days with
 * identical hours are grouped ("Mon - Fri: 8:00 AM - 5:00 PM (GMT)"), closed
 * days are omitted, matching the shape of the footer's original static copy.
 * Null when hours were never configured — the footer keeps its static lines.
 */
export async function getFooterHoursLines(): Promise<string[] | null> {
  const businessHours = await getBusinessHours();
  if (!businessHours) return null;

  const lines: string[] = [];
  let run: { start: DayKey; end: DayKey; from: string; to: string } | null =
    null;
  const flush = () => {
    if (!run) return;
    const days =
      run.start === run.end
        ? DAY_ABBREV[run.start]
        : `${DAY_ABBREV[run.start]} - ${DAY_ABBREV[run.end]}`;
    lines.push(
      `${days}: ${formatTime12h(run.from)} - ${formatTime12h(run.to)} (GMT)`,
    );
    run = null;
  };

  for (const day of DAY_KEYS) {
    const d = businessHours.hours[day];
    if (!d.open) {
      flush();
      continue;
    }
    if (run && run.from === d.from && run.to === d.to) {
      run.end = day;
    } else {
      flush();
      run = { start: day, end: day, from: d.from, to: d.to };
    }
  }
  flush();
  return lines.length ? lines : null;
}

/**
 * Is the store outside its configured working hours right now, and what are
 * today's hours? Evaluated in Ghana time (Africa/Accra) regardless of where
 * the server runs.
 *
 * Returns null when hours were never configured (no notice), or when the
 * store is currently open.
 */
export async function getOutsideHoursInfo(
  now: Date = new Date(),
): Promise<{ today: DayHours; dayLabel: string } | null> {
  const businessHours = await getBusinessHours();
  if (!businessHours) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const dayLabel = get("weekday"); // "Monday" …
  const dayKey = dayLabel.toLowerCase() as DayKey;
  const today = businessHours.hours[dayKey];
  if (!today) return null;

  // "HH:MM" strings compare correctly as strings. Intl can render midnight as
  // "24:00" in some engines — normalise so the comparison stays sane.
  const hour = get("hour") === "24" ? "00" : get("hour");
  const time = `${hour}:${get("minute")}`;

  const insideHours = today.open && time >= today.from && time < today.to;
  return insideHours ? null : { today, dayLabel };
}
