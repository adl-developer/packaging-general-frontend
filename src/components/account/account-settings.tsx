"use client";

import * as React from "react";
import { Loader2, Mail, TriangleAlert } from "lucide-react";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  changeAccountEmail,
  deleteAccount,
  type AccountSettingsState,
} from "@/lib/actions/auth";

const IDLE: AccountSettingsState = { ok: false, error: null };

/**
 * Account settings: change the login email (requires current password;
 * security notices go to both addresses) and permanently delete the account
 * (password + explicit confirmation; the backend kills the login and revokes
 * the session, then the action clears cookies and redirects home).
 */
export function AccountSettings({ email }: { email: string }) {
  const [emailState, emailAction, emailPending] = React.useActionState(
    changeAccountEmail,
    IDLE
  );
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
          Changing it updates the email you sign in with — we&apos;ll send a
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
