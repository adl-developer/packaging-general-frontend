/**
 * Settings → Order Acceptance (client, 2026-10-16). Mirrors
 * `backend/src/api/admin/pg/settings/order-acceptance.ts`. Pure, client-safe.
 *
 * Orders are OPEN while pickup or delivery is on; the admin's master switch
 * turns both off to pause. While paused the shopping pages (home, products,
 * cart, checkout, reorder) show the "Orders paused" page instead; track-order,
 * account, sign-in, About and the legal pages keep working (user decisions,
 * 2026-10-16). The backend refuses deliveries and payments regardless.
 */

export type OrderAcceptance = {
  open: boolean;
  /** Empty = DEFAULT_PAUSED_MESSAGE. */
  message: string;
  /** "YYYY-MM-DD", or null. */
  reopenDate: string | null;
};

export const DEFAULT_PAUSED_MESSAGE =
  "We are taking a quick break from online orders to restock and will be back soon. Thank you for your patience.";

/** Open, as before the switch existed: unknown never closes the shop. */
export const DEFAULT_ORDER_ACCEPTANCE: OrderAcceptance = {
  open: true,
  message: "",
  reopenDate: null,
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse the backend's `order_acceptance`. Malformed reads as OPEN. */
export function parseOrderAcceptance(raw: unknown): OrderAcceptance {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ORDER_ACCEPTANCE };
  const r = raw as Record<string, unknown>;
  return {
    open: r.open !== false,
    message: typeof r.message === "string" ? r.message.trim() : "",
    reopenDate:
      typeof r.reopen_date === "string" && DATE_RE.test(r.reopen_date)
        ? r.reopen_date
        : null,
  };
}

/**
 * A Ghana number as typed in Settings, spaced for reading: "+233591207616"
 * → "+233 59 120 7616", "0591207616" → "059 120 7616". Anything else is
 * shown exactly as saved.
 */
export function formatGhanaPhone(raw: string): string {
  const digits = raw.replace(/[\s-]/g, "");
  let m = /^\+233(\d{2})(\d{3})(\d{4})$/.exec(digits);
  if (m) return `+233 ${m[1]} ${m[2]} ${m[3]}`;
  m = /^0(\d{2})(\d{3})(\d{4})$/.exec(digits);
  if (m) return `0${m[1]} ${m[2]} ${m[3]}`;
  return raw.trim();
}

export function pausedMessage(state: OrderAcceptance): string {
  return state.message || DEFAULT_PAUSED_MESSAGE;
}

/**
 * "Monday, 19 October 2026" for the reopening pill, or null when no date is
 * set or it has already passed (a stale promise reads worse than none).
 * Ghana is GMT all year, so the date is read as a UTC calendar day.
 */
export function formatReopenDate(
  date: string | null,
  now: Date = new Date(),
): string | null {
  if (!date) return null;
  const m = DATE_RE.exec(date);
  if (!m) return null;
  if (date < now.toISOString().slice(0, 10)) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.toISOString().slice(0, 10) !== date) return null;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(d)
    .replace(/^(\w+) /, "$1, ");
}
