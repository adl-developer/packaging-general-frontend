import { cookies } from "next/headers";
import { sdk, authHeaders } from "@/lib/medusa";
import { AUTH_COOKIE } from "@/lib/auth-token";

/**
 * Starting a customer session: the httpOnly auth cookie + guest-cart
 * transfer. Shared by the password flows (lib/actions/auth.ts) and the Google
 * callback (app/auth/google/callback) so every sign-in sets the SAME cookie.
 *
 * Not a "use server" file on purpose (see auth-token.ts): an exported
 * function there would be a browser-callable endpoint that sets a session
 * from any token handed to it.
 */

const CART_COOKIE = "pg_cart_id";
// Must match the backend's jwtExpiresIn ("24h" in medusa-config.ts) — a cookie
// that outlives the JWT just produces silent 401s until it's cleared.
const AUTH_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export const AUTH_COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: AUTH_TTL_SECONDS,
  path: "/",
};

export async function setAuthToken(token: string) {
  const store = await cookies();
  store.set(AUTH_COOKIE, token, AUTH_COOKIE_OPTS);
}

/** Best-effort: attach the guest cart to the now-authenticated customer. */
export async function transferGuestCart(token: string) {
  try {
    const store = await cookies();
    const cartId = store.get(CART_COOKIE)?.value;
    if (!cartId) return;
    await sdk.store.cart.transferCart(cartId, {}, authHeaders(token));
  } catch (err) {
    // Non-fatal — the customer is still logged in; cart linkage can retry later.
    console.error("[auth] cart transfer failed:", err);
  }
}
