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
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [
    Sentry.replayIntegration({
      // Privacy: mask text + block media by default (checkout / account pages).
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

// Capture App Router client-side navigation transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
