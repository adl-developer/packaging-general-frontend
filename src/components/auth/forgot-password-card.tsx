"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { requestPasswordReset, type ResetState } from "@/lib/actions/auth";

/**
 * Forgot-password request form. Submits an email to requestPasswordReset; the
 * success state is intentionally generic ("if an account exists…") so it never
 * reveals whether the email is registered.
 */
const fieldLabel = "text-sm font-medium leading-none tracking-tight text-brand";
const fieldInput =
  "h-11 w-full rounded-button border-2 border-input bg-surface px-3 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none";

const initialState: ResetState = { ok: false, error: null };

export function ForgotPasswordCard() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  return (
    <div className="mx-auto flex w-full max-w-[448px] flex-col gap-8 px-4 pt-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold leading-8 tracking-tight text-brand">
          Reset your password
        </h1>
        <p className="text-base leading-6 text-muted">
          Enter your email and we&apos;ll send you a link to choose a new
          password.
        </p>
      </div>

      {state.ok ? (
        <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-background px-6 py-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-accent/15 text-accent">
            <MailCheck className="size-7" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold text-brand">Check your email</p>
            <p className="text-sm leading-5 text-muted">
              If an account exists for that address, a password reset link is on
              its way. The link expires soon, so use it promptly.
            </p>
          </div>
          <Link
            href="/sign-in"
            className="mt-2 inline-flex h-11 items-center justify-center rounded-button bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className={fieldLabel}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              className={fieldInput}
            />
          </div>

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

          <button
            type="submit"
            disabled={pending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-button bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Send reset link
          </button>

          <Link
            href="/sign-in"
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-button border border-line bg-background text-sm font-medium text-brand no-underline transition-colors hover:bg-line/30"
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to Sign In
          </Link>
        </form>
      )}
    </div>
  );
}
