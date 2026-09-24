import { headers } from "next/headers";

/**
 * Which storefront is serving this request — production
 * (www.packaginggeneral.com) or staging (app.packaginggeneral.com). Both talk
 * to the SAME backend, so the backend asks us: every link it later puts in an
 * email or SMS for this customer goes back to the site they actually used
 * (2026-09-24).
 *
 * Recorded as `storefront_url` on the cart (→ the order), on the customer at
 * sign-up, and on password-reset requests; sent as the `x-storefront-url`
 * header on account requests. ⚠ This is only a CLAIM: the backend accepts it
 * solely when it names one of its FRONTEND_URL storefronts, so nothing here
 * needs to be trusted.
 */

export const STOREFRONT_URL_KEY = "storefront_url";
export const STOREFRONT_URL_HEADER = "x-storefront-url";

/** Pure: the origin from a header getter (`x-forwarded-*` first, as set by
 *  Vercel behind Cloudflare), or null when there is no usable host. */
export function storefrontUrlFromHeaders(
  get: (name: string) => string | null | undefined,
): string | null {
  const first = (v: string | null | undefined) =>
    (v ?? "").split(",")[0]?.trim() || "";
  const host = first(get("x-forwarded-host")) || first(get("host"));
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return null;
  const forwarded = first(get("x-forwarded-proto")).toLowerCase();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  const proto =
    forwarded === "http" || forwarded === "https"
      ? forwarded
      : local
        ? "http"
        : "https";
  return `${proto}://${host.toLowerCase()}`;
}

/** This request's storefront origin, or null outside a request. */
export async function currentStorefrontUrl(): Promise<string | null> {
  try {
    const h = await headers();
    return storefrontUrlFromHeaders((name) => h.get(name));
  } catch {
    return null;
  }
}

/** `{ storefront_url }` for metadata, or `{}` when unknown. */
export async function storefrontMetadata(): Promise<Record<string, string>> {
  const url = await currentStorefrontUrl();
  return url ? { [STOREFRONT_URL_KEY]: url } : {};
}

/** `{ "x-storefront-url": … }` to merge into a backend request's headers. */
export async function storefrontHeaders(): Promise<Record<string, string>> {
  const url = await currentStorefrontUrl();
  return url ? { [STOREFRONT_URL_HEADER]: url } : {};
}
