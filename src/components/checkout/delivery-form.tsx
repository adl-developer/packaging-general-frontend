"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Loader2, Navigation } from "lucide-react";
import { motion } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { saveDeliveryAddress } from "@/lib/actions/checkout";
import { DeliveryMap, type MapCoordSource } from "./delivery-map";

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
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [manualOpen, setManualOpen] = React.useState(false);

  function locateMe() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoState("error");
      setGeoError(
        "Your browser doesn't support location lookup. Search for your address on the map below or enter coordinates manually."
      );
      return;
    }
    if (!window.isSecureContext) {
      setGeoState("error");
      setGeoError(
        "Location only works on a secure connection. Search for your address on the map below or enter coordinates manually."
      );
      return;
    }
    setGeoState("loading");
    setGeoError(null);

    const onSuccess = (pos: GeolocationPosition) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setCoordSource("geolocation");
      setGeoState("idle");
      setGeoError(null);
    };

    // Staged lookup. High-accuracy (GPS) is great on phones but routinely
    // hangs on desktops with no GPS and times out. So we try precise first
    // with a short budget, then fall back to fast network/Wi-Fi location with
    // a longer budget. The map lets them refine either way, so coarse coords
    // are a fine starting point. Permission denials don't retry — they'd just
    // fail again.
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (firstErr) => {
        if (firstErr.code === firstErr.PERMISSION_DENIED) {
          setGeoState("error");
          setGeoError(geoErrorMessage(firstErr));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (secondErr) => {
            setGeoState("error");
            setGeoError(geoErrorMessage(secondErr));
          },
          { enableHighAccuracy: false, timeout: 20_000, maximumAge: 300_000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 }
    );
  }

  const handleMapChange = React.useCallback(
    (lat: number, lng: number, source: MapCoordSource) => {
      setCoords({ lat, lng });
      // Treat geolocation/autocomplete/click/drag as "manual" in our metadata
      // (the form already knows the precise source from the map; the
      // coordSource state is only used for the UI hint string).
      setCoordSource(source === "geolocation" ? "geolocation" : "manual");
      setGeoError(null);
    },
    []
  );

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
          {geoState === "error" && geoError && (
            <p
              role="alert"
              className="rounded-button bg-[rgba(231,0,11,0.06)] px-3 py-2 text-xs text-[#7e2a0c]"
            >
              {geoError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <span className={labelCls}>
              Delivery Location *{" "}
              <span className="font-normal text-muted">
                {coords
                  ? coordSource === "geolocation"
                    ? "— from your device"
                    : "— set on map"
                  : "— search, tap the map, or use your current location"}
              </span>
            </span>
            <DeliveryMap
              coords={coords}
              onCoordsChange={handleMapChange}
              initialAddress={initial?.address}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setManualOpen((v) => !v)}
                className="rounded-button text-xs font-medium text-brand transition-colors hover:text-brand/70"
              >
                {manualOpen ? "Hide manual entry" : "Enter coordinates manually"}
              </button>
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

/** Turn a GeolocationPositionError into copy the customer can act on. */
function geoErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location access was blocked. Allow location in your browser settings, search for your address on the map, or enter coordinates manually.";
    case err.POSITION_UNAVAILABLE:
      return "We couldn't find your location. Search for your address on the map below or enter coordinates manually.";
    case err.TIMEOUT:
      return "We couldn't pin your location automatically. Search for your address on the map below — it's usually faster.";
    default:
      return "Couldn't access your location. Search for your address on the map below or enter coordinates manually.";
  }
}
