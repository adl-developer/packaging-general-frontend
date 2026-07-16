"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { HttpTypes } from "@medusajs/types";
import { sdk, authHeaders } from "@/lib/medusa";
import { getCart } from "./cart";
import { getCustomer } from "./auth";
import { getAuthToken } from "@/lib/auth-token";
import {
  isValidEmail,
  normalizeGhanaPhone,
  EMAIL_ERROR,
  PHONE_ERROR,
} from "@/lib/validation";

/**
 * Checkout server actions — wire forms + payment to Medusa, then to Paystack.
 *
 * Flow:
 *   1. /checkout            (Company Info)  → saveContactInfo
 *   2. /checkout/delivery   (Address)       → saveDeliveryAddress (also picks the first shipping option)
 *   3. /checkout/payment    (Pay)           → initiatePaystack → redirect to authorization_url
 *   4. /checkout/callback   (Paystack)      → completeCartFromReference → /checkout/confirmation?order=<id>
 *
 * The cart id is stored in the httpOnly `pg_cart_id` cookie set by cart.ts.
 */
const CART_COOKIE = "pg_cart_id";
const LAST_ORDER_COOKIE = "pg_last_order";
const PAYSTACK_PROVIDER_ID = "pp_paystack";

async function readCartId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value;
}

/** Remember the just-placed order for a short while, so revisiting the
 *  Paystack callback (browser back / refresh) after the cart cookie is gone
 *  can still land on the confirmation page instead of an error. */
async function rememberLastOrder(orderId: string) {
  try {
    const store = await cookies();
    store.set(LAST_ORDER_COOKIE, orderId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // 1 hour — only needs to outlive the redirect dance
      path: "/",
    });
  } catch {
    /* read-only context — purely a UX nicety, never fatal */
  }
}

async function clearCartCookie() {
  // Cookie mutation is only legal in a Route Handler / Server Action, never in
  // a Server Component render. Wrapped so a render-context caller can't turn a
  // SUCCESSFUL order into a thrown error (getCart() clears completed carts on
  // next access anyway). The callback is a Route Handler, so this normally runs
  // in a writable context — this is belt-and-suspenders.
  try {
    const store = await cookies();
    store.delete(CART_COOKIE);
  } catch {
    /* read-only context — cleanup deferred to getCart() */
  }
}

function metaString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

/** The signed-in customer's default (or first) saved address, if any. */
async function getSavedAddress(): Promise<HttpTypes.StoreCustomerAddress | null> {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    const { addresses } = await sdk.store.customer.listAddress(
      {},
      authHeaders(token)
    );
    return addresses.find((a) => a.is_default_shipping) ?? addresses[0] ?? null;
  } catch (err) {
    console.error("[checkout] listAddress failed:", err);
    return null;
  }
}

export interface CheckoutPrefill {
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  email: string;
  deliveryName: string;
  deliveryPhone: string;
  address: string;
  instructions: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Initial values for the checkout forms. Within a checkout session the cart is
 * the source of truth (so going back never loses what was typed); across
 * sessions a signed-in customer's profile + default saved address fill the
 * gaps. Guests start blank once their previous cart completes.
 */
export async function getCheckoutPrefill(): Promise<CheckoutPrefill> {
  const [cart, customer, saved] = await Promise.all([
    getCart(),
    getCustomer(),
    getSavedAddress(),
  ]);

  const meta = (cart?.metadata ?? null) as Record<string, unknown> | null;
  const cartAddr = cart?.shipping_address;
  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : "";
  const cartAddrName = cartAddr
    ? [cartAddr.first_name, cartAddr.last_name].filter(Boolean).join(" ")
    : "";
  const savedName = saved
    ? [saved.first_name, saved.last_name].filter(Boolean).join(" ")
    : "";

  return {
    companyName: metaString(meta, "company_name") || customer?.company_name || "",
    contactPerson: metaString(meta, "contact_person") || customerName,
    contactPhone:
      metaString(meta, "contact_phone") || customer?.phone || saved?.phone || "",
    email: cart?.email || customer?.email || "",
    deliveryName:
      cartAddrName || savedName || metaString(meta, "contact_person") || customerName,
    deliveryPhone:
      cartAddr?.phone ||
      saved?.phone ||
      metaString(meta, "contact_phone") ||
      customer?.phone ||
      "",
    address: cartAddr?.address_1 || saved?.address_1 || "",
    instructions:
      metaString(cartAddr?.metadata as Record<string, unknown> | null, "instructions") ||
      metaString(saved?.metadata as Record<string, unknown> | null, "instructions"),
    lat: metaNumber(cartAddr?.metadata as Record<string, unknown> | null, "lat"),
    lng: metaNumber(cartAddr?.metadata as Record<string, unknown> | null, "lng"),
  };
}

function metaNumber(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): number | null {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Persist company name, contact person, phone and email onto the cart. We
 *  store the company + contact-person in cart.metadata since Medusa's cart
 *  schema doesn't have first-class fields for them. */
export async function saveContactInfo(input: {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = await readCartId();
  if (!id) return { ok: false, error: "Your cart has expired. Please add an item again." };
  // Re-validate server-side — the forms check too, but actions are callable
  // directly, and a bad phone breaks Twilio SMS / Yango downstream.
  const email = input.email.trim();
  const phone = normalizeGhanaPhone(input.phone);
  if (!isValidEmail(email)) return { ok: false, error: EMAIL_ERROR };
  if (!phone) return { ok: false, error: PHONE_ERROR };
  try {
    await sdk.store.cart.update(id, {
      email,
      metadata: {
        company_name: input.companyName,
        contact_person: input.contactPerson,
        contact_phone: phone,
      },
    });
  } catch (err) {
    console.error("[checkout] saveContactInfo failed:", err);
    return { ok: false, error: "Couldn't save your contact info. Please try again." };
  }

  // Best-effort: keep the signed-in customer's profile in sync so their NEXT
  // checkout prefills these details. Never blocks the current checkout.
  const token = await getAuthToken();
  if (token) {
    try {
      await sdk.store.customer.update(
        { company_name: input.companyName, phone },
        {},
        authHeaders(token)
      );
    } catch (err) {
      console.error("[checkout] customer profile sync failed:", err);
    }
  }

  revalidatePath("/checkout/delivery");
  return { ok: true };
}

/** Persist the shipping address and auto-select the first shipping option for
 *  the cart. In Ghana we currently have a single Standard Delivery option, so
 *  the user doesn't have to pick. (TODO: surface multiple options when we
 *  add same-day / express tiers.) */
export async function saveDeliveryAddress(input: {
  contactName: string;
  phone: string;
  email: string;
  address: string;
  instructions: string;
  /** Captured by the delivery-form (geolocation or manual entry). REQUIRED by
   *  Yango Delivery — without coords the Yango provider falls back to a 0 quote
   *  and refuses to create a claim at order time. */
  lat?: number | null;
  lng?: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = await readCartId();
  if (!id) return { ok: false, error: "Your cart has expired. Please add an item again." };

  // Re-validate server-side — the forms check too, but actions are callable
  // directly, and Yango claims + SMS notifications need a real E.164 phone.
  const email = input.email.trim();
  const phone = normalizeGhanaPhone(input.phone);
  if (!isValidEmail(email)) return { ok: false, error: EMAIL_ERROR };
  if (!phone) return { ok: false, error: PHONE_ERROR };

  const [firstName, ...rest] = input.contactName.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName || "Customer";

  const addressMetadata: Record<string, unknown> = { instructions: input.instructions };
  if (typeof input.lat === "number" && Number.isFinite(input.lat)) {
    addressMetadata.lat = input.lat;
  }
  if (typeof input.lng === "number" && Number.isFinite(input.lng)) {
    addressMetadata.lng = input.lng;
  }

  const address: HttpTypes.StoreAddAddress = {
    first_name: firstName || "Customer",
    last_name: lastName,
    phone,
    address_1: input.address,
    city: "Accra",
    country_code: "gh",
    metadata: addressMetadata,
  };

  try {
    await sdk.store.cart.update(id, {
      email,
      shipping_address: address,
      billing_address: address,
    });

    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
      cart_id: id,
    });
    const option = shipping_options[0];
    if (!option) {
      return {
        ok: false,
        error: "No delivery options are available right now. Please contact support.",
      };
    }
    await sdk.store.cart.addShippingMethod(id, { option_id: option.id });
  } catch (err) {
    console.error("[checkout] saveDeliveryAddress failed:", err);
    return { ok: false, error: "Couldn't save your delivery details. Please try again." };
  }

  // Best-effort: upsert the signed-in customer's default saved address so the
  // NEXT checkout prefills it. Never blocks the current checkout.
  const token = await getAuthToken();
  if (token) {
    try {
      const payload = {
        first_name: address.first_name,
        last_name: address.last_name,
        phone,
        address_1: input.address,
        city: "Accra",
        country_code: "gh",
        metadata: addressMetadata,
      };
      const { addresses } = await sdk.store.customer.listAddress(
        {},
        authHeaders(token)
      );
      const target =
        addresses.find((a) => a.is_default_shipping) ?? addresses[0];
      if (target) {
        await sdk.store.customer.updateAddress(target.id, payload, {}, authHeaders(token));
      } else {
        await sdk.store.customer.createAddress(
          { ...payload, is_default_shipping: true },
          {},
          authHeaders(token)
        );
      }
    } catch (err) {
      console.error("[checkout] saving customer address failed:", err);
    }
  }

  revalidatePath("/checkout/payment");
  return { ok: true };
}

interface PaystackSessionData {
  paystackTxRef?: string;
  paystackTxAuthorizationUrl?: string;
  paystackTxAccessCode?: string;
}

/** Initialize a Paystack payment session for the current cart and return the
 *  authorization URL the browser should be redirected to. */
export async function initiatePaystack(): Promise<
  { ok: true; authorizationUrl: string } | { ok: false; error: string }
> {
  const cart = await getCart();
  if (!cart) return { ok: false, error: "Your cart has expired. Please add an item again." };
  if (!cart.email) {
    return { ok: false, error: "Please add your contact details before paying." };
  }
  if (!cart.shipping_address?.address_1) {
    return { ok: false, error: "Please add a delivery address before paying." };
  }
  if (!cart.shipping_methods?.length) {
    return { ok: false, error: "Please choose a delivery option before paying." };
  }

  try {
    const { payment_collection } = await sdk.store.payment.initiatePaymentSession(cart, {
      provider_id: PAYSTACK_PROVIDER_ID,
      data: { email: cart.email },
    });

    const session = payment_collection.payment_sessions?.find(
      (s) => s.provider_id === PAYSTACK_PROVIDER_ID,
    );
    const data = (session?.data ?? {}) as PaystackSessionData;
    if (!data.paystackTxAuthorizationUrl) {
      console.error("[checkout] paystack session missing authorization url:", session);
      return { ok: false, error: "Couldn't start Paystack checkout. Please try again." };
    }
    return { ok: true, authorizationUrl: data.paystackTxAuthorizationUrl };
  } catch (err) {
    console.error("[checkout] initiatePaystack failed:", err);
    return { ok: false, error: "Couldn't start Paystack checkout. Please try again." };
  }
}

/** Complete the cart after Paystack redirects back. Medusa runs the provider's
 *  authorizePayment (which verifies the reference with Paystack), then places
 *  the order. On success the cart cookie is cleared so the user starts fresh
 *  next time. */
export async function completeCheckout(): Promise<
  { ok: true; orderId: string } | { ok: false; error: string; cartId?: string }
> {
  const cartId = await readCartId();
  if (!cartId) {
    // No active cart — most likely the browser came BACK onto the Paystack
    // callback after the order was already placed (we clear the cart cookie on
    // success). If we remember that order, send the user to its confirmation
    // instead of an error.
    const store = await cookies();
    const lastOrderId = store.get(LAST_ORDER_COOKIE)?.value;
    if (lastOrderId) return { ok: true, orderId: lastOrderId };
    return { ok: false, error: "Your checkout session has expired." };
  }

  try {
    const result = await sdk.store.cart.complete(cartId);
    if (result.type === "order") {
      await rememberLastOrder(result.order.id);
      await clearCartCookie();
      revalidatePath("/cart");
      return { ok: true, orderId: result.order.id };
    }
    // type === "cart" → an error happened during placement.
    console.error("[checkout] complete returned cart-with-error:", result);
    return {
      ok: false,
      cartId,
      error: result.error?.message ?? "We couldn't place your order. Please try again.",
    };
  } catch (err) {
    console.error("[checkout] completeCheckout failed:", err);
    return { ok: false, cartId, error: "We couldn't place your order. Please try again." };
  }
}
