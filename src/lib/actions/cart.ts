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

/**
 * Slim field set for LINE-ITEM MUTATIONS only (add / qty / remove / empty).
 *
 * Their consumers read exactly: item scalars (id, quantity, unit_price,
 * titles, handles, variant_id), variant options (the "Size: …" spec lines),
 * and product.metadata.service (service-line rendering) — see mapLineItem in
 * cart/map-cart.ts. Asking the mutation to also compute totals, promotions,
 * addresses, shipping methods, and payment sessions roughly doubled its
 * response time (~1s measured), for data nothing on the cart page uses.
 *
 * READS stay on the full CART_FIELDS: getCart() feeds checkout, which needs
 * the payment/shipping/promotion graph (see storefront/CLAUDE.md).
 */
const CART_MUTATION_FIELDS =
  "id,completed_at,*items,*items.variant,*items.variant.options,items.variant.options.option.title,items.product.metadata";

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
    // Self-heal stale line items. A cart can outlive its products — e.g. a
    // re-seed (seed-ghana.ts deletes/recreates products on a model bump) removes
    // the variants an existing cart still references. `cart.retrieve` happily
    // returns such lines (with `variant: null`), but the next `cart.update`
    // (saveContactInfo, promo, address…) triggers Medusa's variant re-validation
    // and 400s ("Variants … do not exist"), dead-ending checkout with no escape.
    // Drop the orphaned lines so the cart stays usable.
    const staleItems = (cart.items ?? []).filter(
      (item) => item.variant_id && !item.variant
    );
    if (staleItems.length) {
      for (const item of staleItems) {
        try {
          await sdk.store.cart.deleteLineItem(cart.id, item.id);
        } catch (err) {
          console.error("[cart] failed to prune stale line item:", err);
        }
      }
      const { cart: refreshed } = await sdk.store.cart.retrieve(id, {
        fields: CART_FIELDS,
      });
      return refreshed;
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

/** True when the SDK error means the cart no longer exists server-side.
 *  This genuinely happens in prod: Medusa's createCartsStep compensation
 *  hard-deletes a cart when a later workflow step fails (observed on the
 *  memory-starved Render instance, 2026-07-16). */
function isCartGone(err: unknown): boolean {
  return (err as { status?: number })?.status === 404;
}

/**
 * Static-data caches (module scope, per server instance).
 *
 * The Ghana region and the print-setup fee variants come from the seed and
 * effectively never change at runtime, yet we were re-fetching them from the
 * backend on cart actions — each fetch is a full backend round-trip (~0.5–1.5s
 * on the current Render box). The TTL keeps a re-seed from wedging a
 * long-lived server instance with stale ids forever.
 */
const STATIC_CACHE_TTL_MS = 10 * 60 * 1000;
let regionCache: { id: string; at: number } | null = null;
const setupVariantCache = new Map<string, { id: string; at: number }>();

/** Resolve (and cache) the id of the GHS region carts are bound to. */
async function getGhanaRegionId(): Promise<string> {
  if (regionCache && Date.now() - regionCache.at < STATIC_CACHE_TTL_MS) {
    return regionCache.id;
  }
  const { regions } = await sdk.store.region.list();
  const region =
    regions.find((r) => r.currency_code === "ghs") ?? regions[0];
  if (!region) {
    throw new Error(
      "No region available — has the Medusa backend been seeded for Ghana?"
    );
  }
  regionCache = { id: region.id, at: Date.now() };
  return region.id;
}

/**
 * Cart id for the add path — WITHOUT a full getCart() retrieve.
 *
 * Adding a line only needs the cart id, and the id is already in the cookie, so
 * a full retrieve (~1 backend round-trip, the heavy CART_FIELDS payload) was
 * pure latency on every Add to Cart. This reads the cookie (zero round-trips)
 * and creates a cart only when there's no cookie. A stale cookie — a completed
 * or workflow-compensation-deleted cart — surfaces as a 4xx on the subsequent
 * createLineItem; the mutation's catch clears the cookie so the user's retry
 * starts clean (see `clearStaleCartOn4xx`).
 */
async function ensureCartId(): Promise<string> {
  const existing = await readCartId();
  if (existing) return existing;
  const { cart } = await sdk.store.cart.create({
    region_id: await getGhanaRegionId(),
  });
  await writeCartId(cart.id);
  return cart.id;
}

/**
 * On an add failure, clear the cart cookie ONLY for a definitive 4xx (the
 * cookie'd cart is gone / completed / invalid) so the retry starts fresh.
 * Network blips (no HTTP status — `fetch failed`/ECONNRESET) keep the cookie:
 * the cart is almost certainly fine, and clearing it would lose the shopper's
 * cart over a transient error.
 */
async function clearStaleCartOn4xx(err: unknown): Promise<void> {
  const status = (err as { status?: number })?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    await clearCartId();
  }
}

/**
 * Eagerly ensure a cart exists — fire-and-forget from the product page on the
 * shopper's first interaction, so their first Add to Cart is a single
 * createLineItem rather than create-cart + create-line on the click path.
 * No-op when a cart cookie already exists.
 */
export async function warmCart(): Promise<void> {
  try {
    await ensureCartId();
  } catch {
    // Non-fatal — the real add will create the cart if this didn't.
  }
}

/** Add a variant to the cart (creating the cart if needed). Returns the updated cart. */
export async function addLineItem(
  variantId: string,
  quantity = 1
): Promise<HttpTypes.StoreCart | null> {
  const cartId = await ensureCartId();
  let updated: HttpTypes.StoreCart;
  try {
    // createLineItem returns the updated cart — asking for the slim mutation
    // fields saves both the extra retrieve AND the totals/payment decoration.
    ({ cart: updated } = await sdk.store.cart.createLineItem(
      cartId,
      { variant_id: variantId, quantity },
      { fields: CART_MUTATION_FIELDS }
    ));
  } catch (err) {
    // A 4xx means the cookie'd cart is gone/completed/invalid — clear it so
    // the retry starts a fresh cart. Callers show error UI.
    await clearStaleCartOn4xx(err);
    throw err;
  }
  await writeCartId(cartId); // sliding expiry
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return updated;
}

/** Hidden service product holding the one-time printing setup fee variants
 *  (seeded by seed-ghana.ts). */
const PRINT_SETUP_HANDLE = "print-setup";

/** Resolve the setup-fee variant for a printing option value (e.g.
 *  "1-Color Print"). Throws when the product/variant isn't seeded — a printed
 *  order MUST carry its setup fee, silently skipping would undercharge.
 *  Cached: the setup-fee product is static seed data. */
async function findSetupFeeVariant(printingValue: string): Promise<string> {
  const cached = setupVariantCache.get(printingValue);
  if (cached && Date.now() - cached.at < STATIC_CACHE_TTL_MS) return cached.id;

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
  setupVariantCache.set(printingValue, { id: variant.id, at: Date.now() });
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
  const cartId = await ensureCartId();
  const notes = input.notes?.trim();

  // The setup-fee lookup doesn't depend on the carton line — run it while the
  // first mutation is in flight instead of after it.
  const setupVariantPromise = input.setupPrintingValue
    ? findSetupFeeVariant(input.setupPrintingValue)
    : null;
  // If the createLineItem below throws before we await this, the rejection
  // must not surface as an unhandledRejection — awaiting it later still throws.
  setupVariantPromise?.catch(() => {});

  let updated: HttpTypes.StoreCart;
  try {
    ({ cart: updated } = await sdk.store.cart.createLineItem(
      cartId,
      {
        variant_id: input.variantId,
        quantity: input.quantity,
        ...(notes ? { metadata: { notes } } : {}),
      },
      { fields: CART_MUTATION_FIELDS }
    ));

    if (setupVariantPromise) {
      const setupVariantId = await setupVariantPromise;
      const alreadyCharged = (updated.items ?? []).some(
        (item) => item.variant_id === setupVariantId
      );
      if (!alreadyCharged) {
        ({ cart: updated } = await sdk.store.cart.createLineItem(
          cartId,
          { variant_id: setupVariantId, quantity: 1 },
          { fields: CART_MUTATION_FIELDS }
        ));
      }
    }
  } catch (err) {
    // A 4xx means the cookie'd cart is gone/completed/invalid — clear it so the
    // retry (the customizer shows "Couldn't add to cart") starts fresh.
    await clearStaleCartOn4xx(err);
    throw err;
  }

  await writeCartId(cartId); // sliding expiry
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return updated;
}

/** Set a line item's quantity. Quantity ≤ 0 removes the line. */
export async function updateLineItemQuantity(
  itemId: string,
  quantity: number
): Promise<HttpTypes.StoreCart | null> {
  const id = await readCartId();
  if (!id) return null;
  let updated: HttpTypes.StoreCart | null;
  try {
    if (quantity <= 0) {
      // The delete response carries the updated cart as `parent` (typed
      // optional) — fall back to a retrieve if it's ever absent.
      const { parent } = await sdk.store.cart.deleteLineItem(id, itemId, {
        fields: CART_MUTATION_FIELDS,
      });
      updated = parent ?? (await getCart());
    } else {
      ({ cart: updated } = await sdk.store.cart.updateLineItem(
        id,
        itemId,
        { quantity },
        { fields: CART_MUTATION_FIELDS }
      ));
    }
  } catch (err) {
    if (isCartGone(err)) {
      // Cart (or just this line) vanished server-side. getCart() resolves
      // which: dead cart → clears the cookie and returns null (the client
      // reverts its optimistic update); live cart → fresh state re-syncs it.
      const fresh = await getCart();
      revalidatePath("/cart");
      return fresh;
    }
    throw err;
  }
  await writeCartId(id); // sliding expiry
  revalidatePath("/cart");
  return updated;
}

export async function removeLineItem(
  itemId: string
): Promise<HttpTypes.StoreCart | null> {
  const id = await readCartId();
  if (!id) return null;
  let updated: HttpTypes.StoreCart | null;
  try {
    const { parent } = await sdk.store.cart.deleteLineItem(id, itemId, {
      fields: CART_MUTATION_FIELDS,
    });
    updated = parent ?? (await getCart());
  } catch (err) {
    if (isCartGone(err)) {
      const fresh = await getCart();
      revalidatePath("/cart");
      return fresh;
    }
    throw err;
  }
  await writeCartId(id); // sliding expiry
  revalidatePath("/cart");
  return updated;
}

/** Empty the cart by deleting every line item. Keeps the cart id so the guest
 *  can continue shopping in the same session. */
export async function emptyCart(): Promise<HttpTypes.StoreCart | null> {
  const cart = await getCart();
  if (!cart) return null;
  const itemIds = (cart.items ?? [])
    .map((item) => item?.id)
    .filter((id): id is string => !!id);
  // Deletes MUST run sequentially — Medusa locks the cart per mutation and a
  // concurrent delete 409s (verified against prod 2026-07-16). The last delete
  // returns the updated cart, saving the trailing retrieve.
  let updated: HttpTypes.StoreCart | null = cart;
  try {
    for (const [index, itemId] of itemIds.entries()) {
      const last = index === itemIds.length - 1;
      const { parent } = await sdk.store.cart.deleteLineItem(
        cart.id,
        itemId,
        last ? { fields: CART_MUTATION_FIELDS } : undefined
      );
      if (last) updated = parent ?? (await getCart());
    }
  } catch (err) {
    if (isCartGone(err)) {
      const fresh = await getCart();
      revalidatePath("/cart");
      return fresh;
    }
    throw err;
  }
  await writeCartId(cart.id); // sliding expiry
  revalidatePath("/cart");
  return updated;
}
