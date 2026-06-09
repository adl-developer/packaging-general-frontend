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
export const AUTH_COOKIE = "_medusa_jwt";

export async function getAuthToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(AUTH_COOKIE)?.value;
}
