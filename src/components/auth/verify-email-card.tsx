"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MailCheck,
} from "lucide-react";
import {
  confirmEmailVerification,
  requestVerificationEmail,
  type VerificationRequestState,
} from "@/lib/actions/auth";

/**
 * /verify-email landing page — the destination of the emailed link
 * (?token=…&email=…). Redeems the token once on mount, then shows success
 * (with a Sign In CTA) or failure (with a "send a new link" resend, since the
 * usual failure is an expired link).
 */
type Phase = "verifying" | "success" | "error";

const INITIAL_RESEND_STATE: VerificationRequestState = {
  sent: false,
  error: null,
};

export function VerifyEmailCard({
  token,
  email,
}: {
  token?: string;
  email?: string;
}) {
  const [phase, setPhase] = React.useState<Phase>("verifying");
  const [error, setError] = React.useState<string | null>(null);
  const fired = React.useRef(false);

  React.useEffect(() => {
    // Strict-mode double-mount guard — the confirm call must run exactly once
    // (it's idempotent server-side, but no point racing it against itself).
    if (fired.current) return;
    fired.current = true;
    confirmEmailVerification(email ?? "", token ?? "").then((result) => {
      if (result.ok) {
        setPhase("success");
      } else {
        setError(result.error);
        setPhase("error");
      }
    });
  }, [email, token]);

  return (
    <div className="mx-auto flex w-full max-w-[448px] flex-col gap-8 px-4 pt-8">
      {phase === "verifying" && (
        <div className="flex flex-col items-center gap-4 pt-8 text-center">
          <Loader2 className="size-8 animate-spin text-brand" aria-hidden />
          <p className="text-base text-muted">Verifying your email address…</p>
        </div>
      )}

      {phase === "success" && (
        <>
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[#dcfce7]">
              <CheckCircle2 className="size-8 text-[#16a34a]" aria-hidden />
            </span>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold leading-8 text-brand">
                Email verified!
              </h1>
              <p className="text-base leading-6 text-muted">
                Your account is now active
                {email ? (
                  <>
                    {" "}
                    for <strong className="text-brand">{email}</strong>
                  </>
                ) : null}
                . Any orders you placed with this email have been added to your
                account.
              </p>
            </div>
          </div>
          <Link
            href="/sign-in"
            className="flex h-11 w-full items-center justify-center rounded-button bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Sign In
          </Link>
        </>
      )}

      {phase === "error" && <VerifyFailed email={email} error={error} />}
    </div>
  );
}

function VerifyFailed({
  email,
  error,
}: {
  email?: string;
  error: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    requestVerificationEmail,
    INITIAL_RESEND_STATE,
  );

  return (
    <>
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-rust/10">
          <MailCheck className="size-8 text-rust" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-8 text-brand">
            Verification failed
          </h1>
          <p className="text-base leading-6 text-muted">
            {error ??
              "This verification link is invalid or has expired. Please request a new one."}
          </p>
        </div>
      </div>

      {state.sent && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-button border border-[#bbe5c8] bg-[#dcfce7] px-3 py-2 text-sm text-[#166534]"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            A new verification link has been sent
            {email ? (
              <>
                {" "}
                to <strong>{email}</strong>
              </>
            ) : null}
            . Check your email.
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

      {email ? (
        <form action={formAction}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-button bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Send a New Verification Link
          </button>
        </form>
      ) : (
        <Link
          href="/sign-in"
          className="flex h-11 w-full items-center justify-center rounded-button bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
        >
          Go to Sign In
        </Link>
      )}
    </>
  );
}
