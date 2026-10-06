/**
 * The customer-facing order number. Since 2026-10-06 it is a random
 * "PG-ORD-7K2M9Q" code the backend stores in the order's `custom_display_id`
 * (request that field). Orders without one keep the older "PG-YYYY-XXX"
 * form. Mirrors backend/src/utils/order-number.ts; keep the two in sync.
 */
const ORDER_CODE_RE = /^PG-ORD-[0-9A-HJKMNP-TV-Z]{6}$/;

export type OrderNumberSource = {
  id?: string | null;
  display_id?: number | string | null;
  created_at?: string | Date | null;
  custom_display_id?: string | null;
};

export function formatOrderNumber(order: OrderNumberSource): string {
  const code = order.custom_display_id;
  if (typeof code === "string" && ORDER_CODE_RE.test(code)) return code;
  if (order.display_id == null) {
    return `PG-${(order.id || "").slice(-8).toUpperCase()}`;
  }
  const year = order.created_at
    ? new Date(order.created_at).getFullYear()
    : new Date().getFullYear();
  return `PG-${year}-${String(order.display_id).padStart(3, "0")}`;
}
