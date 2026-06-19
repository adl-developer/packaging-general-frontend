"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Loader2, MapPin, Navigation } from "lucide-react";
import { motion } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { saveDeliveryAddress } from "@/lib/actions/checkout";

/**
 * Checkout — Delivery step (Figma frame 424:2869). Persists the shipping +
 * billing address to the cart and auto-selects the first available shipping
 * option (currently Yango Scheduled). The map preview is a placeholder until
 * we wire Google Maps Places; `Use My Current Location` already uses the
 * browser's geolocation API to capture real lat/lng for Yango.
 *
 * Yango Delivery requires lat/lng on every claim — there is no geocoder on
 * Yango's side. We persist coords onto `cart.shipping_address.metadata` so
 * the backend's Yango provider can read them in `calculatePrice` and
 * `createFulfillment`. Without coords Yango won't quote, and the customer
 * sees a fallback price of 0 (admin gets the heads-up).
 */
const labelCls = "text-sm font-medium leading-none text-brand";
const inputCls =
  "h-9 w-full rounded-button border-2 border-input bg-surface px-3 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none";

export interface DeliveryInitial {
  contactName: string;
  phone: string;
  email: string;
  address: string;
  instructions: string;
  lat?: number | null;
  lng?: number | null;
}

interface Coords {
  lat: number;
  lng: number;
}

export function DeliveryForm({ initial }: { initial?: DeliveryInitial }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [coords, setCoords] = React.useState<Coords | null>(
    initial?.lat != null && initial?.lng != null
      ? { lat: initial.lat, lng: initial.lng }
      : null
  );
  const [coordSource, setCoordSource] = React.useState<"geolocation" | "manual" | null>(
    coords ? "manual" : null
  );
  const [geoState, setGeoState] = React.useState<"idle" | "loading" | "error">("idle");
  const [manualOpen, setManualOpen] = React.useState(false);

  function locateMe() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoState("error");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCoordSource("geolocation");
        setGeoState("idle");
      },
      () => setGeoState("error"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const payload = {
      contactName: String(data.get("contactName") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
      instructions: String(data.get("instructions") ?? "").trim(),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    };
    if (!payload.contactName || !payload.phone || !payload.email || !payload.address) {
      setError("Please fill in your contact name, phone, email and delivery address.");
      return;
    }
    if (payload.lat == null || payload.lng == null) {
      setError(
        "Please share your delivery location — tap Use My Current Location or enter coordinates manually."
      );
      return;
    }
    startTransition(async () => {
      const result = await saveDeliveryAddress(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/checkout/payment");
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
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-medium text-brand">
            Delivery Information
          </h1>
          <p className="text-base text-muted">
            Where should we deliver your order?
          </p>
        </div>

        <div
          className="flex items-start gap-3 rounded-option border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm text-brand"
          role="status"
        >
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-plum" aria-hidden />
          <p className="leading-snug">
            <span className="font-medium">Arrives in 2–3 business days.</span>{" "}
            <span className="text-muted">
              We schedule pickup with Yango Delivery the next business morning;
              you can track the courier from your order page.
            </span>
          </p>
        </div>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-medium leading-7 text-brand">
            Contact Details
          </legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="contact-name" label="Contact Name *">
              <input id="contact-name" name="contactName" type="text" autoComplete="name" placeholder="Emmanuel Ntim" defaultValue={initial?.contactName} className={inputCls} required />
            </Field>
            <Field id="contact-phone" label="Phone Number *">
              <input id="contact-phone" name="phone" type="tel" autoComplete="tel" placeholder="+233 123 456 890" defaultValue={initial?.phone} className={inputCls} required />
            </Field>
          </div>

          <Field id="contact-email" label="Email Address *">
            <input id="contact-email" name="email" type="email" autoComplete="email" placeholder="entim@gmail.com" defaultValue={initial?.email} className={inputCls} required />
          </Field>
        </fieldset>

        <div className="h-px w-full bg-line" aria-hidden />

        <div className="flex flex-col gap-4">
          <Field id="address" label="Delivery Address *">
            <input
              id="address"
              name="address"
              type="text"
              autoComplete="street-address"
              placeholder="Enter your street address, area, or landmark"
              defaultValue={initial?.address}
              className={inputCls}
              required
            />
          </Field>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="text-sm text-muted">or</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
          </div>

          <button
            type="button"
            onClick={locateMe}
            disabled={geoState === "loading"}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-button border border-line bg-background text-sm font-medium text-brand transition-colors hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {geoState === "loading" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Navigation className="size-4" aria-hidden />
            )}
            {geoState === "loading" ? "Finding your location…" : "Use My Current Location"}
          </button>
          {geoState === "error" && (
            <p className="text-xs text-[#7e2a0c]">
              Couldn&apos;t access your location. Enter coordinates manually below.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <span className={labelCls}>Location Coordinates *</span>
            <div className="overflow-hidden rounded-option border border-line">
              <div className="grid h-48 place-items-center bg-gradient-to-br from-accent/20 via-mist to-plum/10">
                <div className="flex flex-col items-center gap-1 text-center">
                  <MapPin
                    className={coords ? "size-7 text-plum" : "size-7 text-muted"}
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-brand">
                    {coords ? "Delivery Location" : "No location set yet"}
                  </p>
                  <p className="text-xs text-muted">
                    {coords
                      ? `Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}${
                          coordSource === "geolocation" ? " · from your device" : ""
                        }`
                      : "Use My Current Location, or enter coordinates manually."}
                  </p>
                </div>
              </div>
              <div className="border-t border-line bg-[#f9fafb] px-4 py-4">
                <button
                  type="button"
                  onClick={() => setManualOpen((v) => !v)}
                  className="mx-auto block rounded-button text-xs font-medium text-brand transition-colors hover:text-brand/70"
                >
                  {manualOpen ? "Hide manual entry" : "Enter coordinates manually"}
                </button>
              </div>
            </div>
          </div>

          {manualOpen && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="lat" label="Latitude">
                <input
                  id="lat"
                  type="number"
                  inputMode="decimal"
                  step="0.000001"
                  placeholder="5.603700"
                  defaultValue={coords?.lat ?? ""}
                  onChange={(e) => {
                    const lat = Number(e.target.value);
                    if (!Number.isFinite(lat)) return;
                    setCoords((prev) => ({ lat, lng: prev?.lng ?? 0 }));
                    setCoordSource("manual");
                  }}
                  className={inputCls}
                />
              </Field>
              <Field id="lng" label="Longitude">
                <input
                  id="lng"
                  type="number"
                  inputMode="decimal"
                  step="0.000001"
                  placeholder="-0.187000"
                  defaultValue={coords?.lng ?? ""}
                  onChange={(e) => {
                    const lng = Number(e.target.value);
                    if (!Number.isFinite(lng)) return;
                    setCoords((prev) => ({ lat: prev?.lat ?? 0, lng }));
                    setCoordSource("manual");
                  }}
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          <Field id="instructions" label="Delivery Instructions / Landmarks">
            <textarea
              id="instructions"
              name="instructions"
              rows={2}
              placeholder="e.g., Behind Shell Fuel Station, ask for Mr. Mensah"
              defaultValue={initial?.instructions}
              className="w-full resize-none rounded-button border-2 border-input bg-surface px-3 py-2 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none"
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="rounded-button bg-[rgba(231,0,11,0.08)] px-3 py-2 text-sm font-medium text-[#7e2a0c]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-button bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {isPending ? "Saving…" : "Continue to Payment"}
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
