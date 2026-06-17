import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://a967b4cfb6ef561860f6e89158815429@o4511561289433088.ingest.us.sentry.io/4511561295396864";

Sentry.init({
  dsn: SENTRY_DSN,

  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Attach local variable values to stack frames (server only).
  includeLocalVariables: true,

  enableLogs: true,
});
