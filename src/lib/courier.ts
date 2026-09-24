/**
 * The Yango courier on the tracking page (2026-09-24): name, vehicle, a
 * number to call and Yango's live tracking link. The backend
 * (`courier-details.ts`) only sends it once the courier has PICKED UP the
 * order and while it is on its way; absent on an older backend.
 *
 * The number is Yango's temporary forwarded line plus an extension, so the
 * call link pauses (`,`) then keys the extension. Untrusted shape: read
 * through `coerceCourier`, the same way `coerceRows` guards the charge ladder.
 */

export type Courier = {
  name: string | null;
  vehicle: string | null;
  phone: string | null;
  ext: string | null;
  trackingUrl: string | null;
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function httpUrl(v: unknown): string | null {
  const s = str(v);
  return s && /^https?:\/\//i.test(s) ? s : null;
}

export function coerceCourier(raw: unknown): Courier | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const phone = str(r.phone);
  const c: Courier = {
    name: str(r.name),
    vehicle: str(r.vehicle),
    phone,
    ext: phone ? str(r.ext) : null,
    trackingUrl: httpUrl(r.tracking_url),
  };
  return c.name || c.vehicle || c.phone || c.trackingUrl ? c : null;
}

export function courierDialHref(phone: string, ext: string | null): string {
  const digits = phone.replace(/[^0-9+]/g, "");
  const extDigits = ext ? ext.replace(/[^0-9]/g, "") : "";
  return `tel:${digits}${extDigits ? `,${extDigits}` : ""}`;
}

export function courierPhoneLabel(phone: string, ext: string | null): string {
  return ext ? `${phone} ext ${ext}` : phone;
}
