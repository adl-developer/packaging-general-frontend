"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { HttpTypes } from "@medusajs/types";
import { sdk, authHeaders } from "@/lib/medusa";
import { getCart, getCartLineCount, addConfiguredLineItem } from "./cart";
import { getCustomer, signInCustomer, signUpCustomer } from "./auth";
import { getAuthToken } from "@/lib/auth-token";
import { getStockMap } from "@/lib/stock";
import { shortfall } from "@/lib/stock-rules";
import { decideBuyNowRoute, isPrefillComplete } from "@/lib/buy-now";
import { pickShippingOption } from "@/lib/shipping-option";
import {
  parseBuyNowItem,
  type BuyNowAuthState,
  type BuyNowItem,
} from "@/lib/buy-now-auth";
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
    // Not `shipping_options[0]`: a calculated (Yango) option that failed
    // open to GH₵0 must never be attached — see lib/shipping-option.ts.
    const option = pickShippingOption(shipping_options);
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

export type BuyNowResult =
  | { ok: true; route: "payment" }
  | { ok: true; route: "delivery" }
  | { ok: true; route: "cart-with-notice"; notice: string }
  | { ok: false; error: string };

const BUY_NOW_NOTICE =
  "You already have items in your cart. We've added this one — review everything before paying.";

/**
 * Buy Now — see docs/superpowers/specs/2026-07-31-buy-now-design.md.
 *
 * There is only ONE cart per session (§3) — this deliberately does NOT create
 * a second cart or swap the `pg_cart_id` cookie. It adds the item to the
 * existing cart and then routes the customer based on what was already there
 * and whether their account has enough saved to skip straight to payment:
 *
 *   - signed out                     → refused (server-side re-check; the
 *                                       button IS rendered for guests now —
 *                                       a signed-out click opens the auth
 *                                       modal instead — so this guard is the
 *                                       actual access control, not defense
 *                                       in depth over hidden UI)
 *   - cart already had other items   → item added, "cart-with-notice" — the
 *                                       customer reviews everything before
 *                                       paying, never silently charged for
 *                                       items they didn't mean to buy now
 *   - cart was empty, prefill full   → item added + prefill applied,
 *                                       "payment" — lands on /checkout/payment
 *   - cart was empty, prefill short  → item added, "delivery" — no saved
 *                                       address/phone would fail at
 *                                       initiatePaystack with a generic error
 *
 * Reuses the exact same building blocks the cart-based flow uses
 * (addConfiguredLineItem, saveContactInfo, saveDeliveryAddress) — this does
 * NOT touch initiatePaystack's guard chain at all.
 */
export async function buyNow(input: BuyNowItem): Promise<BuyNowResult> {
  // Server-side auth is mandatory — the button now renders for guests too
  // (they get the auth modal), so this is the only real gate.
  const customer = await getCustomer();
  if (!customer) {
    return { ok: false, error: "Please sign in to use Buy Now." };
  }
  return buyNowForSession(input);
}

/**
 * Buy Now core. PRECONDITION: the auth cookie is set for THIS request —
 * either it was already there when buyNow() read it, or buyNowAuth() just
 * set it via signInCustomer() moments earlier in the same server action.
 * This function takes no customer: every downstream call it makes
 * (getCheckoutPrefill, saveContactInfo, saveDeliveryAddress) re-reads the
 * cookie itself via getCustomer(). That read-back works because Next's
 * cookies() proxies a mutable per-request store inside a Server Function —
 * a set() earlier in the action IS visible to a get() later in the same
 * request. If that ever stopped holding, the failure is silent: getCustomer()
 * would return null, isPrefillComplete would be false, and every returning
 * customer would quietly land on /checkout/delivery instead of
 * /checkout/payment. Not exported: every caller must come through one of the
 * two doors above, which are what establish the precondition.
 */
async function buyNowForSession(input: BuyNowItem): Promise<BuyNowResult> {
  // Cart state and prefill completeness are both resolved BEFORE the add, so
  // the routing decision reflects what the customer already had — not the
  // line we're about to add on top of it.
  const [cartLineCount, prefill] = await Promise.all([
    getCartLineCount(),
    getCheckoutPrefill(),
  ]);
  const route = decideBuyNowRoute(true, cartLineCount, isPrefillComplete(prefill));
  if (route === "refused") {
    // Unreachable given the getCustomer() check above — defense in depth only.
    return { ok: false, error: "Please sign in to use Buy Now." };
  }

  try {
    await addConfiguredLineItem({
      variantId: input.variantId,
      quantity: input.quantity,
      setupPrintingValue: input.setupPrintingValue,
      notes: input.notes,
    });
  } catch (err) {
    console.error("[checkout] buyNow add failed:", err);
    return { ok: false, error: "Couldn't add this item. Please try again." };
  }

  if (route === "cart-with-notice") {
    return { ok: true, route: "cart-with-notice", notice: BUY_NOW_NOTICE };
  }

  if (route === "delivery") {
    return { ok: true, route: "delivery" };
  }

  // route === "payment" — the cart was empty and the account has a saved
  // address + phone. Apply them in the SAME order the storefront's own
  // checkout flow requires (email, then shipping_address + shipping method —
  // see storefront/CLAUDE.md) so the cart is payment-ready when we land there.
  // Either save failing sends the customer to /checkout/delivery instead of
  // dumping them at payment with an incomplete cart — the item they came for
  // is already safely added either way.
  const contactResult = await saveContactInfo({
    companyName: prefill.companyName,
    contactPerson: prefill.contactPerson,
    phone: prefill.contactPhone || prefill.deliveryPhone,
    email: prefill.email,
  });
  if (!contactResult.ok) {
    return { ok: true, route: "delivery" };
  }

  const deliveryResult = await saveDeliveryAddress({
    contactName: prefill.deliveryName,
    phone: prefill.deliveryPhone || prefill.contactPhone,
    email: prefill.email,
    address: prefill.address,
    instructions: prefill.instructions,
    lat: prefill.lat,
    lng: prefill.lng,
  });
  if (!deliveryResult.ok) {
    return { ok: true, route: "delivery" };
  }

  return { ok: true, route: "payment" };
}

/**
 * Buy Now from a signed-OUT product page — see
 * docs/superpowers/specs/2026-08-06-buy-now-signed-out-design.md.
 *
 * One action behind the modal's two tabs. The item payload rides along as
 * hidden fields so the customer's configuration survives authentication.
 *
 *   signin + verified    → session, item added, route handed back
 *   signin + unverified  → verify panel; nothing added (no session, no
 *                          confirmed intent yet)
 *   signup               → account created (unverified, no session) and the
 *                          item parked in the GUEST cart, which
 *                          confirmEmailVerification transfers on the verify
 *                          auto-login
 */
export async function buyNowAuth(
  _prev: BuyNowAuthState,
  formData: FormData,
): Promise<BuyNowAuthState> {
  const parsed = parseBuyNowItem({
    variantId: formData.get("variantId") as string | null,
    quantity: formData.get("quantity") as string | null,
    setupPrintingValue: formData.get("setupPrintingValue") as string | null,
    notes: formData.get("notes") as string | null,
  });
  if (!parsed.ok) return { status: "error", error: parsed.error };

  const mode = String(formData.get("mode") || "signin");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    return { status: "error", error: "Email and password are required." };
  }

  if (mode === "signup") {
    const signup = await signUpCustomer({
      fullName: String(formData.get("name") || ""),
      email,
      password,
      company: String(formData.get("company") || ""),
      phoneLocal: String(formData.get("phone") || ""),
    });
    if (signup.status === "error") {
      return { status: "error", error: signup.error };
    }

    // The account exists now, so a failed add must not read as failure of the
    // signup — report it honestly instead and let them re-add after verifying.
    let itemSaved = true;
    try {
      await addConfiguredLineItem(parsed.item);
    } catch (err) {
      console.error("[checkout] buyNowAuth signup add failed:", err);
      itemSaved = false;
    }
    return { status: "pending-verification", email, itemSaved };
  }

  const outcome = await signInCustomer(email, password);
  if (outcome.status === "error") {
    return { status: "error", error: outcome.error };
  }
  if (outcome.status === "unverified") {
    return { status: "unverified", email: outcome.email };
  }

  const result = await buyNowForSession(parsed.item);
  if (!result.ok) return { status: "error", error: result.error };
  return result.route === "cart-with-notice"
    ? { status: "continue", route: "cart-with-notice", notice: result.notice }
    : { status: "continue", route: result.route };
}

interface PaystackSessionData {
  paystackTxRef?: string;
  paystackTxAuthorizationUrl?: string;
  paystackTxAccessCode?: string;
}

/** Unique product ids across the cart's lines — getStockMap's signature
 *  takes product ids, not variant ids (see lib/stock.ts). */
function productIdsFor(cart: HttpTypes.StoreCart): string[] {
  const ids = new Set<string>();
  for (const line of cart.items ?? []) {
    if (line.product_id) ids.add(line.product_id);
  }
  return Array.from(ids);
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

  // Last check before money moves. Narrows — but cannot close — the window
  // between here and cart.complete(); the callback route (layer 3) is what
  // handles stock disappearing while the customer is on Paystack's page.
  //
  // Fail OPEN: a variant absent from `stock` (unknown — e.g. the stock read
  // failed, or the line's variant_id is missing) is `undefined` here, and
  // `state && shortfall(...)` short-circuits without blocking. Service lines
  // (the Printing Setup Fee) are unmanaged, so toStockState gives them
  // `available: null`, and shortfall() never flags a null availability —
  // they're exempt for free, without needing a separate isService check.
  const stock = await getStockMap(productIdsFor(cart));
  for (const line of cart.items ?? []) {
    const state = line.variant_id ? stock.get(line.variant_id) : undefined;
    if (state && shortfall(Number(line.quantity ?? 0), state)) {
      return {
        ok: false,
        error:
          "Some items in your cart are no longer available in that quantity. Please review your cart.",
      };
    }
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
  | { ok: true; orderId: string }
  | { ok: false; error: string; cartId?: string; pending: false }
  | { ok: false; error: string; cartId: string; pending: true }
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
    return { ok: false, error: "Your checkout session has expired.", pending: false };
  }

  try {
    const result = await sdk.store.cart.complete(cartId);
    if (result.type === "order") {
      await rememberLastOrder(result.order.id);
      await clearCartCookie();
      revalidatePath("/cart");
      return { ok: true, orderId: result.order.id };
    }
    // type === "cart" → Medusa's own SOFT error case. Per the backend route
    // (@medusajs/medusa .../store/carts/[id]/complete/route.js) this shape is
    // returned WITHOUT throwing only for error.type PAYMENT_AUTHORIZATION_ERROR
    // or PAYMENT_REQUIRES_MORE_ERROR — i.e. Paystack itself declined the charge
    // or needs another step. No money was taken, so the existing "try again"
    // message is accurate and stays as-is.
    console.error("[checkout] complete returned cart-with-error:", result);
    return {
      ok: false,
      cartId,
      pending: false,
      error: result.error?.message ?? "We couldn't place your order. Please try again.",
    };
  } catch (err) {
    // Anything THROWN here is, by the same route logic, NOT a declined/needs-
    // more payment (those never throw — see above). It's something else that
    // failed after Medusa's cart.complete() workflow started — most likely the
    // manage_inventory/allow_backorder stock guard (insufficient stock), or a
    // completion conflict/system error. Paystack's hosted page already charged
    // the customer BEFORE the browser was even redirected to this callback, so
    // this is exactly the "payment succeeded, order failed" window the whole
    // out-of-stock plan exists to make survivable — never tell this customer
    // to pay again.
    console.error("[checkout] completeCheckout failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      cartId,
      pending: true,
      error: message.slice(0, 2000),
    };
  }
}

/**
 * Fire-and-forget alert to staff when `completeCheckout` hits the `pending`
 * branch above (payment likely succeeded, order wasn't created). Posts to the
 * backend's public `/store/order-completion-failed` route (rate-limited per
 * cart_id, zod-validated, always 200s, never throws — see
 * backend/src/api/store/order-completion-failed/route.ts).
 *
 * MUST NEVER throw and must never be awaited into blocking the customer's
 * redirect for long — a failure to notify must never make the customer's
 * outcome worse than the reassuring page they already land on.
 */
export async function notifyOrderCompletionFailed(input: {
  reference: string;
  cartId: string;
  reason?: string;
}): Promise<void> {
  try {
    await sdk.client.fetch("/store/order-completion-failed", {
      method: "POST",
      body: {
        reference: input.reference,
        cart_id: input.cartId,
        reason: input.reason ?? null,
      },
    });
  } catch (err) {
    // Swallow on purpose — see the doc comment above.
    console.error("[checkout] notifyOrderCompletionFailed failed:", err);
  }
}
