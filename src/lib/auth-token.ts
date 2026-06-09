import { cookies } from "next/headers";

/**
 * Auth-cookie access for server code ONLY.
 *
 * Deliberately NOT in a "use server" file: every exported function there
 * becomes a browser-invocable server-action endpoint, and one that returns
 * the raw customer JWT would let any injected script read the token —
 * defeating the point of the httpOnly cookie. Importing next/headers also
 * makes this module fail loudly if it ever ends up in a client bundle.
 */
/**
 * `__Host-` prefix in production: the browser then refuses the cookie unless
 * it is Secure, Path=/ and Domain-less (all true of AUTH_COOKIE_OPTS), which
 * blocks subdomain/sibling-host cookie injection. Dev stays unprefixed —
 * the prefix requires the Secure attribute, which we only set in prod.
 * NOTE: shipping this renames the cookie, so existing sessions are dropped
 * once (accepted pre-launch).
 */
export const AUTH_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-medusa_jwt" : "_medusa_jwt";

export async function getAuthToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(AUTH_COOKIE)?.value;
}
