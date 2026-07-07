/**
 * Customer-facing order-number format: "PG-YYYY-XXX" (e.g. PG-2026-019) —
 * placement year + display_id zero-padded to 3 digits. Mirrors
 * backend/src/utils/order-number.ts; keep the two in sync.
 */
export function formatOrderNumber(
  displayId: number | string | null | undefined,
  createdAt: string | Date | null | undefined,
  fallbackOrderId?: string
): string {
  if (displayId == null) {
    return `PG-${(fallbackOrderId || "").slice(-8).toUpperCase()}`;
  }
  const year = createdAt
    ? new Date(createdAt).getFullYear()
    : new Date().getFullYear();
  return `PG-${year}-${String(displayId).padStart(3, "0")}`;
}
