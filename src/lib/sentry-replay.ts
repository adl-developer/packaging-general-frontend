/**
 * Sentry Session Replay, kept OUT of the initial bundle.
 *
 * ⚠ Import this module ONLY via `import("@/lib/sentry-replay")` — see
 * `src/instrumentation-client.ts`. A static import anywhere would pull the
 * replay integration (rrweb, ~100 KB gzipped) back into every page's first
 * load, which is the whole reason this file exists.
 */
import { replayIntegration } from "@sentry/nextjs";

export function createReplayIntegration() {
  return replayIntegration({
    // Privacy: mask text + block media by default (checkout / account pages).
    maskAllText: true,
    blockAllMedia: true,
  });
}
