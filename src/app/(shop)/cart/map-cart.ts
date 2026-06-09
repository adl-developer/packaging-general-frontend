import type { HttpTypes } from "@medusajs/types";

/** Ghana VAT + NHIL + GETFund + COVID levies (effective ≈ 21.9% — matches the
 *  backend tax region seeded in seed-ghana.ts). Used to display "Total incl.
 *  tax" per line until live tax totals are wired from the cart's tax_total. */
export const TAX_RATE = 0.219;

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
}

/** Map a Medusa cart line → the cart UI's CartItem shape. Pure + client-safe:
 *  the server page maps the initial cart, and the client re-maps the cart
 *  returned by addLineItem() after a cross-sell add. */
export function mapLineItem(item: HttpTypes.StoreCartLineItem): CartItem {
  const variantTitle = item.variant_title;
  const specs: string[] = [];
  // Accessories have a single "Roll" variant — a "Size: Roll" spec line would
  // just be noise, so only size-like variant titles become specs.
  if (variantTitle && variantTitle !== "Roll") specs.push(`Size: ${variantTitle}`);

  return {
    id: item.id,
    variantId: item.variant_id ?? undefined,
    name: item.product_title || item.title || "Item",
    specs,
    unitPrice: Number(item.unit_price ?? 0),
    taxRate: TAX_RATE,
    quantity: Number(item.quantity ?? 1),
    productSlug: item.product_handle ?? undefined,
  };
}
