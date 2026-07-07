"use client";

import * as React from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";

/**
 * Delivery location for /checkout/delivery — produces the lat/lng coordinates
 * Yango Delivery requires. Google Places autocomplete is bound directly onto
 * the single "Delivery Address" input owned by `delivery-form.tsx` (passed in
 * via `addressInputRef`), so there is ONE address field, not a separate search
 * box. The map below is only for confirming / refining the pin.
 *
 * Performance contract (per Google's "Performance Best Practices"):
 *   • LAZY-MOUNT — we don't render the APIProvider (and don't pull the Maps JS
 *     bundle) until the form signals `active` (the user focuses the address
 *     field, scrolls the location section into view, or taps "Use My Current
 *     Location"). Until then the address input is a plain text field and the
 *     map slot is a static gradient, so the page hydrates with zero map bytes.
 *   • Official wrapper (`@vis.gl/react-google-maps`) — no raw `<script>`
 *     injection or `window.google` patching.
 *   • Public APIs only — `LatLng.lat()` / `.lng()`, not internal properties.
 *
 * Coords flow back to the form via `onCoordsChange(lat, lng, source)`. We
 * persist them onto `cart.shipping_address.metadata` so the backend's Yango
 * provider can read them in `calculatePrice` / `createFulfillment`.
 *
 * Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (restrict it to the storefront's
 * domain + Maps JavaScript / Places / Geocoding APIs).
 */

export interface DeliveryLocationProps {
  /** Whether to mount Google Maps yet (lazy — set on address focus / scroll). */
  active: boolean;
  /** The Delivery Address input that Google Places autocomplete binds onto. */
  addressInputRef: React.RefObject<HTMLInputElement | null>;
  /** Currently captured coords (controlled). */
  coords: { lat: number; lng: number } | null;
  /** Called when the user picks a suggestion, drags the marker, or clicks the
   *  map. */
  onCoordsChange: (lat: number, lng: number, source: MapCoordSource) => void;
  /** Whether the manual lat/lng entry is expanded (label toggles accordingly). */
  manualOpen: boolean;
  /** Toggle the manual lat/lng entry (rendered by the form, below the map). */
  onToggleManual: () => void;
  /** Bumped (with the coords to resolve) whenever a non-autocomplete source
   *  changes the pin — drag, click, "Use My Current Location", or manual
   *  lat/lng entry. Triggers a reverse-geocode that writes the resolved
   *  address back into `addressInputRef` so the field always reflects the
   *  pin, the same way Places Autocomplete already does. */
  geocodeRequest: { lat: number; lng: number; nonce: number } | null;
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

export function DeliveryLocation({
  active,
  addressInputRef,
  coords,
  onCoordsChange,
  manualOpen,
  onToggleManual,
  geocodeRequest,
}: DeliveryLocationProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  let mapArea: React.ReactNode;
  if (!apiKey) {
    mapArea = (
      <div className="bg-mist px-4 py-6 text-center text-sm text-muted">
        <MapPin className="mx-auto mb-2 size-5 text-plum" aria-hidden />
        Map preview unavailable.{" "}
        <span className="font-medium text-brand">
          Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        </span>{" "}
        to enable address search and the map.
      </div>
    );
  } else if (!active) {
    mapArea = <MapPlaceholder coords={coords} />;
  } else {
    mapArea = (
      <APIProvider apiKey={apiKey} libraries={["places", "geocoding"]}>
        <AutocompleteBinder
          inputRef={addressInputRef}
          onPick={(lat, lng) => onCoordsChange(lat, lng, "autocomplete")}
        />
        <ReverseGeocoder request={geocodeRequest} inputRef={addressInputRef} />
        <MapView coords={coords} onCoordsChange={onCoordsChange} />
      </APIProvider>
    );
  }

  // Container + footer bar mirror Figma 424:2869: 1px #c4bcb0 border, 16px
  // radius, a #f9fafb footer strip (top border) holding a full-width centred
  // "Enter coordinates manually" button.
  return (
    <div className="overflow-hidden rounded-option border border-line">
      {mapArea}
      <div className="border-t border-line bg-[#f9fafb] px-4 pb-4 pt-[17px]">
        <button
          type="button"
          onClick={onToggleManual}
          className="flex h-8 w-full items-center justify-center rounded-button text-xs font-medium text-brand transition-colors hover:bg-line/20"
        >
          {manualOpen ? "Hide manual entry" : "Enter coordinates manually"}
        </button>
      </div>
    </div>
  );
}

function MapPlaceholder({
  coords,
}: {
  coords: { lat: number; lng: number } | null;
}) {
  return (
    <div className="grid h-48 place-items-center bg-gradient-to-br from-accent/20 via-mist to-plum/10">
      <div className="flex flex-col items-center gap-1 text-center">
        <MapPin
          className={coords ? "size-12 text-plum" : "size-12 text-muted"}
          aria-hidden
        />
        <p className="text-sm font-medium text-brand">
          {coords ? "Delivery location set" : "Delivery Location"}
        </p>
        <p className="text-xs text-muted">
          {coords
            ? `Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}`
            : "Start typing your address to load the map."}
        </p>
      </div>
    </div>
  );
}

function MapView({
  coords,
  onCoordsChange,
}: {
  coords: { lat: number; lng: number } | null;
  onCoordsChange: DeliveryLocationProps["onCoordsChange"];
}) {
  const center = coords ?? ACCRA_FALLBACK;

  return (
    <Map
      mapId="pg-delivery-map"
      style={{ width: "100%", height: "192px" }}
      defaultCenter={center}
      defaultZoom={coords ? 16 : 12}
      gestureHandling="cooperative"
      disableDefaultUI={false}
      clickableIcons={false}
      reuseMaps
    >
      <ClickToSetMarker coords={coords} onCoordsChange={onCoordsChange} />
    </Map>
  );
}

function ClickToSetMarker({
  coords,
  onCoordsChange,
}: {
  coords: { lat: number; lng: number } | null;
  onCoordsChange: DeliveryLocationProps["onCoordsChange"];
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

/**
 * Binds a Google Places `Autocomplete` onto the form's Delivery Address input.
 * Renders nothing — Google injects its own suggestions dropdown and writes the
 * chosen address back into the input element (which the form reads via
 * FormData). We only lift the geometry up as coords.
 */
function AutocompleteBinder({
  inputRef,
  onPick,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (lat: number, lng: number) => void;
}) {
  const places = useMapsLibrary("places");

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

    return () => {
      listener.remove();
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [places, inputRef, onPick]);

  return null;
}

/**
 * Reverse-geocodes `request.{lat,lng}` and writes the resolved address
 * straight into `inputRef` (same direct-DOM-write pattern as
 * `AutocompleteBinder`), so dragging the pin, tapping the map, using "Use My
 * Current Location", or typing manual lat/lng always reflects back into the
 * Delivery Address field. Skipped for the "autocomplete" source — Google's
 * widget already writes the field itself there. Debounced so rapid clicks /
 * keystrokes on the manual lat/lng fields collapse into one Geocoding call.
 */
function ReverseGeocoder({
  request,
  inputRef,
}: {
  request: { lat: number; lng: number; nonce: number } | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const geocodingLib = useMapsLibrary("geocoding");
  const geocoderRef = React.useRef<google.maps.Geocoder | null>(null);

  React.useEffect(() => {
    if (!geocodingLib || !request) return;

    const timer = window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      if (!geocoderRef.current) {
        geocoderRef.current = new geocodingLib.Geocoder();
      }
      geocoderRef.current.geocode(
        { location: { lat: request.lat, lng: request.lng } },
        (results, status) => {
          if (status !== "OK" || !results?.[0]) return;
          input.value = results[0].formatted_address;
        }
      );
    }, 500);

    return () => window.clearTimeout(timer);
  }, [geocodingLib, request, inputRef]);

  return null;
}
