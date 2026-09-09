import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://a967b4cfb6ef561860f6e89158815429@o4511561289433088.ingest.us.sentry.io/4511561295396864";

Sentry.init({
  dsn: SENTRY_DSN,

  // Send IP / request headers — useful for a customer-facing store. Review for PII policy.
  sendDefaultPii: true,

  // 100% traces in dev, 10% in production.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session Replay: 10% of all sessions, 100% of sessions with an error.
  // The replay integration itself is added lazily below (it is the heaviest
  // part of the SDK); it reads these rates from the client options when it
  // initialises, so they belong here regardless.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,
});

/**
 * Session Replay (rrweb) is not needed to report errors or traces, so it is
 * fetched as its own chunk once the page has loaded and the main thread is
 * idle, then registered with `Sentry.addIntegration`, which runs the
 * integration's full setup (`afterAllSetup` → session sampling at the rates
 * above). First-party chunk, not Sentry's CDN loader: it rides `/_next/static`
 * like everything else (ad-blockers that would eat `sentry-cdn.com` can't
 * touch it, same reasoning as the `tunnelRoute` for events) and is versioned
 * with the SDK. Known trade-off: an error thrown in the first second or so,
 * before the chunk lands, is reported without a replay attached.
 */
function loadSessionReplay() {
  import("@/lib/sentry-replay")
    .then(({ createReplayIntegration }) => {
      Sentry.addIntegration(createReplayIntegration());
    })
    .catch(() => {
      // Replay is best-effort observability — never let it surface as an error.
    });
}

function whenIdle(fn: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(fn, { timeout: 3000 });
  } else {
    // Safari has no requestIdleCallback; a short delay past `load` is close enough.
    setTimeout(fn, 1000);
  }
}

if (document.readyState === "complete") {
  whenIdle(loadSessionReplay);
} else {
  window.addEventListener("load", () => whenIdle(loadSessionReplay), { once: true });
}

// Capture App Router client-side navigation transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
