import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Dev-only Next.js badge. Its default corner (bottom-left) is where the
  // floating feedback button lives, and the badge sits on top of it.
  devIndicators: { position: "bottom-right" },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.packaginggeneral.com",
        pathname: "/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "packaging-general",
  project: "packaging-general-storefront",

  // Source map upload token — create at sentry.io/settings/auth-tokens
  // (scopes: project:releases + org:read) and set SENTRY_AUTH_TOKEN locally / in CI.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider set of client source files for better stack-trace resolution.
  widenClientFileUpload: true,

  // Proxy Sentry requests through the app to bypass ad-blockers.
  tunnelRoute: "/monitoring",

  // Only print plugin output in CI.
  silent: !process.env.CI,
});
