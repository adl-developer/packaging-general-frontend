"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { HttpTypes } from "@medusajs/types";
import { sdk, createAuthClient, authHeaders } from "@/lib/medusa";
import { AUTH_COOKIE, getAuthToken } from "@/lib/auth-token";
import {
  isValidEmail,
  normalizeGhanaPhone,
  EMAIL_ERROR,
  PHONE_ERROR,
} from "@/lib/validation";

/**
 * Customer authentication for the storefront.
 *
 * The Medusa customer JWT lives in an httpOnly cookie (AUTH_COOKIE). We never
 * use the SDK's in-memory token store (it leaks across SSR requests) — instead
 * we read the token from the cookie and pass it as an Authorization header on
 * each authenticated call (see authHeaders()).
 *
 * Flow (Medusa v2 emailpass):
 *   register → returns a registration JWT
 *   store.customer.create (with that JWT) → creates the customer record
 *   login → returns the real auth JWT (persisted in the cookie)
 */
const CART_COOKIE = "pg_cart_id";
// Must match the backend's jwtExpiresIn ("24h" in medusa-config.ts) — a cookie
// that outlives the JWT just produces silent 401s until it's cleared.
const AUTH_TTL_SECONDS = 60 * 60 * 24; // 24 hours

const AUTH_COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: AUTH_TTL_SECONDS,
  path: "/",
};

export type AuthState = {
  error: string | null;
  /** Set when sign-in/sign-up must pause for email verification — the auth
   *  card swaps to the "verify your email" panel for this address. */
  unverifiedEmail?: string;
  /** True when the pause follows a fresh signup (a link was JUST sent by the
   *  backend), so the panel opens in its "link sent" state. */
  verificationJustSent?: boolean;
};

// Deliberately generic: confirming "this email is already registered" lets
// anyone test which emails have accounts (enumeration). Same wording for
// every signup-conflict path so the response can't be differentiated.
const SIGNUP_FAILED =
  "We couldn't create an account with these details. If you already have an account, try signing in or resetting your password.";

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
  } catch (err) {
    // Only drop the cookie when the backend actually rejects the token (or the
    // customer record is gone). A transient network/5xx failure must NOT log
    // the user out — keep the cookie and treat them as signed out for this
    // request only.
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403 || status === 404) {
      await clearAuthToken();
    }
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
 * Signup core shared by the auth card and the post-checkout create-account
 * dialog: register the emailpass identity (recovering a half-completed earlier
 * attempt), create the customer record, then exchange for a real session
 * token. Returns the token, or a user-facing error message.
 */
async function registerCustomer(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
}): Promise<{ token: string } | { error: string }> {
  const { email, password, firstName, lastName, company, phone } = input;
  const authClient = createAuthClient();

  let token: string;
  try {
    token = await authClient.auth.register("customer", "emailpass", {
      email,
      password,
    });
  } catch {
    // The auth identity already exists. The ONLY case signup may continue is
    // a half-completed earlier attempt (identity created, customer record
    // never saved) — log in to check. A complete account must get the
    // generic failure, never a silent sign-in.
    try {
      const recovered = await authClient.auth.login("customer", "emailpass", {
        email,
        password,
      });
      if (typeof recovered !== "string") {
        return { error: SIGNUP_FAILED };
      }
      const existing = await sdk.store.customer
        .retrieve({}, authHeaders(recovered))
        .catch(() => null);
      if (existing) {
        return { error: SIGNUP_FAILED };
      }
      token = recovered;
    } catch {
      return { error: SIGNUP_FAILED };
    }
  }

  try {
    await sdk.store.customer.create(
      {
        email,
        first_name: firstName,
        last_name: lastName,
        company_name: company,
        phone,
      },
      {},
      authHeaders(token)
    );
  } catch {
    // The customer record may already exist for this identity (recovered
    // signup above) — only fail if it really isn't there.
    const existing = await sdk.store.customer
      .retrieve({}, authHeaders(token))
      .catch(() => null);
    if (!existing) {
      return { error: "Could not save your details. Please try again." };
    }
  }

  // Exchange the registration token for a real auth session token.
  try {
    const result = await authClient.auth.login("customer", "emailpass", {
      email,
      password,
    });
    if (typeof result !== "string") {
      return { error: "Account created. Please sign in to continue." };
    }
    return { token: result };
  } catch {
    return { error: "Account created. Please sign in to continue." };
  }
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
    if (!isValidEmail(email)) return fieldError(EMAIL_ERROR);
    if (password.length < 8) {
      return fieldError("Password must be at least 8 characters.");
    }
    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(" ");
    // Phone is optional on signup, but when given it must be a real Ghana
    // number — normalized to E.164 so SMS notifications work later.
    const phone = phoneLocal ? normalizeGhanaPhone(phoneLocal) : undefined;
    if (phone === null) return fieldError(PHONE_ERROR);

    const outcome = await registerCustomer({
      email,
      password,
      firstName,
      lastName: lastName || undefined,
      company: company || undefined,
      phone,
    });
    if ("error" in outcome) {
      return fieldError(outcome.error);
    }

    // New accounts start unverified (the backend's customer.created subscriber
    // marks them and emails the link). No session until the email is verified
    // — signing them in here would make the login gate below meaningless.
    return { error: null, unverifiedEmail: email, verificationJustSent: true };
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

  // Verification gate — only reached with CORRECT credentials, so showing the
  // "not verified" state here reveals nothing a wrong-password attempt could
  // learn (those get the generic error above). Legacy accounts have no
  // email_verified flag and pass straight through; only an explicit `false`
  // (accounts created since the verification feature) blocks.
  try {
    const { customer } = await sdk.store.customer.retrieve(
      { fields: "+metadata" },
      authHeaders(result)
    );
    if (customer?.metadata?.email_verified === false) {
      return { error: null, unverifiedEmail: email };
    }
  } catch {
    // Transient failure — fall through and sign in as before; the gate only
    // acts on a positive "unverified" read.
  }

  await setAuthToken(result);
  await transferGuestCart(result);
  revalidatePath("/", "layout");
  redirect("/account/orders");
}

/* ─── Post-checkout account creation ─── */

export type OrderSignupState = {
  status: "idle" | "created" | "error";
  /** Whether the order was linked to the new account (best-effort). */
  linked: boolean;
  error: string | null;
};

/**
 * "Create Your Account" dialog on the order-confirmation page. Registers the
 * customer with the order's email (passed via hidden fields — tampering gains
 * nothing: anyone can register any unclaimed email via /sign-up, and the
 * claim route re-verifies email ownership server-side), then links the
 * just-placed order via POST /store/order-lookup/claim. The account starts
 * UNVERIFIED (the backend emails the verification link on creation), so no
 * session cookie is set — the dialog tells them to check their email instead.
 * The claim still runs with the ephemeral registration token: the order's own
 * email on the account is the claim route's proof, and any other guest orders
 * get adopted when they verify.
 */
export async function createAccountFromOrder(
  _prev: OrderSignupState,
  formData: FormData
): Promise<OrderSignupState> {
  const orderNumber = String(formData.get("order_number") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const contactPerson = String(formData.get("contact_person") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  const fail = (error: string): OrderSignupState => ({
    status: "error",
    linked: false,
    error,
  });

  if (!email || !orderNumber) {
    return fail(
      "We couldn't read this order's details. You can create an account any time from the Sign In page."
    );
  }
  if (password.length < 8) {
    return fail("Password must be at least 8 characters.");
  }
  if (password !== confirm) {
    return fail("Passwords don't match.");
  }

  const [firstName, ...rest] = contactPerson.split(/\s+/).filter(Boolean);
  const outcome = await registerCustomer({
    email,
    password,
    firstName: firstName || undefined,
    lastName: rest.join(" ") || undefined,
    company: company || undefined,
  });
  if ("error" in outcome) {
    return fail(outcome.error);
  }

  // Deliberately NOT signed in — the account must verify its email first
  // (same gate as /sign-in). The token below is used once for the claim.

  // Best-effort: a linking failure must not read as "account creation failed"
  // — the account exists and the user is signed in; the order can still be
  // tracked by number + email.
  let linked = false;
  try {
    await sdk.client.fetch("/store/order-lookup/claim", {
      method: "POST",
      body: { order_number: orderNumber, email },
      headers: authHeaders(outcome.token),
    });
    linked = true;
  } catch (err) {
    console.error("[auth] order claim failed:", err);
  }

  return { status: "created", linked, error: null };
}

/* ─── Email verification ─── */

export type VerificationRequestState = { sent: boolean; error: string | null };

/**
 * "Verify email" CTA — asks the backend to (re)send the verification link.
 * The backend answers { sent: true } whether or not the email has an account
 * (anti-enumeration) and enforces a one-per-minute per-email cooldown (429).
 */
export async function requestVerificationEmail(
  _prev: VerificationRequestState,
  formData: FormData
): Promise<VerificationRequestState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!isValidEmail(email)) return { sent: false, error: EMAIL_ERROR };

  try {
    await sdk.client.fetch("/store/email-verification/request", {
      method: "POST",
      body: { email },
    });
    return { sent: true, error: null };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      return {
        sent: false,
        error:
          "A link was sent recently. Please wait a minute before requesting another.",
      };
    }
    console.error("[auth] requestVerificationEmail failed:", err);
    return {
      sent: false,
      error: "We couldn't send the verification link right now. Please try again.",
    };
  }
}

/**
 * /verify-email page — redeem the emailed token. A 400 means the link is bad
 * or expired (the page offers a resend); anything else is transport trouble.
 */
export async function confirmEmailVerification(
  email: string,
  token: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!email || !token) {
    return {
      ok: false,
      error: "This verification link is invalid or has expired. Please request a new one.",
    };
  }
  try {
    await sdk.client.fetch("/store/email-verification/confirm", {
      method: "POST",
      body: { email: email.trim().toLowerCase(), token },
    });
    return { ok: true, error: null };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const msg = (err as { message?: string })?.message;
    if (status === 400) {
      return {
        ok: false,
        error:
          msg ||
          "This verification link is invalid or has expired. Please request a new one.",
      };
    }
    console.error("[auth] confirmEmailVerification failed:", err);
    return {
      ok: false,
      error: "We couldn't verify your email right now. Please try again.",
    };
  }
}

export type OrderEmailAccountStatus = "none" | "unverified" | "verified";

/**
 * Post-checkout dialog branch: does the order's email already have an account,
 * and is it verified? Gated server-side behind the order_number + email pair
 * (the order-lookup shared secret), so it isn't an open enumeration oracle.
 * Any failure degrades to "none" — the plain create-account form.
 */
export async function getOrderEmailAccountStatus(
  orderNumber: string,
  email: string
): Promise<OrderEmailAccountStatus> {
  try {
    const { status } = await sdk.client.fetch<{
      status: OrderEmailAccountStatus;
    }>("/store/email-verification/status", {
      method: "POST",
      body: { order_number: orderNumber, email: email.trim().toLowerCase() },
    });
    return status === "unverified" || status === "verified" ? status : "none";
  } catch (err) {
    console.error("[auth] verification status lookup failed:", err);
    return "none";
  }
}

export async function logout() {
  // Real revocation: the backend denylists the JWT so a stolen copy dies now
  // instead of living until natural expiry. Best-effort — a failure (backend
  // down, token already expired) must never block sign-out.
  const token = await getAuthToken();
  if (token) {
    try {
      await sdk.client.fetch("/store/auth/revoke", {
        method: "POST",
        headers: authHeaders(token),
      });
    } catch (err) {
      console.error("[auth] token revocation failed:", err);
    }
  }
  await clearAuthToken();
  revalidatePath("/", "layout");
  redirect("/");
}

/* ─── Password reset ─── */

export type ResetState = { ok: boolean; error: string | null };

const RESET_INVALID =
  "This reset link is invalid or has expired. Please request a new one.";

/**
 * Step 1 — request a reset link. Medusa's reset-password route returns 201
 * whether or not the email exists (anti-enumeration), so the success path is
 * identical for every email and reveals nothing. A thrown error is therefore a
 * real transport/rate-limit problem, not "no such account".
 */
export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Please enter your email address." };

  try {
    await createAuthClient().auth.resetPassword("customer", "emailpass", {
      identifier: email,
    });
    return { ok: true, error: null };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      return {
        ok: false,
        error: "Too many requests. Please wait a few minutes and try again.",
      };
    }
    console.error("[auth] requestPasswordReset failed:", err);
    return {
      ok: false,
      error: "We couldn't send the reset link right now. Please try again.",
    };
  }
}

/**
 * Step 2 — set a new password using the token from the email link. On success
 * the customer is auto-logged-in (mirrors signup/signin) and sent to their
 * orders; if auto-login somehow fails, they're sent to sign in with the new
 * password.
 */
export async function resetPassword(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const token = String(formData.get("token") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!token || !email) return { ok: false, error: RESET_INVALID };
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords don't match." };
  }

  const authClient = createAuthClient();
  try {
    await authClient.auth.updateProvider(
      "customer",
      "emailpass",
      { email, password },
      token
    );
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 400 || status === 404) {
      return { ok: false, error: RESET_INVALID };
    }
    console.error("[auth] resetPassword failed:", err);
    return {
      ok: false,
      error: "We couldn't reset your password. Please try again.",
    };
  }

  // Best-effort auto-login with the new password.
  let authToken: string | null = null;
  try {
    const result = await authClient.auth.login("customer", "emailpass", {
      email,
      password,
    });
    if (typeof result === "string") authToken = result;
  } catch {
    /* fall through to manual sign-in */
  }

  // Security notice: "your password has been updated". The backend has no
  // event for an emailpass update, so the storefront triggers it — the route
  // requires this account's bearer token and mails only the account's own
  // address. Best-effort: a mail failure must not fail the reset.
  if (authToken) {
    try {
      await sdk.client.fetch("/store/account/password-changed-notice", {
        method: "POST",
        headers: authHeaders(authToken),
      });
    } catch (err) {
      console.error("[auth] password-changed notice failed:", err);
    }
  }

  // Same verification gate as sign-in — without this, resetting the password
  // would quietly bypass the unverified-login block. (Placed after the notice
  // send so the security email still goes out.) They land on /sign-in, where
  // signing in shows the verify-email panel.
  if (authToken) {
    try {
      const { customer } = await sdk.store.customer.retrieve(
        { fields: "+metadata" },
        authHeaders(authToken)
      );
      if (customer?.metadata?.email_verified === false) {
        authToken = null;
      }
    } catch {
      /* transient read failure — keep the token, gate only on a positive read */
    }
  }

  // redirect() throws NEXT_REDIRECT, so it must live outside any try/catch.
  if (authToken) {
    await setAuthToken(authToken);
    await transferGuestCart(authToken);
    revalidatePath("/", "layout");
    redirect("/account/orders");
  }
  redirect("/sign-in?reset=success");
}

/* ─── Account settings (change email / delete account) ─── */

export type AccountSettingsState = { ok: boolean; error: string | null };

/** Map backend errors to a user-facing message without leaking internals.
 *  401 = the re-entered password was wrong; 400s carry user-safe validation
 *  text ("That email address is already in use."). */
function settingsError(err: unknown, fallback: string): string {
  const status = (err as { status?: number })?.status;
  if (status === 401) return "Incorrect password.";
  const msg = (err as { message?: string })?.message;
  if (status === 400 && msg) return msg;
  return fallback;
}

export async function changeAccountEmail(
  _prev: AccountSettingsState,
  formData: FormData
): Promise<AccountSettingsState> {
  const newEmail = String(formData.get("new_email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  if (!isValidEmail(newEmail)) return { ok: false, error: EMAIL_ERROR };
  if (!password) {
    return { ok: false, error: "Please enter your current password." };
  }

  const token = await getAuthToken();
  if (!token) redirect("/sign-in");

  try {
    await sdk.client.fetch("/store/account/email", {
      method: "POST",
      body: { new_email: newEmail, password },
      headers: authHeaders(token),
    });
  } catch (err) {
    console.error("[auth] change email failed:", err);
    return {
      ok: false,
      error: settingsError(
        err,
        "We couldn't update your email. Please try again."
      ),
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

export async function deleteAccount(
  _prev: AccountSettingsState,
  formData: FormData
): Promise<AccountSettingsState> {
  const password = String(formData.get("password") || "");
  if (!password) {
    return { ok: false, error: "Please enter your password to confirm." };
  }

  const token = await getAuthToken();
  if (!token) redirect("/sign-in");

  try {
    await sdk.client.fetch("/store/account", {
      method: "DELETE",
      body: { password },
      headers: authHeaders(token),
    });
  } catch (err) {
    console.error("[auth] account deletion failed:", err);
    return {
      ok: false,
      error: settingsError(
        err,
        "We couldn't delete your account. Please try again."
      ),
    };
  }

  // The backend already revoked the JWT and deleted the login; drop the local
  // session + cart cookies (the cart belonged to the deleted customer).
  const store = await cookies();
  store.delete(AUTH_COOKIE);
  store.delete(CART_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}
