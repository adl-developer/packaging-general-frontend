"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Loader2, AlertCircle, CheckCircle2, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  authenticate,
  requestVerificationEmail,
  type AuthState,
  type VerificationRequestState,
} from "@/lib/actions/auth";
import {
  AuthFormBody,
  AuthSocialRow,
  AuthTabs,
  Divider,
  socialButton,
  type AuthTab,
} from "./auth-form-fields";

/**
 * Tabbed auth card — exact spec from Figma "Sign In" (458:14565) and
 * "Sign Up" (460:15668): centered 448px card with heading, Sign In / Sign Up
 * tabs, social buttons, email form, guest button, terms.
 *
 * The tabs, social row and form fields live in ./auth-form-fields so the Buy
 * Now modal renders the identical controls (see
 * docs/superpowers/specs/2026-08-06-buy-now-signed-out-design.md).
 *
 * Submits through the `authenticate` server action (Medusa emailpass auth);
 * the hidden `mode` field tells the action which tab is active.
 */
type Tab = AuthTab;

const initialAuthState: AuthState = { error: null };

export function AuthCard({
  defaultTab = "signin",
  notice,
}: {
  defaultTab?: Tab;
  notice?: string;
}) {
  const [tab, setTab] = React.useState<Tab>(defaultTab);
  const [state, formAction, pending] = useActionState(
    authenticate,
    initialAuthState,
  );

  // Sign-in with correct credentials on an unverified account (or a fresh
  // signup) pauses here: verify-email panel instead of the form.
  if (state.unverifiedEmail) {
    return (
      <UnverifiedPanel
        email={state.unverifiedEmail}
        justSent={!!state.verificationJustSent}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[448px] flex-col gap-8 px-4 pt-8">
      {/* Heading */}
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold leading-8 text-brand">
          Welcome Back
        </h1>
        <p className="text-base leading-6 text-muted">
          Sign in to your account or create a new one
        </p>
      </div>

      {notice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-button border border-[#bbe5c8] bg-[#dcfce7] px-3 py-2 text-sm text-[#166534]"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{notice}</span>
        </p>
      )}

      {/* Tabs */}
      <div className="flex flex-col gap-10">
        <AuthTabs tab={tab} onTabChange={setTab} />

        <div className="flex flex-col gap-6">
          <AuthSocialRow />

          {/* Email + password form */}
          <form action={formAction} className="flex flex-col gap-4">
            <AuthFormBody
              tab={tab}
              error={state.error}
              pending={pending}
              submitLabel={tab === "signin" ? "Sign In" : "Create Account"}
            />
          </form>

          <Divider label="Or" />

          <Link
            href="/products"
            className={cn(socialButton, "no-underline")}
          >
            Continue as Guest
          </Link>
        </div>

        <p className="text-center text-xs leading-4 text-muted">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-brand">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-brand">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

const INITIAL_VERIFY_STATE: VerificationRequestState = {
  sent: false,
  error: null,
};

/**
 * Shown when sign-in (correct password) or a fresh signup hits an unverified
 * account. Primary CTA sends a new verification link; secondary continues as a
 * guest ("place order with no account").
 */
function UnverifiedPanel({
  email,
  justSent,
}: {
  email: string;
  justSent: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    requestVerificationEmail,
    INITIAL_VERIFY_STATE,
  );
  const sent = state.sent || justSent;

  return (
    <div className="mx-auto flex w-full max-w-[448px] flex-col gap-8 px-4 pt-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-rust/10">
          <MailCheck className="size-8 text-rust" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-8 text-brand">
            Verify your email address
          </h1>
          <p className="text-base leading-6 text-muted">
            {justSent
              ? "Your account has been created — one more step."
              : "Your email address hasn't been verified yet. Verify it to activate your account and sign in."}
          </p>
        </div>
      </div>

      {sent && (
        <p
          role="status"
          className="flex items-start gap-3 rounded-button border border-[#bbe5c8] bg-[#dcfce7] px-5 py-4 text-base leading-6 text-[#166534]"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            A verification link has been sent to <strong>{email}</strong>.
            Check your email and click or tap the link to verify your account.
          </span>
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-button border border-rust/30 bg-rust/10 px-3 py-2 text-sm text-rust"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </p>
      )}

      <div className="flex flex-col gap-3">
        <form action={formAction}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-button bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {sent ? "Resend Verification Email" : "Send verification email"}
          </button>
        </form>

        <Link href="/products" className={cn(socialButton, "no-underline")}>
          Place Order Without an Account
        </Link>
      </div>

      <p className="text-center text-sm text-muted">
        Verified already?{" "}
        {/* plain <a>: a full reload is what resets the action state */}
        <a
          href="/sign-in"
          className="font-medium text-brand underline-offset-2 hover:underline"
        >
          Back to sign in
        </a>
      </p>
    </div>
  );
}

