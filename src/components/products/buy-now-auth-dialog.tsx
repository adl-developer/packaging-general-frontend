"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Loader2, MailCheck, X } from "lucide-react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { buyNowAuth } from "@/lib/actions/checkout";
import {
  requestVerificationEmail,
  type VerificationRequestState,
} from "@/lib/actions/auth";
import {
  INITIAL_BUY_NOW_AUTH_STATE,
  panelFor,
  type BuyNowItem,
  type ContinueRoute,
} from "@/lib/buy-now-auth";
import {
  AuthFormBody,
  AuthSocialRow,
  AuthTabs,
  socialButton,
  type AuthTab,
} from "@/components/auth/auth-form-fields";

/**
 * Buy Now for signed-out customers — see
 * docs/superpowers/specs/2026-08-06-buy-now-signed-out-design.md.
 *
 * The button stays visible to everyone; a guest who clicks it lands here
 * instead of being refused. Opens on the Create Account tab (that's the point
 * of the modal), but a returning customer can sign in and continue with no
 * email round-trip at all.
 *
 * The configured item rides along as hidden fields, so authenticating never
 * costs the customer their selection.
 */
const INITIAL_RESEND_STATE: VerificationRequestState = {
  sent: false,
  error: null,
};

export function BuyNowAuthDialog({
  item,
  onClose,
  onContinue,
}: {
  item: BuyNowItem;
  onClose: () => void;
  onContinue: (route: ContinueRoute, notice?: string) => void;
}) {
  const [tab, setTab] = React.useState<AuthTab>("signup");
  const [state, formAction, pending] = React.useActionState(
    buyNowAuth,
    INITIAL_BUY_NOW_AUTH_STATE,
  );
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // "continue" is a navigation, not a panel — hand the route back exactly once
  // (the effect can re-run on unrelated re-renders).
  const handedOff = React.useRef(false);
  React.useEffect(() => {
    if (state.status !== "continue" || handedOff.current) return;
    handedOff.current = true;
    onContinue(state.route, state.notice);
  }, [state, onContinue]);

  const panel = panelFor(state);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DURATION.fast }}
        onClick={onClose}
        className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-now-auth-title"
      >
        <motion.div
          ref={panelRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[90vh] w-full max-w-md flex-col gap-6 overflow-y-auto rounded-option border border-line bg-background p-6 focus-visible:outline-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2
                id="buy-now-auth-title"
                className="text-xl font-semibold leading-7 text-brand"
              >
                {panel === "verify"
                  ? "One more step"
                  : "Create an account to Buy Now"}
              </h2>
              <p className="text-sm leading-5 text-muted">
                {panel === "verify"
                  ? "Verify your email address to continue."
                  : "Your selection is saved — sign in or create an account and we'll take you straight to checkout."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-button text-muted transition-colors hover:bg-line/30 hover:text-brand"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {panel === "verify" ? (
            <VerifyPanel
              email={
                state.status === "unverified" ||
                state.status === "pending-verification"
                  ? state.email
                  : ""
              }
              justSent={state.status === "pending-verification"}
              itemSaved={
                state.status === "pending-verification" ? state.itemSaved : true
              }
              onClose={onClose}
            />
          ) : (
            <div className="flex flex-col gap-6">
              <AuthTabs
                tab={tab}
                onTabChange={setTab}
                layoutId="buyNowAuthTabPill"
              />
              <AuthSocialRow />
              <form action={formAction} className="flex flex-col gap-4">
                <AuthFormBody
                  tab={tab}
                  error={state.status === "error" ? state.error : null}
                  pending={pending}
                  submitLabel={
                    tab === "signin" ? "Sign In & Continue" : "Create Account"
                  }
                  extraFields={
                    <>
                      <input
                        type="hidden"
                        name="variantId"
                        value={item.variantId}
                      />
                      <input
                        type="hidden"
                        name="quantity"
                        value={String(item.quantity)}
                      />
                      <input
                        type="hidden"
                        name="setupPrintingValue"
                        value={item.setupPrintingValue ?? ""}
                      />
                      <input type="hidden" name="notes" value={item.notes ?? ""} />
                    </>
                  }
                />
              </form>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Both verification pauses land here.
 *
 * `justSent` = fresh signup: the backend already emailed the link and the item
 * is parked in the guest cart, which transfers to the account on the verify
 * auto-login. Otherwise it's a sign-in against an existing unverified account,
 * where nothing was added and no link has been sent yet.
 */
function VerifyPanel({
  email,
  justSent,
  itemSaved,
  onClose,
}: {
  email: string;
  justSent: boolean;
  itemSaved: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = React.useActionState(
    requestVerificationEmail,
    INITIAL_RESEND_STATE,
  );
  const sent = state.sent || justSent;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-rust/10">
          <MailCheck className="size-7 text-rust" aria-hidden />
        </span>
        <p className="text-base leading-6 text-muted">
          {justSent
            ? "Your account has been created."
            : "This account hasn't verified its email address yet."}
        </p>
      </div>

      {sent && (
        <p
          role="status"
          className="flex items-start gap-3 rounded-button border border-[#bbe5c8] bg-[#dcfce7] px-4 py-3 text-sm leading-5 text-[#166534]"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            A verification link has been sent to <strong>{email}</strong>. Click
            it to activate your account
            {justSent && itemSaved
              ? " — your item is saved in your cart and you'll be taken straight to checkout."
              : "."}
          </span>
        </p>
      )}

      {justSent && !itemSaved && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-button border border-rust/30 bg-rust/10 px-3 py-2 text-sm text-rust"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            We couldn&apos;t save this item to your cart. Please add it again
            after you&apos;ve verified your email.
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
            {sent ? "Resend Verification Email" : "Send Verification Email"}
          </button>
        </form>
        <button type="button" onClick={onClose} className={socialButton}>
          Keep Shopping
        </button>
      </div>
    </div>
  );
}
