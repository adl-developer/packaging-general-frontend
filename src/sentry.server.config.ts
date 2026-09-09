import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://a967b4cfb6ef561860f6e89158815429@o4511561289433088.ingest.us.sentry.io/4511561295396864";

Sentry.init({
  dsn: SENTRY_DSN,

  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // ⚠⚠ MUST STAY OFF. `includeLocalVariables: true` attaches Node's inspector
  // to capture locals on every caught exception, and React/Next throw many
  // during SSR. Measured on Vercel 2026-09-09 (canary vs identical build):
  // /checkout/delivery HTML 4.0–5.2 s → 0.85 s, home 6.4–6.9 s → 0.6–0.9 s.
  // It was the single largest cost of every hard page load on the site. The
  // only thing lost is local-variable values in error reports.
  includeLocalVariables: false,

  enableLogs: true,
});
