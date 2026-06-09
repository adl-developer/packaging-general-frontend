"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { resetPassword, type ResetState } from "@/lib/actions/auth";

/**
 * Set-new-password form. Reads the one-time token + email from the email link
 * (passed in as props). On success the action auto-logs-in and redirects, so
 * this only ever renders the form or an error.
 */
const fieldLabel = "text-sm font-medium leading-none tracking-tight text-brand";
const fieldInput =
  "h-11 w-full rounded-button border-2 border-input bg-surface px-3 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none";

const initialState: ResetState = { ok: false, error: null };

export function ResetPasswordCard({
  token,
  email,
}: {
  token?: string;
  email?: string;
}) {
  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialState
  );
  const [showPassword, setShowPassword] = React.useState(false);

  // No token/email in the URL → the link is malformed or was opened directly.
  if (!token || !email) {
    return (
      <div className="mx-auto flex w-full max-w-[448px] flex-col items-center gap-4 px-4 pt-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-rust/10 text-rust">
          <ShieldAlert className="size-7" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold leading-8 tracking-tight text-brand">
            Invalid reset link
          </h1>
          <p className="text-base leading-6 text-muted">
            This password reset link is invalid or incomplete. Please request a
            new one.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="mt-2 inline-flex h-11 items-center justify-center rounded-button bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[448px] flex-col gap-8 px-4 pt-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold leading-8 tracking-tight text-brand">
          Choose a new password
        </h1>
        <p className="text-base leading-6 text-muted">
          Setting a new password for{" "}
          <strong className="text-brand">{email}</strong>
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={email} />

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className={fieldLabel}>
            New Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              required
              minLength={8}
              className={cn(fieldInput, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-button text-brand transition-colors hover:bg-line/30"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="confirm" className={fieldLabel}>
            Confirm New Password
          </label>
          <input
            id="confirm"
            name="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
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
          Reset password
        </button>
      </form>
    </div>
  );
}
