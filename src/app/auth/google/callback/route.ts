import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { createAuthClient, sdk, authHeaders } from "@/lib/medusa";
import { setAuthToken, transferGuestCart } from "@/lib/auth-session";
import { storefrontHeaders } from "@/lib/storefront-origin";
import {
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  safeNextPath,
  type GoogleSignInError,
} from "@/lib/google-sign-in";

/**
 * Google's redirect target — a Route Handler, NOT a page, because it sets the
 * session cookie (cookie writes are illegal during a page render; see the
 * Paystack callback for the same rule).
 *
 * 1. Refuse a `state` this browser didn't start (login-CSRF guard).
 * 2. Medusa's Google callback exchanges the code → a token with no customer.
 * 3. POST /store/auth/google/complete links or creates the account.
 * 4. /auth/token/refresh → a token carrying the customer → session cookie.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const store = await cookies();
  const expectedState = store.get(GOOGLE_STATE_COOKIE)?.value;
  const next = safeNextPath(store.get(GOOGLE_NEXT_COOKIE)?.value);
  store.delete(GOOGLE_STATE_COOKIE);
  store.delete(GOOGLE_NEXT_COOKIE);

  const outcome = await finish({
    code: params.get("code"),
    state: params.get("state"),
    error: params.get("error"),
    expectedState,
  });

  // redirect() throws NEXT_REDIRECT, so it must live outside any try/catch.
  if (outcome !== "ok") redirect(`/sign-in?google=${outcome}`);
  redirect(next);
}

async function finish(input: {
  code: string | null;
  state: string | null;
  error: string | null;
  expectedState: string | undefined;
}): Promise<"ok" | GoogleSignInError> {
  // The customer pressed Cancel on Google's screen.
  if (input.error) return "cancelled";
  if (
    !input.code ||
    !input.state ||
    !input.expectedState ||
    input.state !== input.expectedState
  ) {
    return "failed";
  }

  let token: string;
  try {
    const result = await createAuthClient().auth.callback("customer", "google", {
      code: input.code,
      state: input.state,
    });
    if (typeof result !== "string") return "failed";
    token = result;
  } catch (err) {
    console.error("[google-auth] callback failed:", err);
    return "failed";
  }

  try {
    await sdk.client.fetch("/store/auth/google/complete", {
      method: "POST",
      headers: { ...authHeaders(token), ...(await storefrontHeaders()) },
    });
  } catch (err) {
    if ((err as { status?: number })?.status === 409) return "unverified";
    console.error("[google-auth] complete failed:", err);
    return "failed";
  }

  let session: string;
  try {
    session = await createAuthClient().auth.refresh(authHeaders(token));
  } catch (err) {
    console.error("[google-auth] refresh failed:", err);
    return "failed";
  }

  await setAuthToken(session);
  await transferGuestCart(session);
  revalidatePath("/", "layout");
  return "ok";
}
