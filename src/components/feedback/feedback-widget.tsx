"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { m, AnimatePresence } from "motion/react";
import * as Sentry from "@sentry/nextjs";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { getFeedbackPrefill, sendFeedback } from "@/lib/actions/feedback";
import {
  CONTACT_LIMITS,
  mergeContactPrefill,
  normalizeFeedbackContact,
} from "@/lib/feedback-contact";
import {
  captureBrowserContext,
  installErrorRecorder,
  recordVisit,
} from "@/lib/feedback-context";

/**
 * Floating feedback button (user request, 2026-09-22).
 *
 * A "Send Feedback" text pill (2026-09-28: was a round icon-only button; the
 * user wanted it obvious what it is) fixed bottom-LEFT — the cart toast owns bottom-right on
 * desktop and bottom-centre on mobile, so this corner is the one that never
 * collides with it. Click → small card with optional Title, required Message
 * (2026-09-29: only the message is required), optional Name / Phone / Email
 * (2026-09-28, prefilled for a signed-in customer on every open), Submit. On
 * success a "Feedback sent" state shows for `SENT_MS`, then the card dismisses
 * back to the round button. Escape and clicking the backdrop close it.
 *
 * On mount it starts the error recorder and logs the current route to the
 * navigation trail, so every submit carries the last 20 errors and the pages
 * that led here. The server action adds cart, customer and request facts.
 */
const SENT_MS = 2200;
const TITLE_MAX = 120;
const MESSAGE_MAX = 5000;

type Phase = "closed" | "open" | "sending" | "sent";

export function FeedbackWidget() {
  const pathname = usePathname();
  const [phase, setPhase] = React.useState<Phase>("closed");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [contact, setContact] = React.useState({ name: "", phone: "", email: "" });
  const [error, setError] = React.useState<string | null>(null);
  const lastPrefill = React.useRef({ name: "", phone: "", email: "" });
  const titleRef = React.useRef<HTMLInputElement>(null);
  const sentTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    installErrorRecorder();
  }, []);

  React.useEffect(() => {
    if (pathname) recordVisit(pathname);
  }, [pathname]);

  React.useEffect(() => {
    if (phase === "open") titleRef.current?.focus();
  }, [phase]);

  React.useEffect(
    () => () => {
      if (sentTimer.current) window.clearTimeout(sentTimer.current);
    },
    [],
  );

  const open = () => {
    setError(null);
    setPhase("open");
    // Every open: fill the contact fields from the signed-in account, so a
    // sign-in (or sign-out) since the last open is picked up. Only fields the
    // reporter hasn't touched change (`mergeContactPrefill`).
    getFeedbackPrefill()
      .then((p) => {
        const previous = lastPrefill.current;
        lastPrefill.current = p;
        setContact((c) => mergeContactPrefill(c, previous, p));
      })
      .catch(() => {});
  };

  const setField =
    (key: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setContact((c) => ({ ...c, [key]: e.target.value }));

  const close = () => {
    setPhase("closed");
    setError(null);
  };

  React.useEffect(() => {
    if (phase !== "open" && phase !== "sending") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "open") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase !== "open") return;
    const t = title.trim();
    const msg = message.trim();
    if (!msg) {
      setError("Please add a message.");
      return;
    }
    const checked = normalizeFeedbackContact(contact);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setError(null);
    setPhase("sending");

    const context = captureBrowserContext({
      sentryEventId: safeLastEventId(),
      buildEnv: process.env.NEXT_PUBLIC_VERCEL_ENV ?? null,
      buildCommit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null,
    });

    const result = await sendFeedback({
      title: t,
      message: msg,
      context,
      contact: checked.contact,
    });
    if (!result.ok) {
      setError(result.error);
      setPhase("open");
      return;
    }

    // Contact details stay: a second report shouldn't mean retyping them.
    setTitle("");
    setMessage("");
    setPhase("sent");
    sentTimer.current = window.setTimeout(() => setPhase("closed"), SENT_MS);
  };

  const showCard = phase !== "closed";

  return (
    <>
      {/* Text pill trigger — hidden while the card is up so the two never stack. */}
      <AnimatePresence>
        {!showCard && (
          <m.button
            key="fab"
            type="button"
            onClick={open}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
            className="fixed bottom-6 left-6 z-40 flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-lg transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
          >
            Send Feedback
          </m.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCard && (
          <div
            key="feedback-layer"
            className="fixed inset-0 z-50 flex items-end justify-start"
          >
            {/* Backdrop: click to dismiss while editing. */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.base }}
              onClick={phase === "open" ? close : undefined}
              className="absolute inset-0 bg-dark/20"
              aria-hidden
            />
            <m.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="feedback-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
              className="relative m-4 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-card border border-line bg-surface p-5 shadow-xl sm:m-6"
            >
              {phase === "sent" ? (
                <div
                  role="status"
                  className="flex flex-col items-center gap-3 py-6 text-center"
                >
                  <CheckCircle2
                    className="size-10 fill-brand text-surface"
                    aria-hidden
                  />
                  <p className="text-base font-semibold text-brand">
                    Feedback sent
                  </p>
                  <p className="text-sm text-muted">
                    Thank you. The team will take a look.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2
                        id="feedback-title"
                        className="text-base font-semibold text-brand"
                      >
                        Send feedback
                      </h2>
                      <p className="mt-0.5 text-xs text-muted">
                        Spotted a problem or have an idea? Tell us.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      disabled={phase === "sending"}
                      aria-label="Close"
                      className="-m-1 rounded-button p-1 text-muted transition-colors hover:bg-line/30 hover:text-brand disabled:opacity-50"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="feedback-subject">
                      Title{" "}
                      <span className="font-normal text-muted">(optional)</span>
                    </Label>
                    <Input
                      ref={titleRef}
                      id="feedback-subject"
                      name="title"
                      value={title}
                      maxLength={TITLE_MAX}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What's this about?"
                      disabled={phase === "sending"}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="feedback-message">Message</Label>
                    <textarea
                      id="feedback-message"
                      name="message"
                      rows={4}
                      value={message}
                      maxLength={MESSAGE_MAX}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="What happened, and what did you expect?"
                      disabled={phase === "sending"}
                      required
                      className="w-full resize-none rounded-button border-2 border-input bg-surface px-3 py-2 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none disabled:opacity-50"
                    />
                  </div>

                  <fieldset className="flex flex-col gap-3" disabled={phase === "sending"}>
                    <legend className="mb-3 text-xs font-semibold text-brand">
                      Your details{" "}
                      <span className="font-normal text-muted">
                        (optional, so we can follow up)
                      </span>
                    </legend>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="feedback-name">Name</Label>
                      <Input
                        id="feedback-name"
                        name="name"
                        autoComplete="name"
                        value={contact.name}
                        maxLength={CONTACT_LIMITS.name}
                        onChange={setField("name")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="feedback-phone">Phone number</Label>
                      <Input
                        id="feedback-phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="024 123 4567"
                        value={contact.phone}
                        maxLength={CONTACT_LIMITS.phone}
                        onChange={setField("phone")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="feedback-email">Email address</Label>
                      <Input
                        id="feedback-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={contact.email}
                        maxLength={CONTACT_LIMITS.email}
                        onChange={setField("email")}
                      />
                    </div>
                  </fieldset>

                  {error && <FieldError>{error}</FieldError>}

                  <p className="text-[11px] leading-4 text-muted">
                    We attach the page you&apos;re on, your cart and recent
                    errors so we can fix things faster.
                  </p>

                  <Button
                    type="submit"
                    fullWidth
                    disabled={phase === "sending"}
                  >
                    {phase === "sending" ? "Sending…" : "Submit"}
                  </Button>
                </form>
              )}
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function safeLastEventId(): string | null {
  try {
    return Sentry.lastEventId() ?? null;
  } catch {
    return null;
  }
}
