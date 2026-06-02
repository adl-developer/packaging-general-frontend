"use server";

import type { HttpTypes } from "@medusajs/types";
import { sdk, authHeaders } from "@/lib/medusa";
import { getAuthToken } from "@/lib/actions/auth";

/**
 * Customer order history. All store order endpoints require the customer JWT —
 * they only ever return the authenticated customer's own orders.
 */
const ORDER_LIST_FIELDS =
  "id,display_id,status,fulfillment_status,payment_status,created_at,email,currency_code,total,item_total,*items";

const ORDER_DETAIL_FIELDS =
  "id,display_id,status,fulfillment_status,payment_status,created_at,email,currency_code,total,subtotal,tax_total,shipping_total,discount_total,item_total,metadata,*items,*shipping_address,*shipping_methods";

/** The signed-in customer's orders, newest first. Empty array if not logged in. */
export async function listMyOrders(): Promise<HttpTypes.StoreOrder[]> {
  const token = await getAuthToken();
  if (!token) return [];
  try {
    const { orders } = await sdk.store.order.list(
      { fields: ORDER_LIST_FIELDS, order: "-created_at", limit: 50 },
      authHeaders(token)
    );
    return orders;
  } catch (err) {
    console.error("[orders] list failed:", err);
    return [];
  }
}

/** Shape returned by the custom GET /store/order-lookup route. */
export interface OrderLookupResult {
  number: string;
  display_id: number;
  placed_on: string | null;
  status: string | null;
  fulfillment_status: string | null;
  payment_status: string | null;
  current_step: number;
  currency_code: string | null;
  customer: { name: string; phone: string; email: string };
  address: string;
  delivery_instructions: string;
  items: {
    title: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  totals: {
    item_total: number;
    tax_total: number;
    shipping_total: number;
    discount_total: number;
    total: number;
  };
}

/**
 * Public guest order tracking. Looks up an order by number + email via the
 * custom backend route. Returns null on any miss (bad number / wrong email) —
 * the backend returns a generic 404 so order numbers can't be enumerated.
 */
export async function lookupOrder(
  orderNumber: string,
  email: string
): Promise<OrderLookupResult | null> {
  try {
    const { order } = await sdk.client.fetch<{ order: OrderLookupResult }>(
      "/store/order-lookup",
      { method: "GET", query: { order_number: orderNumber, email } }
    );
    return order;
  } catch {
    return null;
  }
}

/** A single order owned by the signed-in customer, or null. */
export async function getMyOrder(
  id: string
): Promise<HttpTypes.StoreOrder | null> {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    const { order } = await sdk.store.order.retrieve(
      id,
      { fields: ORDER_DETAIL_FIELDS },
      authHeaders(token)
    );
    return order;
  } catch (err) {
    console.error("[orders] retrieve failed:", err);
    return null;
  }
}
