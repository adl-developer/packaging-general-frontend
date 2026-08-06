"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING_SOFT } from "@/lib/motion";
import { GH_PHONE_PATTERN, PHONE_ERROR } from "@/lib/validation";

/**
 * The reusable middle of the auth card — tabs, social row, and the email
 * form's contents — shared by the /sign-in page (auth-card.tsx) and the Buy
 * Now modal (buy-now-auth-dialog.tsx).
 *
 * Field specs come from Figma "Sign In" (458:14565) and "Sign Up" (460:15668)
 * and must stay identical in both places, which is the whole reason this
 * lives in one file.
 */
export type AuthTab = "signin" | "signup";

export const fieldLabel = "text-sm font-medium leading-none text-brand";
export const fieldInput =
  "h-11 w-full rounded-button border-2 border-input bg-surface px-3 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none";
export const socialButton =
  "flex h-11 w-full items-center justify-center gap-2 rounded-button border border-line bg-background text-sm font-medium text-brand transition-colors hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/** Sign In / Sign Up tablist. `layoutId` is a prop so two instances could
 *  never fight over the same shared-layout pill. */
export function AuthTabs({
  tab,
  onTabChange,
  layoutId = "authTabPill",
}: {
  tab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  layoutId?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Authentication"
      className="grid grid-cols-2 gap-1 rounded-option bg-line p-1"
    >
      {(["signin", "signup"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={tab === t}
          onClick={() => onTabChange(t)}
          className={cn(
            "relative h-8 rounded-button px-3 text-sm font-medium transition-colors",
            tab === t ? "text-brand" : "text-muted hover:text-brand",
          )}
        >
          {tab === t && (
            <motion.span
              layoutId={layoutId}
              transition={SPRING_SOFT}
              className="absolute inset-0 rounded-button bg-background shadow-sm"
            />
          )}
          <span className="relative">
            {t === "signin" ? "Sign In" : "Sign Up"}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Social providers + "Or continue with email" divider.
 *  ⚠ The Google button is not wired to anything — it never has been. Kept for
 *  visual parity with /sign-in; wire it or hide it before launch. */
export function AuthSocialRow() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <button type="button" className={socialButton}>
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
      <Divider label="Or continue with email" />
    </>
  );
}

/**
 * Everything that lives INSIDE the `<form>`: the hidden mode field, the
 * per-tab inputs, the error region and the submit button. The `<form>` itself
 * (and its action) belongs to the caller, which is what lets the modal add
 * hidden item fields via `extraFields`.
 */
export function AuthFormBody({
  tab,
  error,
  pending,
  submitLabel,
  extraFields,
}: {
  tab: AuthTab;
  error: string | null;
  pending: boolean;
  submitLabel: string;
  extraFields?: React.ReactNode;
}) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <>
      <input type="hidden" name="mode" value={tab} />
      {extraFields}

      {tab === "signup" && (
        <Field id="name" label="Full Name">
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Ama Mensah"
            required
            className={fieldInput}
          />
        </Field>
      )}

      <Field id="email" label="Email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          className={fieldInput}
        />
      </Field>

      <Field id="password" label="Password">
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={tab === "signin" ? "current-password" : "new-password"}
            placeholder="••••••••"
            required
            minLength={tab === "signup" ? 8 : undefined}
            className={cn(fieldInput, "pr-11")}
          />
          <PasswordToggle
            shown={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
          />
        </div>
      </Field>

      {tab === "signin" && (
        <div className="-mt-1 flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      )}

      {tab === "signup" && (
        <>
          <Field id="company" label="Company Name">
            <input
              id="company"
              name="company"
              type="text"
              autoComplete="organization"
              placeholder="Your Company Ltd."
              className={fieldInput}
            />
          </Field>

          <Field id="phone" label="Phone Number">
            <div className="flex gap-2">
              <span className="inline-flex h-11 shrink-0 items-center rounded-button border-2 border-input bg-surface px-3 text-sm font-medium text-brand">
                🇬🇭 +233
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel-national"
                placeholder="24 123 4567"
                pattern={GH_PHONE_PATTERN}
                title={PHONE_ERROR}
                className={fieldInput}
              />
            </div>
          </Field>
        </>
      )}

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-button border border-rust/30 bg-rust/10 px-3 py-2 text-sm text-rust"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-button bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {submitLabel}
      </button>
    </>
  );
}

export function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function PasswordToggle({
  shown,
  onToggle,
}: {
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-button text-brand transition-colors hover:bg-line/30"
    >
      {shown ? (
        <EyeOff className="size-4" aria-hidden />
      ) : (
        <Eye className="size-4" aria-hidden />
      )}
    </button>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center">
      <span className="h-px w-full bg-line" aria-hidden />
      <span className="absolute left-1/2 -translate-x-1/2 bg-surface px-2 text-xs text-muted">
        {label}
      </span>
    </div>
  );
}

/* Brand marks — inline SVGs (lucide has no brand icons). */
export function GoogleIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path
        fill="#4285f4"
        d="M15.68 8.18c0-.57-.05-1.11-.15-1.64H8v3.1h4.3a3.68 3.68 0 0 1-1.6 2.42v2h2.58c1.51-1.39 2.4-3.44 2.4-5.88Z"
      />
      <path
        fill="#34a853"
        d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.58-2c-.72.48-1.63.76-2.71.76-2.08 0-3.84-1.4-4.47-3.29H.86v2.07A8 8 0 0 0 8 16Z"
      />
      <path
        fill="#fbbc05"
        d="M3.53 9.53A4.8 4.8 0 0 1 3.27 8c0-.53.09-1.05.26-1.53V4.4H.86A8 8 0 0 0 0 8c0 1.29.31 2.51.86 3.6l2.67-2.07Z"
      />
      <path
        fill="#ea4335"
        d="M8 3.18c1.17 0 2.23.4 3.06 1.2l2.29-2.3A7.65 7.65 0 0 0 8 0 8 8 0 0 0 .86 4.4l2.67 2.07C4.16 4.58 5.92 3.18 8 3.18Z"
      />
    </svg>
  );
}
