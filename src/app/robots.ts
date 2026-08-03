import type { MetadataRoute } from "next";

// See src/proxy.ts — same production check, applied to robots.txt.
const IS_PRODUCTION = process.env.VERCEL_ENV === "production";

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Never worth crawling: auth + private pages, cart/checkout, the
      // Sentry tunnel, API routes, and the internal design-system page.
      disallow: [
        "/api/",
        "/monitoring",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/account",
        "/cart",
        "/checkout",
        "/design-system",
      ],
    },
  };
}
