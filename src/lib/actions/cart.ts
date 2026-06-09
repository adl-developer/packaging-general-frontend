"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";

/**
 * Guest cart persistence.
 *
 * The Medusa cart id lives in an httpOnly cookie. As long as the browser keeps
 * the cookie, the guest's cart survives reloads, new tabs, and revisits within
 * the cookie window — no login required.
 *
 * Reliability rules:
 *  - Sliding expiry: every cart mutation re-writes the cookie with a fresh
 *    90-day maxAge, so active guests don't lose their cart.
 *  - Stale-cart cleanup: a completed cart (post-checkout) or a cart id Medusa
 *    no longer knows about clears the cookie on next access, so the user
 *    starts fresh instead of seeing ghost items.
 */
const CART_COOKIE = "pg_cart_id";
const CART_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: CART_TTL_SECONDS,
  path: "/",
};

const CART_FIELDS =
  "id,email,currency_code,metadata,*items,*items.variant,*items.variant.options,items.variant.options.option.title,*items.product,region,*shipping_address,*billing_address,*shipping_methods,*promotions,*payment_collection,payment_collection.payment_sessions,total,subtotal,tax_total,discount_total,shipping_total,item_total,item_subtotal,item_tax_total,completed_at";

async function readCartId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value;
}

/**
 * Set/refresh the cart cookie. Wrapped in try/catch because cookies are
 * writable in Server Actions and Route Handlers but not in Server Components
 * — getCart() runs in both contexts.
 */
async function writeCartId(id: string) {
  try {
    const store = await cookies();
    store.set(CART_COOKIE, id, COOKIE_OPTS);
  } catch {
    // Server-component read path — cleanup happens on the next mutation.
  }
}

async function clearCartId() {
  try {
    const store = await cookies();
    store.delete(CART_COOKIE);
  } catch {
    // Same as above — non-fatal in read context.
  }
}

/** Read the current cart (if any). Returns null when missing, invalid, or completed. */
export async function getCart(): Promise<HttpTypes.StoreCart | null> {
  const id = await readCartId();
  if (!id) return null;
  try {
    const { cart } = await sdk.store.cart.retrieve(id, {
      fields: CART_FIELDS,
    });
    // Cart was checked out — don't keep handing it back. Next add starts fresh.
    if (cart.completed_at) {
      await clearCartId();
      return null;
    }
    return cart;
  } catch (err) {
    console.error("[cart] retrieve failed; clearing cookie:", err);
    await clearCartId();
    return null;
  }
}

/** Lightweight line count for the header badge — fetches only item ids so the
 *  global header doesn't pay for the full cart payload on every request. */
export async function getCartLineCount(): Promise<number> {
  const id = await readCartId();
  if (!id) return 0;
  try {
    const { cart } = await sdk.store.cart.retrieve(id, {
      fields: "id,completed_at,items.id",
    });
    if (cart.completed_at) return 0;
    return cart.items?.length ?? 0;
  } catch {
    // Badge is cosmetic — never let it break the page. Cookie cleanup happens
    // on the next full getCart().
    return 0;
  }
}

export type PromoResult =
  | { ok: true; discountTotal: number }
  | { ok: false; error: string };

/** Apply a promotion code to the cart. Depending on the Medusa version an
 *  unknown code either 400s (caught below) or is silently dropped from the
 *  cart's promotions — both paths report "Invalid discount code". */
export async function applyPromoCode(code: string): Promise<PromoResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Enter a discount code" };

  const cart = await getCart();
  if (!cart) return { ok: false, error: "Your cart is empty" };

  const existing = (cart.promotions ?? [])
    .map((p) => p.code)
    .filter((c): c is string => !!c);
  if (existing.includes(normalized)) {
    return { ok: true, discountTotal: Number(cart.discount_total ?? 0) };
  }

  try {
    const { cart: updated } = await sdk.store.cart.update(
      cart.id,
      { promo_codes: [...existing, normalized] },
      { fields: CART_FIELDS }
    );
    const applied = (updated.promotions ?? []).some(
      (p) => p.code === normalized
    );
    if (!applied) return { ok: false, error: "Invalid discount code" };

    revalidatePath("/cart");
    revalidatePath("/checkout/payment");
    return { ok: true, discountTotal: Number(updated.discount_total ?? 0) };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 400 || status === 404) {
      return { ok: false, error: "Invalid discount code" };
    }
    console.error("[cart] applyPromoCode failed:", err);
    return { ok: false, error: "Couldn't apply the code — please try again" };
  }
}

/** Remove an applied promotion code from the cart. */
export async function removePromoCode(code: string): Promise<PromoResult> {
  const cart = await getCart();
  if (!cart) return { ok: false, error: "Your cart is empty" };

  const remaining = (cart.promotions ?? [])
    .map((p) => p.code)
    .filter((c): c is string => !!c && c !== code);

  try {
    const { cart: updated } = await sdk.store.cart.update(
      cart.id,
      { promo_codes: remaining },
      { fields: CART_FIELDS }
    );
    revalidatePath("/cart");
    revalidatePath("/checkout/payment");
    return { ok: true, discountTotal: Number(updated.discount_total ?? 0) };
  } catch (err) {
    console.error("[cart] removePromoCode failed:", err);
    return { ok: false, error: "Couldn't remove the code — please try again" };
  }
}

/** Internal: return current cart or create a fresh one bound to the Ghana region. */
async function ensureCart(): Promise<HttpTypes.StoreCart> {
  const existing = await getCart();
  if (existing) return existing;

  const { regions } = await sdk.store.region.list();
  const region =
    regions.find((r) => r.currency_code === "ghs") ?? regions[0];
  if (!region) {
    throw new Error(
      "No region available — has the Medusa backend been seeded for Ghana?"
    );
  }
  const { cart } = await sdk.store.cart.create({ region_id: region.id });
  await writeCartId(cart.id);
  return cart;
}

/** Add a variant to the cart (creating the cart if needed). Returns the updated cart. */
export async function addLineItem(
  variantId: string,
  quantity = 1
): Promise<HttpTypes.StoreCart | null> {
  const cart = await ensureCart();
  await sdk.store.cart.createLineItem(cart.id, {
    variant_id: variantId,
    quantity,
  });
  await writeCartId(cart.id); // sliding expiry
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return getCart();
}

/** Hidden service product holding the one-time printing setup fee variants
 *  (seeded by seed-ghana.ts). */
const PRINT_SETUP_HANDLE = "print-setup";

/** Resolve the setup-fee variant for a printing option value (e.g.
 *  "1-Color Print"). Throws when the product/variant isn't seeded — a printed
 *  order MUST carry its setup fee, silently skipping would undercharge. */
async function findSetupFeeVariant(printingValue: string): Promise<string> {
  const { products } = await sdk.store.product.list({
    handle: PRINT_SETUP_HANDLE,
    fields: "id,*variants,*variants.options,variants.options.option.title",
    limit: 1,
  });
  const variant = products[0]?.variants?.find((v) =>
    (v.options ?? []).some(
      (o) => o.option?.title === "Printing" && o.value === printingValue
    )
  );
  if (!variant) {
    throw new Error(
      `Setup-fee variant for "${printingValue}" not found — has the backend been re-seeded with the enriched product model?`
    );
  }
  return variant.id;
}

/** Add a fully-configured customizer item: the carton variant line plus, for
 *  printed options, the one-time setup-fee line. The setup fee is charged
 *  once per print type in the cart — re-adds don't duplicate or increment it.
 *  Optional notes persist as line-item metadata (visible on the order). */
export async function addConfiguredLineItem(input: {
  variantId: string;
  quantity: number;
  /** Printing option value when the choice carries a setup fee. */
  setupPrintingValue?: string | null;
  notes?: string;
}): Promise<HttpTypes.StoreCart | null> {
  const cart = await ensureCart();
  const notes = input.notes?.trim();

  await sdk.store.cart.createLineItem(cart.id, {
    variant_id: input.variantId,
    quantity: input.quantity,
    ...(notes ? { metadata: { notes } } : {}),
  });

  if (input.setupPrintingValue) {
    const setupVariantId = await findSetupFeeVariant(input.setupPrintingValue);
    const alreadyCharged = (cart.items ?? []).some(
      (item) => item.variant_id === setupVariantId
    );
    if (!alreadyCharged) {
      await sdk.store.cart.createLineItem(cart.id, {
        variant_id: setupVariantId,
        quantity: 1,
      });
    }
  }

  await writeCartId(cart.id); // sliding expiry
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return getCart();
}

/** Set a line item's quantity. Quantity ≤ 0 removes the line. */
export async function updateLineItemQuantity(
  itemId: string,
  quantity: number
): Promise<HttpTypes.StoreCart | null> {
  const id = await readCartId();
  if (!id) return null;
  if (quantity <= 0) {
    await sdk.store.cart.deleteLineItem(id, itemId);
  } else {
    await sdk.store.cart.updateLineItem(id, itemId, { quantity });
  }
  await writeCartId(id); // sliding expiry
  revalidatePath("/cart");
  return getCart();
}

export async function removeLineItem(
  itemId: string
): Promise<HttpTypes.StoreCart | null> {
  const id = await readCartId();
  if (!id) return null;
  await sdk.store.cart.deleteLineItem(id, itemId);
  await writeCartId(id); // sliding expiry
  revalidatePath("/cart");
  return getCart();
}

/** Empty the cart by deleting every line item. Keeps the cart id so the guest
 *  can continue shopping in the same session. */
export async function emptyCart(): Promise<HttpTypes.StoreCart | null> {
  const cart = await getCart();
  if (!cart) return null;
  for (const item of cart.items ?? []) {
    if (item?.id) await sdk.store.cart.deleteLineItem(cart.id, item.id);
  }
  await writeCartId(cart.id); // sliding expiry
  revalidatePath("/cart");
  return getCart();
}
