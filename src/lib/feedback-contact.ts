/**
 * The feedback form's optional Name / Phone / Email fields (2026-09-28).
 *
 * ALL OPTIONAL (user decision): a guest may still report anonymously. Pure and
 * client-safe, shared by the widget (inline error before sending) and the
 * server action (never trusts the browser). The backend's
 * `FeedbackContactSchema` applies the same rules again.
 */

export type FeedbackContact = { name?: string; phone?: string; email?: string };

export const CONTACT_LIMITS = { name: 120, phone: 40, email: 254 } as const;

// Loose on purpose: Ghanaian numbers are typed as 024…, +233 24…, 233-24-….
// The team reads this, nothing dials it automatically.
const PHONE_RE = /^\+?\(?[0-9][0-9\s()-]{5,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactCheck =
  | { ok: true; contact: FeedbackContact | undefined }
  | { ok: false; error: string };

/** Trim, drop blanks, validate what's left. `contact` is undefined when the
 *  reporter left every field empty. */
export function normalizeFeedbackContact(
  input: Partial<Record<keyof FeedbackContact, string | null | undefined>> | null | undefined,
): ContactCheck {
  const name = (input?.name ?? "").trim().slice(0, CONTACT_LIMITS.name);
  const phone = (input?.phone ?? "").trim().slice(0, CONTACT_LIMITS.phone);
  const email = (input?.email ?? "").trim().slice(0, CONTACT_LIMITS.email);

  if (phone && !PHONE_RE.test(phone)) {
    return { ok: false, error: "Please enter a valid phone number, or leave it blank." };
  }
  if (email && !EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address, or leave it blank." };
  }

  const contact: FeedbackContact = {};
  if (name) contact.name = name;
  if (phone) contact.phone = phone;
  if (email) contact.email = email;
  return { ok: true, contact: Object.keys(contact).length ? contact : undefined };
}

/** Prefill for a signed-in customer; the reporter can still edit or clear it. */
export function contactFromCustomer(
  customer: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null,
): Required<FeedbackContact> {
  const name = [customer?.first_name, customer?.last_name]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return {
    name,
    phone: (customer?.phone ?? "").trim(),
    email: (customer?.email ?? "").trim(),
  };
}
