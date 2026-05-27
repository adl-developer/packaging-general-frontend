import type { Metadata } from "next";
import type { HttpTypes } from "@medusajs/types";
import { CartClient, type CartItem } from "./cart-client";
import { getCart } from "@/lib/actions/cart";

export const metadata: Metadata = {
  title: "Shopping Cart",
  robots: { index: false, follow: false },
};

/** Ghana VAT + NHIL + GETFund + COVID levies (effective ≈ 21.9% — matches the
 *  backend tax region seeded in seed-ghana.ts). Used to display "Total incl.
 *  tax" per line until live tax totals are wired from the cart's tax_total. */
const TAX_RATE = 0.219;

function mapLineItem(item: HttpTypes.StoreCartLineItem): CartItem {
  const variantTitle = item.variant_title;
  const specs: string[] = [];
  if (variantTitle) specs.push(`Size: ${variantTitle}`);

  return {
    id: item.id,
    name: item.product_title || item.title || "Item",
    specs,
    unitPrice: Number(item.unit_price ?? 0),
    taxRate: TAX_RATE,
    quantity: Number(item.quantity ?? 1),
    productSlug: item.product_handle ?? undefined,
  };
}

export default async function CartPage() {
  const cart = await getCart();
  const initialItems: CartItem[] = (cart?.items ?? []).map(mapLineItem);
  return <CartClient initialItems={initialItems} />;
}
