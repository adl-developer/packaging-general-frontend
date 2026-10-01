import type { MetadataRoute } from "next";
import { IS_PRODUCTION_DEPLOY, SITE_URL } from "@/lib/site-url";

/** /robots.txt — open on production, closed everywhere else (the staging
 *  branch domain, previews, local dev), which next.config also marks noindex. */
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_DEPLOY) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Never worth crawling: auth + private pages, cart/checkout, tokenised
      // tracking links, the Sentry tunnel, API routes and internal pages.
      disallow: [
        "/api/",
        "/auth/",
        "/monitoring",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/account",
        "/cart",
        "/checkout",
        "/t/",
        "/offline",
        "/design-system",
        "/sentry-test",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
