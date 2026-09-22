/**
 * What the floating feedback button captures automatically, so the team can
 * reproduce a report without asking the customer anything.
 *
 * Two halves:
 *   - a browser-side error ring buffer, installed once per page load, that
 *     records console errors, uncaught exceptions, unhandled rejections and
 *     failed fetches (last `RING_MAX`, newest last);
 *   - `captureBrowserContext()`, called at submit time, which snapshots the
 *     page, navigation trail, device and network facts plus the ring buffer.
 *
 * The server action adds what only the server knows (cart, customer, IP).
 *
 * Everything here is client-safe and pure enough to unit-test: the ring
 * buffer and the size guard take their inputs as arguments; only the two
 * `install*` / `capture*` functions touch `window`.
 */

export const RING_MAX = 20;
/** Longest single error message kept, so one stack trace can't crowd out the
 *  rest of the report (the backend caps the whole context at 32 KB). */
export const MAX_ERROR_CHARS = 600;
export const MAX_TRAIL = 15;

export type ErrorEntry = {
  kind: "console.error" | "error" | "unhandledrejection" | "fetch";
  at: string;
  message: string;
  /** `fetch` only: HTTP status, when the request completed. */
  status?: number;
  /** `fetch` only: the URL with its query string dropped. */
  url?: string;
};

export type FeedbackContext = {
  page: {
    url: string;
    path: string;
    title: string;
    referrer: string;
    /** Paths visited this tab session, oldest first, capped at MAX_TRAIL. */
    trail: string[];
    displayMode: "standalone" | "browser";
  };
  time: { utc: string; local: string; timezone: string };
  device: {
    userAgent: string;
    language: string;
    viewport: string;
    screen: string;
    pixelRatio: number;
    touch: boolean;
  };
  network: { online: boolean; effectiveType: string | null };
  build: { env: string | null; commit: string | null };
  errors: ErrorEntry[];
  sentryEventId: string | null;
};

/** Append to a ring buffer, keeping the newest `max` entries, message capped. */
export function pushError(
  ring: readonly ErrorEntry[],
  entry: ErrorEntry,
  max = RING_MAX,
): ErrorEntry[] {
  const capped = {
    ...entry,
    message: clip(entry.message, MAX_ERROR_CHARS),
  };
  const next = [...ring, capped];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Append a path to the navigation trail, deduping consecutive repeats. */
export function pushTrail(
  trail: readonly string[],
  path: string,
  max = MAX_TRAIL,
): string[] {
  if (trail[trail.length - 1] === path) return [...trail];
  const next = [...trail, path];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Turn anything `console.error` / `onerror` hands us into one line. */
export function describeError(input: unknown): string {
  if (input instanceof Error) {
    return `${input.name}: ${input.message}${input.stack ? `\n${input.stack}` : ""}`;
  }
  if (typeof input === "string") return input;
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

/** Query strings can carry tokens (tracking links, password resets); the
 *  path is enough to reproduce a route. */
export function stripQuery(url: string): string {
  const i = url.indexOf("?");
  const j = url.indexOf("#");
  const cut = [i, j].filter((n) => n >= 0);
  return cut.length ? url.slice(0, Math.min(...cut)) : url;
}

export function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/* ─── Browser-only side ─────────────────────────────────────────────────── */

const TRAIL_KEY = "pg_feedback_trail";

let ring: ErrorEntry[] = [];
let installed = false;

function now() {
  return new Date().toISOString();
}

/** Start recording errors for this page load. Idempotent. */
export function installErrorRecorder(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    ring = pushError(ring, {
      kind: "error",
      at: now(),
      message: describeError(e.error ?? e.message),
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    ring = pushError(ring, {
      kind: "unhandledrejection",
      at: now(),
      message: describeError(e.reason),
    });
  });

  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    ring = pushError(ring, {
      kind: "console.error",
      at: now(),
      message: args.map(describeError).join(" "),
    });
    origError(...args);
  };

  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    try {
      const res = await origFetch(input, init);
      if (res.status >= 400) {
        ring = pushError(ring, {
          kind: "fetch",
          at: now(),
          message: `${init?.method ?? "GET"} ${stripQuery(url)} → ${res.status}`,
          status: res.status,
          url: stripQuery(url),
        });
      }
      return res;
    } catch (err) {
      ring = pushError(ring, {
        kind: "fetch",
        at: now(),
        message: `${init?.method ?? "GET"} ${stripQuery(url)} failed: ${describeError(err)}`,
        url: stripQuery(url),
      });
      throw err;
    }
  };
}

/** Record a route change for the trail. Called by the widget on pathname
 *  change; survives client navigations via sessionStorage. */
export function recordVisit(path: string): void {
  if (typeof window === "undefined") return;
  try {
    const prev = JSON.parse(sessionStorage.getItem(TRAIL_KEY) ?? "[]");
    const next = pushTrail(Array.isArray(prev) ? prev : [], path);
    sessionStorage.setItem(TRAIL_KEY, JSON.stringify(next));
  } catch {
    // Private mode / blocked storage — the trail is a nicety, not a need.
  }
}

function readTrail(): string[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(TRAIL_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

/** Snapshot at submit time. `sentryEventId` is passed in so this module
 *  doesn't import the Sentry SDK (keeps it testable and tree-shakeable). */
export function captureBrowserContext(opts: {
  sentryEventId?: string | null;
  buildEnv?: string | null;
  buildCommit?: string | null;
}): FeedbackContext {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
  };
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const d = new Date();

  return {
    page: {
      url: stripQuery(location.href),
      path: location.pathname,
      title: document.title,
      referrer: stripQuery(document.referrer),
      trail: readTrail(),
      displayMode: standalone ? "standalone" : "browser",
    },
    time: {
      utc: d.toISOString(),
      local: d.toString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    device: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      screen: `${screen.width}×${screen.height}`,
      pixelRatio: window.devicePixelRatio,
      touch: navigator.maxTouchPoints > 0,
    },
    network: {
      online: navigator.onLine,
      effectiveType: nav.connection?.effectiveType ?? null,
    },
    build: {
      env: opts.buildEnv ?? null,
      commit: opts.buildCommit ?? null,
    },
    errors: [...ring],
    sentryEventId: opts.sentryEventId ?? null,
  };
}
