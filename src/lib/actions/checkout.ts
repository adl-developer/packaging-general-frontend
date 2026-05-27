"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";
import { getCart } from "./cart";

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
const PAYSTACK_PROVIDER_ID = "pp_paystack";

async function readCartId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value;
}

async function clearCartCookie() {
  const store = await cookies();
  store.delete(CART_COOKIE);
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
  try {
    await sdk.store.cart.update(id, {
      email: input.email,
      metadata: {
        company_name: input.companyName,
        contact_person: input.contactPerson,
        contact_phone: input.phone,
      },
    });
    revalidatePath("/checkout/delivery");
    return { ok: true };
  } catch (err) {
    console.error("[checkout] saveContactInfo failed:", err);
    return { ok: false, error: "Couldn't save your contact info. Please try again." };
  }
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
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = await readCartId();
  if (!id) return { ok: false, error: "Your cart has expired. Please add an item again." };

  const [firstName, ...rest] = input.contactName.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName || "Customer";

  const address: HttpTypes.StoreAddAddress = {
    first_name: firstName || "Customer",
    last_name: lastName,
    phone: input.phone,
    address_1: input.address,
    city: "Accra",
    country_code: "gh",
    metadata: { instructions: input.instructions },
  };

  try {
    await sdk.store.cart.update(id, {
      email: input.email,
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

    revalidatePath("/checkout/payment");
    return { ok: true };
  } catch (err) {
    console.error("[checkout] saveDeliveryAddress failed:", err);
    return { ok: false, error: "Couldn't save your delivery details. Please try again." };
  }
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
  if (!cartId) return { ok: false, error: "Your checkout session has expired." };

  try {
    const result = await sdk.store.cart.complete(cartId);
    if (result.type === "order") {
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

/** Convenience server action used as a form action by the callback page after a
 *  successful Paystack redirect. Wraps completeCheckout + redirect so we can
 *  call it from a <form action={...}> with no client JS. */
export async function completeCheckoutAndRedirect() {
  const result = await completeCheckout();
  if (!result.ok) {
    redirect(`/checkout/payment?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/checkout/confirmation?order=${result.orderId}`);
}
