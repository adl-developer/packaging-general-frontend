/**
 * The storefront's canonical origin: canonical links, Open Graph URLs,
 * structured data, robots.txt and the sitemap all build on it, so they always
 * agree on one host.
 *
 * Production is the apex, packaginggeneral.com (since 2026-10-01 www
 * 308-redirects to it, not the other way round). Override per environment
 * with NEXT_PUBLIC_SITE_URL; staging leaves it unset on purpose, so its pages
 * point their canonical at production instead of competing with it.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://packaginggeneral.com"
).replace(/\/+$/, "");

/** True only on Vercel production deploys. Previews (the staging branch
 *  domain included) and local dev are kept out of search engines. Read at
 *  build time by robots.txt, the sitemap and next.config's headers. */
export const IS_PRODUCTION_DEPLOY = process.env.VERCEL_ENV === "production";
