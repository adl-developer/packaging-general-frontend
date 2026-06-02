"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { HttpTypes } from "@medusajs/types";
import { sdk, createAuthClient, authHeaders } from "@/lib/medusa";

/**
 * Customer authentication for the storefront.
 *
 * The Medusa customer JWT lives in an httpOnly cookie (`_medusa_jwt`). We never
 * use the SDK's in-memory token store (it leaks across SSR requests) — instead
 * we read the token from the cookie and pass it as an Authorization header on
 * each authenticated call (see authHeaders()).
 *
 * Flow (Medusa v2 emailpass):
 *   register → returns a registration JWT
 *   store.customer.create (with that JWT) → creates the customer record
 *   login → returns the real auth JWT (persisted in the cookie)
 */
const AUTH_COOKIE = "_medusa_jwt";
const CART_COOKIE = "pg_cart_id";
const AUTH_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const AUTH_COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: AUTH_TTL_SECONDS,
  path: "/",
};

export type AuthState = { error: string | null };

export async function getAuthToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(AUTH_COOKIE)?.value;
}

async function setAuthToken(token: string) {
  const store = await cookies();
  store.set(AUTH_COOKIE, token, AUTH_COOKIE_OPTS);
}

async function clearAuthToken() {
  try {
    const store = await cookies();
    store.delete(AUTH_COOKIE);
  } catch {
    // Read context (Server Component) — non-fatal; cleared on next mutation.
  }
}

/**
 * The logged-in customer, or null. Safe to call from Server Components.
 * Clears the cookie if the token is rejected (expired / revoked).
 */
export async function getCustomer(): Promise<HttpTypes.StoreCustomer | null> {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    const { customer } = await sdk.store.customer.retrieve(
      {},
      authHeaders(token)
    );
    return customer;
  } catch {
    await clearAuthToken();
    return null;
  }
}

/** Best-effort: attach the guest cart to the now-authenticated customer. */
async function transferGuestCart(token: string) {
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

function fieldError(message: string): AuthState {
  return { error: message };
}

/**
 * Single entry point for the auth card. Branches on the hidden `mode` field so
 * one `useActionState` drives both the Sign In and Sign Up tabs.
 */
export async function authenticate(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const mode = String(formData.get("mode") || "signin");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return fieldError("Email and password are required.");
  }

  const authClient = createAuthClient();

  if (mode === "signup") {
    const fullName = String(formData.get("name") || "").trim();
    const company = String(formData.get("company") || "").trim();
    const phoneLocal = String(formData.get("phone") || "").trim();
    if (!fullName) return fieldError("Please enter your full name.");
    if (password.length < 8) {
      return fieldError("Password must be at least 8 characters.");
    }
    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(" ");
    const phone = phoneLocal
      ? `+233${phoneLocal.replace(/[^0-9]/g, "")}`
      : undefined;

    let token: string;
    try {
      token = await authClient.auth.register("customer", "emailpass", {
        email,
        password,
      });
    } catch {
      return fieldError(
        "Could not create the account. This email may already be registered — try signing in."
      );
    }

    try {
      await sdk.store.customer.create(
        {
          email,
          first_name: firstName,
          last_name: lastName || undefined,
          company_name: company || undefined,
          phone,
        },
        {},
        authHeaders(token)
      );
    } catch {
      return fieldError("Could not save your details. Please try again.");
    }

    // Exchange the registration token for a real auth session token.
    let authToken: string;
    try {
      const result = await authClient.auth.login("customer", "emailpass", {
        email,
        password,
      });
      if (typeof result !== "string") {
        return fieldError("Account created. Please sign in to continue.");
      }
      authToken = result;
    } catch {
      return fieldError("Account created. Please sign in to continue.");
    }

    await setAuthToken(authToken);
    await transferGuestCart(authToken);
    revalidatePath("/", "layout");
    redirect("/account/orders");
  }

  // mode === "signin"
  let result: string | { location: string } | Record<string, unknown>;
  try {
    result = await authClient.auth.login("customer", "emailpass", {
      email,
      password,
    });
  } catch {
    return fieldError("Invalid email or password.");
  }
  if (typeof result !== "string") {
    return fieldError("Additional verification is required to sign in.");
  }

  await setAuthToken(result);
  await transferGuestCart(result);
  revalidatePath("/", "layout");
  redirect("/account/orders");
}

export async function logout() {
  // JWT auth is stateless — there's no server session to invalidate, so
  // dropping our httpOnly cookie is the sign-out.
  await clearAuthToken();
  revalidatePath("/", "layout");
  redirect("/");
}
