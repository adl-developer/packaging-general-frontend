"use server";

import { revalidatePath } from "next/cache";
import { getCustomer } from "@/lib/actions/auth";
import { getMyOrder } from "@/lib/actions/orders";
import { addLineItem, getCart, updateLineItemQuantity } from "@/lib/actions/cart";
import { getStockMap } from "@/lib/stock";
import {
  buildReorderMessage,
  reconcileReorder,
  type ExistingCartLine,
  type ReorderLine,
} from "@/lib/reorder";

export type ReorderResult =
  | { ok: true; message: string | null }
  | { ok: false; error: string };

/**
 * Reorder a past order into the customer's current cart.
 *
 * Auth is enforced here, server-side, regardless of what the calling UI
 * already gates on: `getCustomer()` re-checks the session, and the order is
 * resolved through `getMyOrder` — which only ever returns an order owned by
 * that same customer (see lib/actions/orders.ts). A client passing an
 * arbitrary order id can never read or reorder someone else's order; an
 * unauthenticated caller gets an error, never a silent no-op that looks like
 * success.
 *
 * Never fails the whole reorder over one short line: stock caps are applied
 * per line (reconcileReorder), fully out-of-stock lines are skipped, and the
 * customer is always told what happened via the returned `message` — see
 * docs/superpowers/specs/2026-07-31-reorder-design.md.
 */
export async function reorderOrder(orderId: string): Promise<ReorderResult> {
  const customer = await getCustomer();
  if (!customer) {
    return { ok: false, error: "Please sign in to reorder." };
  }

  const order = await getMyOrder(orderId);
  if (!order) {
    // Covers "not found" AND "not yours" identically — never leaks which.
    return { ok: false, error: "We couldn't find that order." };
  }

  const orderLines: ReorderLine[] = (order.items ?? [])
    .filter((item): item is typeof item & { variant_id: string; product_id: string } =>
      Boolean(item.variant_id && item.product_id),
    )
    .map((item) => ({
      variantId: item.variant_id,
      productId: item.product_id,
      name: item.product_title || item.title || "Item",
      quantity: Number(item.quantity ?? 0),
      isService: Boolean(
        (item.product?.metadata as Record<string, unknown> | null)?.service,
      ),
    }));

  const productLines = orderLines.filter((l) => !l.isService && l.quantity > 0);
  if (productLines.length === 0) {
    return { ok: false, error: "This order has no items to reorder." };
  }

  const productIds = Array.from(new Set(productLines.map((l) => l.productId)));
  const stockMap = await getStockMap(productIds);

  const cart = await getCart();
  const existingCartLines: ExistingCartLine[] = (cart?.items ?? [])
    .filter((i) => i.variant_id)
    .map((i) => ({ variantId: i.variant_id as string, quantity: Number(i.quantity ?? 0) }));

  const result = reconcileReorder(orderLines, stockMap, existingCartLines);

  if (result.linesToAdd.length === 0) {
    const message = buildReorderMessage(result);
    return {
      ok: false,
      error: message ?? "None of these items are currently available.",
    };
  }

  // Cart mutations are serialized (Medusa locks the cart per write — see
  // cart.ts) so these MUST run sequentially, never in parallel.
  for (const line of result.linesToAdd) {
    const existingItem = (cart?.items ?? []).find(
      (i) => i.variant_id === line.variantId,
    );
    if (existingItem && line.existingQuantity > 0) {
      await updateLineItemQuantity(
        existingItem.id,
        line.existingQuantity + line.addQuantity,
      );
    } else {
      await addLineItem(line.variantId, line.addQuantity);
    }
  }

  revalidatePath("/cart");
  return { ok: true, message: buildReorderMessage(result) };
}
