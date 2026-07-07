import type { HttpTypes } from "@medusajs/types";

/** Ghana VAT 15% + NHIL 2.5% + GETFund 2.5% on the same base = 20% flat
 *  (VAT Act 2025, Act 1151, effective 1 Jan 2026 — matches the backend tax
 *  region seeded in seed-ghana.ts). Used to display "Total incl. tax" per
 *  line until live tax totals are wired from the cart's tax_total. */
export const TAX_RATE = 0.2;

export interface CartItem {
  id: string;
  /** Medusa variant id — lets the UI know which catalog item a line is
   *  (e.g. cross-sell "Added" state survives reloads). */
  variantId?: string;
  name: string;
  specs: string[];
  unitPrice: number;
  /** Effective tax rate applied to the line subtotal for the displayed total. */
  taxRate: number;
  quantity: number;
  productSlug?: string;
  /** Service lines (one-time printing setup fee): fixed qty, no edit link. */
  isService: boolean;
}

/** Spec display order for configured packaging lines. */
const SPEC_OPTIONS = ["Size", "Material", "Printing"] as const;

/** Map a Medusa cart line → the cart UI's CartItem shape. Pure + client-safe:
 *  the server page maps the initial cart, and the client re-maps the cart
 *  returned by the add-to-cart actions after a cross-sell/customizer add. */
export function mapLineItem(item: HttpTypes.StoreCartLineItem): CartItem {
  const isService = Boolean(
    (item.product?.metadata as Record<string, unknown> | null)?.service,
  );

  // Preferred: real variant option values (Size / Material / Printing).
  // Accessories carry a "Unit: Roll" option — skipped as noise.
  const byOption = new Map<string, string>();
  for (const o of item.variant?.options ?? []) {
    const title = o.option?.title;
    if (title && o.value) byOption.set(title, o.value);
  }

  let specs: string[] = [];
  if (isService) {
    // e.g. "1-Color Print · one-time charge"
    const printType = byOption.get("Printing") ?? item.variant_title;
    specs = printType ? [`${printType} · one-time charge`] : ["One-time charge"];
  } else if (byOption.size) {
    specs = SPEC_OPTIONS.filter((key) => byOption.has(key)).map(
      (key) => `${key}: ${byOption.get(key)}`,
    );
  } else if (item.variant_title && item.variant_title !== "Roll") {
    // Fallback for lines created before variant options were fetched.
    specs = [`Size: ${item.variant_title}`];
  }

  return {
    id: item.id,
    variantId: item.variant_id ?? undefined,
    name: item.product_title || item.title || "Item",
    specs,
    unitPrice: Number(item.unit_price ?? 0),
    taxRate: TAX_RATE,
    quantity: Number(item.quantity ?? 1),
    productSlug: isService ? undefined : (item.product_handle ?? undefined),
    isService,
  };
}
