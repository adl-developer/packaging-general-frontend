"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";
import { authenticate, type AuthState } from "@/lib/actions/auth";

/**
 * Tabbed auth card — exact spec from Figma "Sign In" (458:14565) and
 * "Sign Up" (460:15668): centered 448px card with heading, Sign In / Sign Up
 * tabs, social buttons, email form, guest button, terms.
 *
 * Sign In fields: Email, Password. Sign Up fields: Full Name, Email, Password,
 * Company Name, Phone Number (Ghana +233 prefix) — both verified against the
 * cached Figma nodes.
 *
 * TODO(medusa): wire submit handlers to the Medusa customer/auth endpoints.
 */
type Tab = "signin" | "signup";

const fieldLabel = "text-sm font-medium leading-none tracking-tight text-brand";
const fieldInput =
  "h-11 w-full rounded-button border-2 border-input bg-surface px-3 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none";
const socialButton =
  "flex h-11 w-full items-center justify-center gap-2 rounded-button border border-line bg-background text-sm font-medium text-brand transition-colors hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

const initialAuthState: AuthState = { error: null };

export function AuthCard({ defaultTab = "signin" }: { defaultTab?: Tab }) {
  const [tab, setTab] = React.useState<Tab>(defaultTab);
  const [showPassword, setShowPassword] = React.useState(false);
  const [state, formAction, pending] = useActionState(
    authenticate,
    initialAuthState,
  );

  return (
    <div className="mx-auto flex w-full max-w-[448px] flex-col gap-8 px-4 pt-8">
      {/* Heading */}
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold leading-8 tracking-tight text-brand">
          Welcome Back
        </h1>
        <p className="text-base leading-6 text-muted">
          Sign in to your account or create a new one
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-10">
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
              onClick={() => setTab(t)}
              className={cn(
                "relative h-8 rounded-button px-3 text-sm font-medium transition-colors",
                tab === t ? "text-brand" : "text-muted hover:text-brand",
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="authTabPill"
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

        <div className="flex flex-col gap-6">
          {/* Social providers */}
          <div className="flex flex-col gap-3">
            <button type="button" className={socialButton}>
              <GoogleIcon />
              Continue with Google
            </button>
            <button type="button" className={socialButton}>
              <FacebookIcon />
              Continue with Facebook
            </button>
            <button type="button" className={socialButton}>
              <AppleIcon />
              Continue with Apple
            </button>
          </div>

          <Divider label="Or continue with email" />

          {/* Email + password form */}
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="mode" value={tab} />
            {tab === "signup" && (
              <Field id="name" label="Full Name">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ama Mensah"
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
                  className={cn(fieldInput, "pr-11")}
                />
                <PasswordToggle
                  shown={showPassword}
                  onToggle={() => setShowPassword((s) => !s)}
                />
              </div>
            </Field>

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
                      className={fieldInput}
                    />
                  </div>
                </Field>
              </>
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

            <button
              type="submit"
              disabled={pending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-button bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {tab === "signin" ? "Sign In" : "Create Account"}
            </button>
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

function Field({
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

function PasswordToggle({
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

function Divider({ label }: { label: string }) {
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
function GoogleIcon() {
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

function FacebookIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path
        fill="#1877f2"
        d="M16 8a8 8 0 1 0-9.25 7.9v-5.59H4.72V8h2.03V6.24c0-2 1.2-3.11 3.02-3.11.87 0 1.79.16 1.79.16v1.97h-1.01c-.99 0-1.3.62-1.3 1.25V8h2.22l-.36 2.31H9.25v5.59A8 8 0 0 0 16 8Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path
        fill="#3d3428"
        d="M10.84 8.5c-.02-1.5 1.22-2.22 1.28-2.26-.7-1.02-1.78-1.16-2.17-1.18-.92-.09-1.8.54-2.27.54-.47 0-1.19-.53-1.96-.51-1 .01-1.94.59-2.46 1.49-1.05 1.82-.27 4.51.76 5.99.5.72 1.1 1.53 1.88 1.5.76-.03 1.04-.49 1.96-.49.91 0 1.17.49 1.96.47.81-.01 1.32-.73 1.82-1.46.57-.84.81-1.65.82-1.69-.02-.01-1.57-.6-1.59-2.39ZM9.36 4.07c.41-.5.69-1.2.61-1.9-.59.03-1.31.4-1.74.89-.38.44-.72 1.15-.63 1.83.66.05 1.34-.33 1.76-.82Z"
      />
    </svg>
  );
}
