"use client";

import * as React from "react";
import { addConfiguredLineItem, getCartLineCount } from "@/lib/actions/cart";
import {
  onAddCommitRequested,
  settleOptimisticAdd,
} from "@/lib/cart-handoff";
import { mapLineItem } from "@/app/(shop)/cart/map-cart";
import { notifyCartCount } from "@/lib/cart-events";

/**
 * Long-lived executor for optimistic Add to Cart commits.
 *
 * Lives in the (shop) layout so it survives the product → /cart navigation.
 * The customizer navigates instantly and publishes the add input through
 * cart-handoff; this agent runs the actual server action and settles the
 * channel with the committed cart (or a failure, which the cart page rolls
 * back and explains). Running it here — not in the unmounting product page —
 * is what keeps the dispatch alive across the navigation.
 */
export function CartAddAgent() {
  React.useEffect(
    () =>
      onAddCommitRequested(async (req) => {
        try {
          const cart = await addConfiguredLineItem({
            variantId: req.variantId,
            quantity: req.quantity,
            setupPrintingValue: req.setupPrintingValue,
            notes: req.notes,
          });
          // Reconcile the badge to server truth (lines merge when the same
          // variant is added twice). cart:set — no second toast.
          notifyCartCount(cart?.items?.length ?? 0);
          settleOptimisticAdd({
            ok: true,
            items: (cart?.items ?? []).map(mapLineItem),
          });
        } catch (err) {
          console.error("[cart-add-agent] commit failed:", err);
          settleOptimisticAdd({ ok: false });
          try {
            notifyCartCount(await getCartLineCount());
          } catch {
            // Best-effort badge reconcile; the next navigation re-syncs it.
          }
        }
      }),
    []
  );
  return null;
}
