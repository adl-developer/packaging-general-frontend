"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  TriangleAlert,
} from "lucide-react";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  changeAccountEmail,
  changeAccountPassword,
  deleteAccount,
  sendAccountResetLink,
  type AccountSettingsState,
} from "@/lib/actions/auth";

const IDLE: AccountSettingsState = { ok: false, error: null };

/**
 * Account settings: change the login email (requires current password;
 * security notices go to both addresses), change the password (requires the
 * current one; every other device is signed out, this one stays in), and
 * permanently delete the account (password + explicit confirmation; the
 * backend kills the login and revokes the session, then the action clears
 * cookies and redirects home).
 */
export function AccountSettings({ email }: { email: string }) {
  const [emailState, emailAction, emailPending] = React.useActionState(
    changeAccountEmail,
    IDLE
  );
  const [passwordState, passwordAction, passwordPending] =
    React.useActionState(changeAccountPassword, IDLE);
  const [resetState, resetAction, resetPending] = React.useActionState(
    sendAccountResetLink,
    IDLE
  );
  const [showPassword, setShowPassword] = React.useState(false);
  const [deleteState, deleteAction, deletePending] = React.useActionState(
    deleteAccount,
    IDLE
  );
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Change email */}
      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-muted" aria-hidden />
          <h2 className="text-base font-semibold text-brand">Email address</h2>
        </div>
        <p className="text-sm text-muted">
          Signed in as <span className="font-medium text-brand">{email}</span>.
          Changing it updates the email you sign in with. We&apos;ll send a
          confirmation to both addresses.
        </p>
        {emailState.ok ? (
          <p className="rounded-option border border-line bg-background px-4 py-3 text-sm text-brand">
            Your email has been updated. Use the new address next time you sign
            in.
          </p>
        ) : (
          <form action={emailAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-new-email">New email address *</Label>
              <Input
                id="settings-new-email"
                name="new_email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-email-password">
                Current password *
              </Label>
              <Input
                id="settings-email-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {emailState.error ? <FieldError>{emailState.error}</FieldError> : null}
            <Button type="submit" disabled={emailPending} className="w-fit">
              {emailPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Updating…
                </>
              ) : (
                "Update Email"
              )}
            </Button>
          </form>
        )}
      </section>

      {/* Change password */}
      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted" aria-hidden />
          <h2 className="text-base font-semibold text-brand">Password</h2>
        </div>
        <p className="text-sm text-muted">
          Choose a new password for signing in. For your security, any other
          devices signed in to this account will be signed out, but you&apos;ll
          stay signed in here.
        </p>
        {passwordState.ok ? (
          <p className="rounded-option border border-line bg-background px-4 py-3 text-sm text-brand">
            Your password has been updated. Other devices have been signed out
            and a confirmation email is on its way.
          </p>
        ) : (
          <form action={passwordAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-current-password">
                Current password *
              </Label>
              <Input
                id="settings-current-password"
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-new-password">New password *</Label>
              <div className="relative">
                <Input
                  id="settings-new-password"
                  name="new_password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="settings-new-password-hint"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-button text-brand transition-colors hover:bg-line/30"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              <p
                id="settings-new-password-hint"
                className="text-xs text-muted"
              >
                At least 8 characters.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-confirm-password">
                Confirm new password *
              </Label>
              <Input
                id="settings-confirm-password"
                name="confirm"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {passwordState.error ? (
              <FieldError>{passwordState.error}</FieldError>
            ) : null}
            <Button type="submit" disabled={passwordPending} className="w-fit">
              {passwordPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Updating…
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        )}

        {/* Forgotten the current password: the standard reset email, sent to
            the signed-in account's own address. */}
        <div className="border-t border-line pt-4 text-sm text-muted">
          {resetState.ok ? (
            <p role="status">
              If an account exists for{" "}
              <span className="font-medium text-brand">{email}</span>, a reset
              link is on its way. It expires in 15 minutes.
            </p>
          ) : (
            <form action={resetAction} className="flex flex-wrap items-center gap-x-1 gap-y-2">
              <span>Forgotten your current password?</span>
              <button
                type="submit"
                disabled={resetPending}
                className="inline-flex items-center gap-1 font-medium text-brand underline-offset-4 transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : null}
                Email me a reset link
              </button>
              {resetState.error ? (
                <FieldError className="basis-full">{resetState.error}</FieldError>
              ) : null}
            </form>
          )}
        </div>
      </section>

      {/* Delete account */}
      <section className="flex flex-col gap-4 rounded-card border border-rust/40 bg-surface p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-rust" aria-hidden />
          <h2 className="text-base font-semibold text-brand">Delete account</h2>
        </div>
        <p className="text-sm text-muted">
          Permanently deletes your account and signs you out everywhere. Your
          past orders remain trackable by order number and email. This cannot
          be undone.
        </p>
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex h-10 w-fit items-center rounded-button border border-rust px-4 text-sm font-medium text-rust transition-colors hover:bg-rust/10"
          >
            Delete my account…
          </button>
        ) : (
          <form action={deleteAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-delete-password">
                Enter your password to confirm *
              </Label>
              <Input
                id="settings-delete-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {deleteState.error ? (
              <FieldError>{deleteState.error}</FieldError>
            ) : null}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={deletePending}
                className="inline-flex h-10 items-center gap-2 rounded-button bg-plum px-4 text-sm font-semibold text-white transition-colors hover:bg-plum/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletePending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Permanently Delete Account
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-sm font-medium text-muted transition-colors hover:text-brand"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
