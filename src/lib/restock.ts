import { EMAIL_ERROR, isValidEmail } from "@/lib/validation";

/**
 * "Request restock" (2026-09-29) — the pure, client-safe half.
 *
 * When a customer wants more units than PG has, the product page (before
 * Add to Cart) and the cart (after a failed add) offer a Request restock
 * form. It emails PG's admins via POST /store/restock-request.
 *
 * ⚠ Customer-facing copy NEVER states how many units are in stock (user
 * decision 2026-09-29). Only the staff email shows the number.
 */

export type RestockItem = {
  variantId: string;
  quantity: number;
  productTitle: string;
  /** "Size: Large, Material: Kraft" — display labels, never option ids. */
  variantLabel?: string | null;
};

export type RestockContact = { name: string; email: string; phone: string };

export const RESTOCK_LIMITS = { name: 120, email: 200, phone: 40 } as const;

const PHONE_RE = /^\+?\(?[0-9][0-9\s()-]{5,}$/;

/** All three fields are REQUIRED: the point is that PG can reach them. */
export function validateRestockContact(
  raw: Partial<RestockContact>,
): { ok: true; contact: RestockContact } | { ok: false; error: string } {
  const name = (raw.name ?? "").trim();
  const email = (raw.email ?? "").trim().toLowerCase();
  const phone = (raw.phone ?? "").trim();
  if (!name) return { ok: false, error: "Please enter your name." };
  if (name.length > RESTOCK_LIMITS.name) {
    return { ok: false, error: "Please shorten your name." };
  }
  if (!email || email.length > RESTOCK_LIMITS.email || !isValidEmail(email)) {
    return { ok: false, error: EMAIL_ERROR };
  }
  if (!phone || phone.length > RESTOCK_LIMITS.phone || !PHONE_RE.test(phone)) {
    return { ok: false, error: "Please enter a valid phone number." };
  }
  return { ok: true, contact: { name, email, phone } };
}

const units = (n: number) =>
  `${new Intl.NumberFormat("en-GH").format(n)} unit${n === 1 ? "" : "s"}`;

/** "We don't have enough Everyday Box in stock for 1,000 units right now." */
export function notEnoughStockMessage(item: Pick<RestockItem, "productTitle" | "quantity">): string {
  return `We don't have enough ${item.productTitle} in stock for ${units(item.quantity)} right now.`;
}

/** The modal's summary line: "1,000 units of Everyday Box (Size: Large)". */
export function restockSummary(item: RestockItem): string {
  const variant = item.variantLabel ? ` (${item.variantLabel})` : "";
  return `${units(item.quantity)} of ${item.productTitle}${variant}`;
}
