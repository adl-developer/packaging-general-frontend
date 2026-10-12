"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { saveAccountPhone, type AddPhoneState } from "@/lib/actions/account-phone";
import { Field, fieldInput } from "@/components/auth/auth-form-fields";
import { GH_PHONE_PATTERN, PHONE_ERROR } from "@/lib/validation";

/**
 * "Add your phone number" — shown after a Google sign-in when the account has
 * no phone (client, 2026-10-12). One required field; there is no skip.
 * Same look as the sign-in card and the same +233 field as email sign-up.
 */
export function AddPhoneCard({ next, firstName }: { next: string; firstName: string | null }) {
  const [state, action, pending] = useActionState<AddPhoneState, FormData>(
    saveAccountPhone,
    { error: null },
  );

  return (
    <div className="mx-auto flex w-full max-w-[448px] flex-col gap-8 px-4 pt-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold leading-8 text-brand">
          {firstName ? `Welcome, ${firstName}` : "One more step"}
        </h1>
        <p className="text-base leading-6 text-muted">
          Add your phone number so we can reach you about your orders and
          deliveries.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-6">
        <input type="hidden" name="next" value={next} />
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
              required
              autoFocus
              className={fieldInput}
            />
          </div>
        </Field>

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
          Continue
        </button>
      </form>
    </div>
  );
}
