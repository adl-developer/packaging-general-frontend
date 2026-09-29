"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/medusa";
import { currentStorefrontUrl } from "@/lib/storefront-origin";
import {
  GOOGLE_CALLBACK_PATH,
  GOOGLE_FLOW_TTL_SECONDS,
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  isGoogleConsentUrl,
  safeNextPath,
  stateFromConsentUrl,
} from "@/lib/google-sign-in";

const FLOW_COOKIE_OPTS = {
  httpOnly: true as const,
  // Lax still travels on Google's top-level GET redirect back to us.
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: GOOGLE_FLOW_TTL_SECONDS,
  path: "/",
};

/**
 * "Continue with Google" button → Google's consent screen.
 *
 * The callback URL is built from THIS request's origin, so www and app.*
 * each come back to themselves (both are registered with Google; an
 * unregistered origin is refused by Google, not us).
 */
export async function startGoogleSignIn(formData: FormData): Promise<void> {
  const next = safeNextPath(formData.get("next"));
  const origin = await currentStorefrontUrl();

  let location: string | null = null;
  if (origin) {
    try {
      const result = await createAuthClient().auth.login("customer", "google", {
        callback_url: `${origin}${GOOGLE_CALLBACK_PATH}`,
      });
      const candidate =
        typeof result === "object" && result && "location" in result
          ? result.location
          : null;
      if (isGoogleConsentUrl(candidate)) location = candidate;
    } catch (err) {
      // Backend without Google credentials answers here (provider missing).
      console.error("[google-auth] start failed:", err);
    }
  }

  const state = location ? stateFromConsentUrl(location) : null;
  // redirect() throws NEXT_REDIRECT, so both calls live outside the try.
  if (!location || !state) {
    redirect("/sign-in?google=unavailable");
  }

  const store = await cookies();
  store.set(GOOGLE_STATE_COOKIE, state, FLOW_COOKIE_OPTS);
  store.set(GOOGLE_NEXT_COOKIE, next, FLOW_COOKIE_OPTS);
  redirect(location);
}
