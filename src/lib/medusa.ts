import Medusa from "@medusajs/js-sdk";

/**
 * Shared Medusa Store SDK client.
 *
 * Uses the publishable key, which scopes requests to the "Packaging General"
 * sales channel. Safe to use in Server Components; the publishable key is not
 * a secret (it only grants read access to published catalog data).
 */
const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
});
