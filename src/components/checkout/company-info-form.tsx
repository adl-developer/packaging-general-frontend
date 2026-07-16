"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { saveContactInfo } from "@/lib/actions/checkout";
import {
  isValidEmail,
  normalizeGhanaPhone,
  EMAIL_ERROR,
  PHONE_ERROR,
  GH_PHONE_PATTERN,
} from "@/lib/validation";

/**
 * Checkout — Company Information step (Figma frame 424:2868, step 1 of the
 * flow: Cart → Company Info → Delivery → Payment). Persists the company
 * name + contact person into cart.metadata and the email onto cart.email.
 * `initial` prefills from the cart / the signed-in customer's profile
 * (see getCheckoutPrefill).
 */
const labelCls = "text-sm font-medium leading-none text-brand";
const inputCls =
  "h-9 w-full rounded-button border-2 border-input bg-surface px-3 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none";

export interface CompanyInfoInitial {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
}

export function CompanyInfoForm({ initial }: { initial?: CompanyInfoInitial }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const payload = {
      companyName: String(data.get("companyName") ?? "").trim(),
      contactPerson: String(data.get("contactPerson") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
    };
    if (!payload.companyName || !payload.contactPerson || !payload.phone || !payload.email) {
      setError("Please fill in every field before continuing.");
      return;
    }
    const phone = normalizeGhanaPhone(payload.phone);
    if (!phone) {
      setError(PHONE_ERROR);
      return;
    }
    if (!isValidEmail(payload.email)) {
      setError(EMAIL_ERROR);
      return;
    }
    startTransition(async () => {
      const result = await saveContactInfo({ ...payload, phone });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/checkout/delivery");
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/cart"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand/70"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to Cart
      </Link>

      <motion.form
        initial={{ y: 12 }}
        animate={{ y: 0 }}
        transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
        onSubmit={onSubmit}
        className="mx-auto flex max-w-2xl flex-col gap-6 rounded-card border border-line bg-surface p-6"
      >
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-medium text-brand">
              Company Information
            </h1>
            <p className="text-base text-muted">
              Please provide your company details for this order
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Field id="company-name" label="Company Name *">
            <input id="company-name" name="companyName" type="text" autoComplete="organization" placeholder="ABC Co." defaultValue={initial?.companyName} className={inputCls} required />
          </Field>
          <Field id="contact-person" label="Contact Person Name *">
            <input id="contact-person" name="contactPerson" type="text" autoComplete="name" placeholder="Emmanuel Ntim" defaultValue={initial?.contactPerson} className={inputCls} required />
          </Field>
          <Field id="company-phone" label="Phone Number *">
            <input id="company-phone" name="phone" type="tel" autoComplete="tel" placeholder="+233 24 123 4567" pattern={GH_PHONE_PATTERN} title={PHONE_ERROR} defaultValue={initial?.phone} className={inputCls} required />
          </Field>
          <Field id="company-email" label="Email Address *">
            <input id="company-email" name="email" type="email" autoComplete="email" placeholder="entim@gmail.com" defaultValue={initial?.email} className={inputCls} required />
          </Field>
        </div>

        {error && (
          <p role="alert" className="rounded-button bg-[rgba(231,0,11,0.08)] px-3 py-2 text-sm font-medium text-[#7e2a0c]">
            {error}
          </p>
        )}

        <div className="rounded-option border border-line bg-[rgba(196,188,176,0.6)] px-3.5 py-3.5">
          <p className="text-sm font-medium text-brand">
            Save time on your next order
          </p>
          <p className="text-sm text-[rgba(61,52,40,0.8)]">
            Create an account to save your company details for faster checkout.{" "}
            <Link href="/sign-up" className="font-medium underline hover:text-brand">
              Create an account
            </Link>
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-button bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {isPending ? "Saving…" : "Continue to Delivery"}
        </button>
      </motion.form>
    </div>
  );
}

function Field({
  id,
  label: text,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelCls}>
        {text}
      </label>
      {children}
    </div>
  );
}
