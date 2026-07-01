"use server";

import type { HttpTypes } from "@medusajs/types";
import { sdk, authHeaders } from "@/lib/medusa";
import { getAuthToken } from "@/lib/auth-token";

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
  /** Carrier tracking block — present once a real fulfillment has been
   *  created with a provider (e.g. Yango). Null for orders still in
   *  pre-fulfillment (e.g. just paid, awaiting production). */
  carrier?: {
    provider_id: string | null;
    tracking_url: string | null;
    status_code: string | null;
    status_label: string | null;
    scheduled_for: string | null;
  } | null;
}

export type OrderLookupOutcome =
  | { status: "found"; order: OrderLookupResult }
  | { status: "not_found" }
  | { status: "error" };

/**
 * Public guest order tracking. Looks up an order by number + email via the
 * custom backend route. A 404 (bad number / wrong email — the backend returns
 * a generic 404 so order numbers can't be enumerated) maps to "not_found";
 * anything else (network, 5xx) maps to "error" so the UI can say "try again"
 * instead of wrongly telling the customer their order doesn't exist.
 */
export async function lookupOrder(
  orderNumber: string,
  email: string
): Promise<OrderLookupOutcome> {
  try {
    const { order } = await sdk.client.fetch<{ order: OrderLookupResult }>(
      "/store/order-lookup",
      { method: "GET", query: { order_number: orderNumber, email } }
    );
    return { status: "found", order };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404 || status === 400) return { status: "not_found" };
    console.error("[orders] lookup failed:", err);
    return { status: "error" };
  }
}

/**
 * Ask the backend to email the order's invoice to the email it was placed
 * with (POST /store/order-lookup/email — same shared-secret rule as the
 * lookup; the backend only ever mails the order's own address).
 */
export async function emailInvoice(
  orderNumber: string,
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await sdk.client.fetch("/store/order-lookup/email", {
      method: "POST",
      body: { order_number: orderNumber, email },
    });
    return { ok: true };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 503) {
      return {
        ok: false,
        error:
          "Invoice emails are temporarily unavailable. Please try again later.",
      };
    }
    if (status === 404 || status === 400) {
      return {
        ok: false,
        error: "We couldn't match that order. Please run the lookup again.",
      };
    }
    if (status === 429) {
      return {
        ok: false,
        error: "Too many attempts. Please wait a few minutes and try again.",
      };
    }
    console.error("[orders] emailInvoice failed:", err);
    return {
      ok: false,
      error: "We couldn't send the invoice email. Please try again.",
    };
  }
}

/**
 * Persist the customer's order-update channel preference (email / WhatsApp-SMS)
 * onto `order.metadata` via the guest-safe /store/order-lookup/notification-
 * preferences route — same shared-secret (order number + email) rule as
 * `lookupOrder`/`emailInvoice`, so no auth token is required right after
 * checkout.
 */
export async function updateNotificationPreferences(
  orderNumber: string,
  email: string,
  prefs: { notifyEmail: boolean; notifySms: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await sdk.client.fetch("/store/order-lookup/notification-preferences", {
      method: "POST",
      body: {
        order_number: orderNumber,
        email,
        notify_email: prefs.notifyEmail,
        notify_sms: prefs.notifySms,
      },
    });
    return { ok: true };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404 || status === 400) {
      return {
        ok: false,
        error: "We couldn't match that order to save your preference.",
      };
    }
    console.error("[orders] updateNotificationPreferences failed:", err);
    return {
      ok: false,
      error: "We couldn't save your notification preference. Please try again.",
    };
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
