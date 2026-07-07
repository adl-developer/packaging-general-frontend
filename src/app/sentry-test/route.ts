// ⚠ TEMPORARY — Sentry verification only. Delete this whole folder
// (src/app/sentry-test) once the error shows up in the Sentry dashboard.
//
// Visit http://localhost:3000/sentry-test (dev) or your deployed URL + /sentry-test.
// The thrown error is captured server-side by `onRequestError` (src/instrumentation.ts)
// and reported to the `packaging-general-storefront` Sentry project.
export async function GET() {
  throw new Error("Sentry storefront test error — delete src/app/sentry-test");
}
