/**
 * "Continue with Google" (2026-09-29) — the pure, client-safe half.
 *
 * Flow: the button posts to `startGoogleSignIn` (lib/actions/google-auth.ts)
 * → Medusa returns Google's consent URL → Google sends the browser back to
 * GOOGLE_CALLBACK_PATH (app/auth/google/callback/route.ts) → the backend's
 * POST /store/auth/google/complete links or creates the account → a refreshed
 * token becomes the normal session cookie.
 *
 * The callback path must be listed EXACTLY under the Google OAuth client's
 * Authorized redirect URIs, once per storefront origin.
 */

export const GOOGLE_CALLBACK_PATH = "/auth/google/callback";

/** Shown only when the storefront is built with NEXT_PUBLIC_GOOGLE_SIGN_IN=true
 *  — set it once the backend has GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET, or
 *  every click ends on "not available". */
export const GOOGLE_SIGN_IN_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === "true";

/** Binds a sign-in to the browser that started it (login-CSRF guard): the
 *  callback refuses a `state` this browser never received. */
export const GOOGLE_STATE_COOKIE = "pg_google_state";
/** Where to go after signing in. */
export const GOOGLE_NEXT_COOKIE = "pg_google_next";
/** Both cookies only need to outlive one trip to Google and back. */
export const GOOGLE_FLOW_TTL_SECONDS = 60 * 10;

export const DEFAULT_AFTER_SIGN_IN = "/account/orders";

/** A same-site path to return to, or the default. Refuses absolute and
 *  protocol-relative URLs (`//evil.com`, `/\evil.com`) so the cookie can't
 *  become an open redirect. */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_AFTER_SIGN_IN;
  const path = raw.trim();
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/\\") ||
    path.length > 512 ||
    /[\u0000-\u001f]/.test(path) ||
    path.startsWith(GOOGLE_CALLBACK_PATH)
  ) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  return path;
}

/** Only ever send the browser to Google's own consent screen. */
export function isGoogleConsentUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === "accounts.google.com";
  } catch {
    return false;
  }
}

/** The `state` Medusa put in the consent URL (the key it stored the sign-in
 *  under). */
export function stateFromConsentUrl(raw: string): string | null {
  try {
    return new URL(raw).searchParams.get("state") || null;
  } catch {
    return null;
  }
}

export type GoogleSignInError =
  | "cancelled"
  | "unverified"
  | "unavailable"
  | "failed";

/** `?google=<code>` on /sign-in → the message shown on the auth card. */
export function googleSignInMessage(code: unknown): string | undefined {
  switch (code) {
    case "cancelled":
      return "Google sign-in was cancelled.";
    case "unverified":
      return "An account with this email is waiting for email confirmation. Open the confirmation link we emailed you, then you can sign in with Google.";
    case "unavailable":
      return "Google sign-in isn't available right now. Please sign in with your email and password.";
    case "failed":
      return "We couldn't sign you in with Google. Please try again.";
    default:
      return undefined;
  }
}
