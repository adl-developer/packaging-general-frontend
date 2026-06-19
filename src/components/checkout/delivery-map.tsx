"use client";

import * as React from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Loader2, MapPin, Search } from "lucide-react";

/**
 * Delivery map + Google Places autocomplete used at /checkout/delivery to
 * produce the lat/lng coordinates Yango Delivery requires.
 *
 * Performance contract (per Google's "Performance Best Practices"):
 *   • LAZY-MOUNT — we don't render the APIProvider (and don't pull the Maps JS
 *     bundle) until the map placeholder scrolls into view. The placeholder is
 *     a static gradient until then, so the page can hydrate with zero map
 *     bytes on the wire.
 *   • Official wrapper (`@vis.gl/react-google-maps`) — no raw `<script>`
 *     injection or `window.google` patching. The wrapper handles lifecycle so
 *     hot-reload and route changes don't leak Map instances.
 *   • Public APIs only — `LatLng.lat()` / `.lng()`, not internal properties.
 *
 * Wired to `delivery-form.tsx` via `onCoordsChange(lat, lng)`. Initial coords
 * (when revisiting the form) and the typed address come in via props; this
 * component never reads from or writes to the form fields directly.
 *
 * Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (restrict it to the storefront's
 * domain + Maps JavaScript / Places / Geocoding APIs).
 */

export interface DeliveryMapProps {
  /** Currently captured coords (controlled). */
  coords: { lat: number; lng: number } | null;
  /** Called when the user drags the marker, clicks the map, or picks an
   *  address from the autocomplete. */
  onCoordsChange: (lat: number, lng: number, source: MapCoordSource) => void;
  /** Optional address that, when set, syncs into the autocomplete input. */
  initialAddress?: string;
}

export type MapCoordSource =
  | "drag"
  | "click"
  | "autocomplete"
  | "geocode"
  | "geolocation";

/** Default centre: Accra (Independence Square). Used only when there's no
 *  initial coords AND geolocation hasn't been resolved. */
const ACCRA_FALLBACK = { lat: 5.5562, lng: -0.1969 };

export function DeliveryMap(props: DeliveryMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const placeholderRef = React.useRef<HTMLDivElement | null>(null);
  const [shouldMount, setShouldMount] = React.useState(false);

  // IntersectionObserver lazy-mount. We only pay the Maps JS cost once the
  // user scrolls the delivery-form past the address inputs. IO is universally
  // supported in our target browsers; if it ever isn't, the user just sees the
  // placeholder until they scroll back into view of the form (we never block
  // the form submit on the map mounting).
  React.useEffect(() => {
    const el = placeholderRef.current;
    if (!el || shouldMount) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldMount(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" } // start loading a viewport before it's visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldMount]);

  if (!apiKey) {
    return (
      <div className="overflow-hidden rounded-option border border-line bg-mist px-4 py-6 text-center text-sm text-muted">
        <MapPin className="mx-auto mb-2 size-5 text-plum" aria-hidden />
        Map preview unavailable.{" "}
        <span className="font-medium text-brand">
          Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        </span>{" "}
        to enable the map.
      </div>
    );
  }

  return (
    <div ref={placeholderRef}>
      {shouldMount ? (
        <APIProvider apiKey={apiKey} libraries={["places", "geocoding"]}>
          <MapShell {...props} />
        </APIProvider>
      ) : (
        <MapPlaceholder coords={props.coords} />
      )}
    </div>
  );
}

function MapPlaceholder({
  coords,
}: {
  coords: { lat: number; lng: number } | null;
}) {
  return (
    <div className="overflow-hidden rounded-option border border-line">
      <div className="grid h-48 place-items-center bg-gradient-to-br from-accent/20 via-mist to-plum/10">
        <div className="flex flex-col items-center gap-1 text-center">
          <MapPin
            className={coords ? "size-7 text-plum" : "size-7 text-muted"}
            aria-hidden
          />
          <p className="text-sm font-medium text-brand">
            {coords ? "Delivery location set" : "Loading map…"}
          </p>
          <p className="text-xs text-muted">
            {coords
              ? `Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}`
              : "Scroll down to load the interactive map."}
          </p>
        </div>
      </div>
    </div>
  );
}

function MapShell({ coords, onCoordsChange, initialAddress }: DeliveryMapProps) {
  const center = coords ?? ACCRA_FALLBACK;

  return (
    <div className="flex flex-col gap-3">
      <AddressAutocomplete
        defaultValue={initialAddress}
        onPick={(lat, lng) => onCoordsChange(lat, lng, "autocomplete")}
      />
      <div className="overflow-hidden rounded-option border border-line">
        <Map
          mapId="pg-delivery-map"
          style={{ width: "100%", height: "240px" }}
          defaultCenter={center}
          defaultZoom={coords ? 16 : 12}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          clickableIcons={false}
          reuseMaps
        >
          <ClickToSetMarker coords={coords} onCoordsChange={onCoordsChange} />
        </Map>
        <div className="border-t border-line bg-[#f9fafb] px-4 py-2 text-center text-xs text-muted">
          {coords
            ? `Lat: ${coords.lat.toFixed(6)} · Lng: ${coords.lng.toFixed(6)} · drag the pin to refine`
            : "Tap the map or search above to drop your delivery pin."}
        </div>
      </div>
    </div>
  );
}

function ClickToSetMarker({
  coords,
  onCoordsChange,
}: {
  coords: { lat: number; lng: number } | null;
  onCoordsChange: DeliveryMapProps["onCoordsChange"];
}) {
  const map = useMap();

  // Re-centre when coords are set from outside the map (e.g. via geolocation
  // or autocomplete) — but only if the new point isn't already on screen.
  React.useEffect(() => {
    if (!map || !coords) return;
    const bounds = map.getBounds();
    const latLng = new google.maps.LatLng(coords.lat, coords.lng);
    if (!bounds || !bounds.contains(latLng)) {
      map.panTo(latLng);
      const z = map.getZoom() ?? 12;
      if (z < 14) map.setZoom(15);
    }
  }, [map, coords]);

  // Tap-anywhere to drop / move the pin.
  React.useEffect(() => {
    if (!map) return;
    const listener = map.addListener(
      "click",
      (e: google.maps.MapMouseEvent) => {
        const pt = e.latLng;
        if (!pt) return;
        // Public LatLng methods, never internal properties.
        onCoordsChange(pt.lat(), pt.lng(), "click");
      }
    );
    return () => listener.remove();
  }, [map, onCoordsChange]);

  if (!coords) return null;

  return (
    <AdvancedMarker
      position={coords}
      draggable
      onDragEnd={(e) => {
        const pt = e.latLng;
        if (!pt) return;
        onCoordsChange(pt.lat(), pt.lng(), "drag");
      }}
    />
  );
}

function AddressAutocomplete({
  defaultValue,
  onPick,
}: {
  defaultValue?: string;
  onPick: (lat: number, lng: number) => void;
}) {
  const places = useMapsLibrary("places");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    if (!places || !inputRef.current) return;

    // Bias suggestions toward Ghana and keep the type focused on establishments
    // + addresses (no plus-codes / regions that give us nothing geographic).
    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address", "name"],
      componentRestrictions: { country: "gh" },
      types: ["geocode", "establishment"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const loc = place.geometry?.location;
      if (!loc) return;
      onPick(loc.lat(), loc.lng());
    });

    setIsReady(true);
    return () => listener.remove();
  }, [places, onPick]);

  return (
    <label className="relative block">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        placeholder={
          isReady
            ? "Search for a street, area, or landmark"
            : "Loading address search…"
        }
        disabled={!isReady}
        autoComplete="off"
        // Stop Enter from submitting the surrounding form when a suggestion is
        // being selected — Google fires `place_changed` first, but the form
        // would still post if we don't preventDefault here.
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        className="h-9 w-full rounded-button border-2 border-input bg-surface pl-9 pr-3 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none disabled:opacity-60"
      />
      {!isReady && (
        <Loader2
          className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted"
          aria-hidden
        />
      )}
    </label>
  );
}
