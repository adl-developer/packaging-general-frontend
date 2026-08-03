import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Keep every non-production deploy out of search engines.
 *
 * The staging branch is served on its own subdomain and is a full copy of the
 * live storefront, so without this it competes with production for the same
 * queries (duplicate content) and can get the wrong host indexed.
 *
 * `VERCEL_ENV` is "production" only on production deploys — preview deploys,
 * the staging branch domain, and local dev all fall through to noindex.
 */
const IS_PRODUCTION = process.env.VERCEL_ENV === "production";

export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  if (!IS_PRODUCTION) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  // Everything except Next's own static output and image optimiser.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
