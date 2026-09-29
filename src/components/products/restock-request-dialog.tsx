"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { m, AnimatePresence } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { getFeedbackPrefill } from "@/lib/actions/feedback";
import { requestRestock } from "@/lib/actions/restock";
import {
  RESTOCK_LIMITS,
  restockSummary,
  validateRestockContact,
  type RestockContact,
  type RestockItem,
} from "@/lib/restock";

/**
 * "Request restock" modal (2026-09-29): collects name, email and phone
 * (all required) and sends them with the item to PG's admins. Opened from
 * the product page when the quantity exceeds stock, and from the cart after
 * an add failed for stock. Signed-in customers get their details prefilled.
 */
export function RestockRequestDialog({
  item,
  onClose,
}: {
  item: RestockItem | null;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [contact, setContact] = React.useState<RestockContact>({ name: "", email: "", phone: "" });
  const [phase, setPhase] = React.useState<"open" | "sending" | "sent">("open");
  const [error, setError] = React.useState<string | null>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const open = item !== null;

  // Reset on close (not on open: no setState in the effect), so every
  // opening starts on the form.
  const close = React.useCallback(() => {
    setPhase("open");
    setError(null);
    onClose();
  }, [onClose]);

  // Prefill only fields the customer hasn't typed in.
  React.useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    let live = true;
    getFeedbackPrefill()
      .then((p) => {
        if (!live) return;
        setContact((c) => ({
          name: c.name || p.name,
          email: c.email || p.email,
          phone: c.phone || p.phone,
        }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "sending") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, close]);

  const setField =
    (key: keyof RestockContact) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setContact((c) => ({ ...c, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || phase !== "open") return;
    const checked = validateRestockContact(contact);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setError(null);
    setPhase("sending");
    const result = await requestRestock({
      variantId: item.variantId,
      quantity: item.quantity,
      contact: checked.contact,
      path: pathname ?? undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setPhase("open");
      return;
    }
    setPhase("sent");
  };

  return (
    <AnimatePresence>
      {item && (
        <div key="restock-layer" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base }}
            onClick={phase === "sending" ? undefined : close}
            className="absolute inset-0 bg-dark/30"
            aria-hidden
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="restock-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-card border border-line bg-surface p-5 shadow-xl sm:p-6"
          >
            {phase === "sent" ? (
              <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="size-10 fill-brand text-surface" aria-hidden />
                <p id="restock-title" className="text-base font-semibold text-brand">
                  Request sent
                </p>
                <p className="text-sm text-muted">
                  Thank you. Our team will get back to you at{" "}
                  <span className="font-medium text-brand">{contact.email}</span> about{" "}
                  {restockSummary(item)}.
                </p>
                <Button type="button" onClick={close} className="mt-2">
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="restock-title" className="text-base font-semibold text-brand">
                      Request restock
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      You&apos;d like {restockSummary(item)}. Leave your details and
                      our team will get back to you about availability.
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

                <fieldset className="flex flex-col gap-3" disabled={phase === "sending"}>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="restock-name">Name *</Label>
                    <Input
                      ref={nameRef}
                      id="restock-name"
                      name="name"
                      autoComplete="name"
                      required
                      value={contact.name}
                      maxLength={RESTOCK_LIMITS.name}
                      onChange={setField("name")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="restock-email">Email address *</Label>
                    <Input
                      id="restock-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      required
                      value={contact.email}
                      maxLength={RESTOCK_LIMITS.email}
                      onChange={setField("email")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="restock-phone">Phone number *</Label>
                    <Input
                      id="restock-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="024 123 4567"
                      required
                      value={contact.phone}
                      maxLength={RESTOCK_LIMITS.phone}
                      onChange={setField("phone")}
                    />
                  </div>
                </fieldset>

                {error && <FieldError>{error}</FieldError>}

                <Button type="submit" fullWidth disabled={phase === "sending"}>
                  {phase === "sending" ? "Sending…" : "Send Request"}
                </Button>
              </form>
            )}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
