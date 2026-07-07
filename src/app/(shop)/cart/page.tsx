import type { Metadata } from "next";
import { CartClient } from "./cart-client";
import { mapLineItem, type CartItem } from "./map-cart";
import { getCart } from "@/lib/actions/cart";
import { listCrossSellProducts } from "@/lib/products";
import { getActivePromotion } from "@/lib/promotions";

export const metadata: Metadata = {
  title: "Shopping Cart",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const [cart, crossSell, promo] = await Promise.all([
    getCart(),
    listCrossSellProducts(),
    getActivePromotion(),
  ]);
  const initialItems: CartItem[] = (cart?.items ?? []).map(mapLineItem);
  return (
    <CartClient initialItems={initialItems} crossSell={crossSell} promo={promo} />
  );
}
