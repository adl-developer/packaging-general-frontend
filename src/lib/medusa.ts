import Medusa from "@medusajs/js-sdk";

/**
 * Shared Medusa Store SDK client.
 *
 * Uses the publishable key, which scopes requests to the "Packaging General"
 * sales channel. Safe to use in Server Components; the publishable key is not
 * a secret (it only grants read access to published catalog data).
 */
const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
});

/**
 * A throwaway SDK instance for auth operations (register/login).
 *
 * `sdk.auth.register()` / `sdk.auth.login()` call `setToken()` on the client
 * they run on, which would mutate the shared module-level `sdk` and leak the
 * token across concurrent SSR requests. We run those calls on a fresh instance
 * instead, read the returned token string, and persist it ourselves in an
 * httpOnly cookie — never relying on the SDK's in-memory token store.
 */
export function createAuthClient() {
  return new Medusa({
    baseUrl: MEDUSA_BACKEND_URL,
    publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  });
}

/** Build the Authorization header for an authenticated customer request. */
export function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}
