import type { Metadata } from "next";
import { CartClient } from "./cart-client";
import { mapLineItem, type CartItem } from "./map-cart";
import { getCart } from "@/lib/actions/cart";
import { listCrossSellProducts } from "@/lib/catalog";
import { getActivePromotion, getPromoBanner } from "@/lib/promotions";
import { getLevies } from "@/lib/site-content";

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
  // `sync: false`: one round trip instead of three. Every cart mutation and
  // promo change already re-syncs the tier prices and the fee on the cart it
  // returns, and the payment page + initiatePaystack read with the sync on —
  // so this render can only be stale if the admin changed the fee/tier config
  // since the customer's last cart action, and the payment page corrects that.
  const itemsPromise: Promise<CartItem[]> = getCart({ sync: false }).then(
    (cart) => (cart?.items ?? []).map(mapLineItem)
  );
  // Both module-cached (5 min / 60 s) — cheap to await, and the sections they
  // fill render in the first paint.
  // `getPromoBanner` shares `getActivePromotion`'s one cached fetch.
  // `getLevies` rides the site-content cache (1 h, dropped on a Settings →
  // Platform save).
  const [crossSell, promo, banner, levies] = await Promise.all([
    listCrossSellProducts(),
    getActivePromotion(),
    getPromoBanner(),
    getLevies(),
  ]);
  return (
    <CartClient
      itemsPromise={itemsPromise}
      crossSell={crossSell}
      promo={promo}
      banner={banner}
      levies={levies}
    />
  );
}
