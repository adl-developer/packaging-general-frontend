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
  // NOT awaited — the cart fetch (the slow call) streams to the client instead
  // of blocking the page render. Arrivals from Add to Cart never wait on it at
  // all: the add flow hands its mutation response over via cart-handoff, and
  // CartClient paints from that instantly. Direct visits resolve this promise
  // client-side (same wait as before, now behind the page shell, not the
  // route-level skeleton).
  const itemsPromise: Promise<CartItem[]> = getCart().then((cart) =>
    (cart?.items ?? []).map(mapLineItem)
  );
  // Both module-cached (5 min / 60 s) — cheap to await, and the sections they
  // fill render in the first paint.
  const [crossSell, promo] = await Promise.all([
    listCrossSellProducts(),
    getActivePromotion(),
  ]);
  return (
    <CartClient itemsPromise={itemsPromise} crossSell={crossSell} promo={promo} />
  );
}
