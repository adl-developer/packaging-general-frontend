"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, ExternalLink, Loader2, MapPin, Phone } from "lucide-react";
import { savePickup } from "@/lib/actions/checkout";
import type { PickupLocation } from "@/lib/pickup";
import { addressLine } from "@/lib/fulfillment";
import {
  GH_PHONE_PATTERN,
  normalizeGhanaPhone,
  PHONE_ERROR,
} from "@/lib/validation";

/**
 * Checkout — the "Pick up from our warehouse" card body (customer
 * self-pickup, 2026-09-22). Shows WHERE to collect (Business Location from
 * the admin portal: address, map link, the number to call, opening hours,
 * instructions) and asks only WHO will collect — the contact step already
 * holds the company, contact person and email, and prefills both fields.
 *
 * Saving attaches the free pickup option; the backend writes the collector
 * at the pickup point as the cart's address, so the payment page and
 * Paystack need nothing new.
 */
const labelCls = "text-sm font-medium leading-none text-brand";
const inputCls =
  "h-9 w-full rounded-button border-2 border-input bg-surface px-3 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none";

export interface PickupInitial {
  collectorName: string;
  phone: string;
  email: string;
}

export function PickupForm({
  location,
  hoursLines,
  initial,
}: {
  location: PickupLocation;
  /** "Mon - Fri: 8:00 AM - 6:00 PM (GMT)" lines; null when hours aren't set. */
  hoursLines: string[] | null;
  initial: PickupInitial;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState(initial.collectorName);
  const [phone, setPhone] = React.useState(initial.phone);

  React.useEffect(() => {
    router.prefetch("/checkout/payment");
  }, [router]);

  const canContinue = name.trim().length > 0 && phone.trim().length > 0;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Please tell us who will collect the order.");
      return;
    }
    if (!normalizeGhanaPhone(phone)) {
      setError(PHONE_ERROR);
      return;
    }
    startTransition(async () => {
      const result = await savePickup({
        collectorName: name,
        phone,
        email: initial.email,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/checkout/payment");
    });
  }

  const telHref = location.phone
    ? `tel:${location.phone.replace(/[^0-9+]/g, "")}`
    : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-option border border-line bg-[rgba(196,188,176,0.15)] p-4 text-sm leading-5 text-brand">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-plum" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="font-medium">
              {location.display ?? addressLine(location.address, location.city)}
            </p>
            <a
              href={location.maps_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1 text-plum underline underline-offset-2 hover:text-plum/80"
            >
              Open in Google Maps
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
        {location.phone && telHref && (
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 size-4 shrink-0 text-plum" aria-hidden />
            <p>
              <span className="text-muted">Call before you come: </span>
              <a href={telHref} className="font-medium underline underline-offset-2">
                {location.phone}
              </a>
            </p>
          </div>
        )}
        {hoursLines && hoursLines.length > 0 && (
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-plum" aria-hidden />
            <div className="flex flex-col">
              {hoursLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </div>
        )}
        {location.instructions && (
          <p className="text-muted">{location.instructions}</p>
        )}
        <p className="text-muted">
          We&apos;ll text and email you when your order is ready to collect.
          Pickup is free.
        </p>
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-medium leading-7 text-brand">
          Who will collect it?
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="collector-name" className={labelCls}>
              Name *
            </label>
            <input
              id="collector-name"
              name="collectorName"
              type="text"
              autoComplete="name"
              placeholder="Emmanuel Ntim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="collector-phone" className={labelCls}>
              Phone Number *
            </label>
            <input
              id="collector-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+233 24 123 4567"
              pattern={GH_PHONE_PATTERN}
              title={PHONE_ERROR}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
              required
            />
          </div>
        </div>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded-button bg-[rgba(231,0,11,0.08)] px-3 py-2 text-sm font-medium text-[#7e2a0c]"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !canContinue}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-button bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {isPending ? "Saving…" : "Continue to Payment"}
      </button>
    </form>
  );
}
