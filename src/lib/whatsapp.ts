/**
 * Packaging General's official support line (client, 2026-09-28): the number
 * customers call AND the WhatsApp chat line. Every "reach us" number on the
 * site reads from here so they cannot drift apart. It replaced the
 * NEXT_PUBLIC_SUPPORT_WHATSAPP env var, which only ever held a placeholder.
 */
export const SUPPORT_PHONE = "+233591207616";
export const SUPPORT_PHONE_DISPLAY = "+233 59 120 7616";

/** The public "contact PG" email (client, 2026-09-29; was info@). */
export const SUPPORT_EMAIL = "hello@packaginggeneral.com";

/**
 * Build a wa.me link, or null when no number is given.
 *
 * Returning null (rather than a partial URL) is deliberate: every caller must
 * hide its CTA instead of rendering `wa.me/undefined`, which would look like a
 * working button and dead-end the customer.
 */
export function buildWhatsappUrl(raw: string | undefined, message: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  // Ghana local form 0XXXXXXXXX → 233XXXXXXXXX.
  const intl = digits.startsWith("0") ? `233${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export function supportWhatsappUrl(message: string): string | null {
  return buildWhatsappUrl(SUPPORT_PHONE, message);
}

export function outOfStockEnquiry(o: { product: string; specs: string[]; quantity: number }): string {
  const spec = o.specs.length ? `, ${o.specs.join(", ")}` : "";
  return `Hi Packaging General, I'd like to order ${o.product}${spec}, quantity ${o.quantity}. It's showing out of stock online, could you help with lead time?`;
}
