/**
 * Shared contact-field validation, used on both sides of the wire: the
 * checkout / auth forms give instant feedback, and the server actions
 * re-check before writing to the cart or customer (never trust the client).
 *
 * Phone numbers are validated against the Ghana numbering plan and
 * normalized to E.164 (+233XXXXXXXXX) — Twilio SMS and Yango both want
 * E.164, so normalize at the door instead of at every consumer.
 */

/** Pragmatic email check: one @, a domain with at least one dot, no spaces.
 *  (Stricter than `type="email"`, which happily accepts `a@b`.) */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * Normalize a Ghana phone number to E.164 (+233XXXXXXXXX), or null when the
 * input isn't a valid Ghana number. Spaces, dashes, dots and parentheses are
 * ignored. Accepted shapes (length-gated so a 9-digit national number that
 * happens to start with 233… or 0… can't be mis-stripped):
 *
 *   0XX XXX XXXX      local format with trunk zero (10 digits)
 *   XXXXXXXXX         9-digit national number
 *   +233 / 233 / 00233 followed by the 9-digit national number
 *
 * The national number must be 9 digits starting with 2, 3 or 5 (mobile 2x/5x,
 * fixed 3x). Operator prefixes shift too often to hard-code beyond that.
 */
export function normalizeGhanaPhone(value: string): string | null {
  let digits = value.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith("00233") && digits.length === 14) {
    digits = digits.slice(5);
  } else if (digits.startsWith("233") && digits.length === 12) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 10) {
    digits = digits.slice(1);
  }

  if (!/^[235]\d{8}$/.test(digits)) return null;
  return `+233${digits}`;
}

export function isValidGhanaPhone(value: string): boolean {
  return normalizeGhanaPhone(value) !== null;
}

export const EMAIL_ERROR = "Please enter a valid email address.";
export const PHONE_ERROR =
  "Please enter a valid Ghana phone number, e.g. 024 123 4567 or +233 24 123 4567.";

/** Loose `pattern=` attribute for phone inputs — quick browser-native feedback
 *  only; the submit handlers and server actions are the real gate.
 *  NOTE: browsers compile `pattern` with the strict `v` regex flag, where an
 *  unescaped `-` inside a character class is a syntax error that silently
 *  disables the whole pattern — keep the hyphens escaped. */
export const GH_PHONE_PATTERN = "(\\+?233|0)?[ \\-]?[235][0-9 \\-]{7,14}";
