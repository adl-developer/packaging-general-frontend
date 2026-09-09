"use client";

import * as React from "react";
import { ProductCustomizer } from "@/components/products/product-customizer";
import type { Product } from "@/lib/products";
import type { StockState } from "@/lib/stock-rules";

/** Live stock keyed by VARIANT id — the shape of the customizer's `stock`. */
export type StockByVariant = Record<string, StockState>;

/**
 * Streams live stock and the signed-in flag INTO an already-rendered
 * <ProductCustomizer>, without remounting it.
 *
 * The page hands both values over as still-pending promises (started during
 * the server render, never awaited there) so the customizer paints from the
 * catalogue cache alone. The obvious `use(stock)` in a wrapper would suspend
 * the whole customizer until stock arrived — no faster than before — and
 * making the customizer its own Suspense fallback would remount it when the
 * promise settled, discarding any size / quantity / notes the shopper had
 * already entered. So the customizer renders exactly once, outside any
 * boundary, and two sibling <Resolve>s each `use()` one promise behind a
 * null-fallback <Suspense> and lift the settled value into state here; the
 * customizer simply re-renders with new props.
 *
 * The initial values are the customizer's own documented "unknown" states:
 *
 * - stock `{}` — a missing variant key means unknown → treated as in stock
 *   (fail open; identical to a failed stock fetch). No "in stock" text is
 *   ever rendered; the out-of-stock notice, the disabled Add to Cart / Buy
 *   Now and the WhatsApp CTA appear the moment the real map lands. An add
 *   clicked inside that sub-second window is still refused server-side by
 *   Medusa's inventory guard on createLineItem (the cart page rolls the
 *   optimistic line back with an error) and by the pre- and post-payment
 *   checks in lib/actions/checkout.ts — the money path never relied on this
 *   prop.
 * - isSignedIn `false` — Buy Now opens the auth modal until the customer is
 *   confirmed; it never assumes a session. `buyNow` re-checks getCustomer()
 *   server-side regardless.
 *
 * The server render and the first client render both use these initial
 * values, so hydration matches; the lifting effects only run after it.
 */
export function LiveProductCustomizer({
  product,
  stock,
  isSignedIn,
}: {
  product: Product;
  stock: Promise<StockByVariant>;
  isSignedIn: Promise<boolean>;
}) {
  const [liveStock, setLiveStock] = React.useState<StockByVariant>({});
  const [signedIn, setSignedIn] = React.useState(false);
  return (
    <>
      <ProductCustomizer
        product={product}
        stock={liveStock}
        isSignedIn={signedIn}
      />
      <React.Suspense fallback={null}>
        <Resolve promise={stock} onValue={setLiveStock} />
      </React.Suspense>
      <React.Suspense fallback={null}>
        <Resolve promise={isSignedIn} onValue={setSignedIn} />
      </React.Suspense>
    </>
  );
}

/**
 * Renders nothing; suspends on `promise` and reports its value upward once
 * settled. One boundary per promise so a guest's instant `isSignedIn` (no
 * cookie → no backend call) never waits on the stock round-trip, or vice
 * versa.
 */
function Resolve<T>({
  promise,
  onValue,
}: {
  promise: Promise<T>;
  onValue: (value: T) => void;
}) {
  const value = React.use(promise);
  React.useEffect(() => {
    onValue(value);
  }, [value, onValue]);
  return null;
}
