import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Read-path contract for the cart actions. The backend is mocked at the SDK
 * boundary (network); Next's request APIs are mocked because they only exist
 * inside a request. Everything else is the real module.
 */
const jar = vi.hoisted(() => new Map<string, string>());
const sdk = vi.hoisted(() => ({
  store: {
    cart: {
      retrieve: vi.fn(),
      update: vi.fn(),
      deleteLineItem: vi.fn(),
      create: vi.fn(),
      createLineItem: vi.fn(),
    },
    region: { list: vi.fn() },
  },
  client: { fetch: vi.fn() },
}));

vi.mock("@/lib/medusa", () => ({
  sdk,
  authHeaders: (token: string) => ({ authorization: `Bearer ${token}` }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      jar.has(key) ? { name: key, value: jar.get(key)! } : undefined,
    set: (key: string, value: string) => {
      jar.set(key, value);
    },
    delete: (key: string) => {
      jar.delete(key);
    },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Order Acceptance: open unless a test says otherwise.
const ordersArePaused = vi.hoisted(() => vi.fn(async () => false));
vi.mock("@/lib/site-content", () => ({ ordersArePaused }));

import {
  addConfiguredLineItem,
  addLineItem,
  applyPromoCode,
  getCart,
  getCartForPrefill,
  getCartWithChanges,
} from "./cart";
import { CHECKOUT_PAUSED_MESSAGE } from "@/lib/fulfillment-methods";

const liveCart = {
  id: "cart_1",
  completed_at: null,
  email: "ama@example.com",
  metadata: { company_name: "Perf Ltd" },
  shipping_address: null,
  items: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  // The actions log expected failures (404 -> cookie cleanup) via console.error.
  vi.spyOn(console, "error").mockImplementation(() => {});
  jar.clear();
  jar.set("pg_cart_id", "cart_1");
  sdk.store.cart.retrieve.mockResolvedValue({ cart: liveCart });
  sdk.client.fetch.mockImplementation(async (path: string) =>
    path.endsWith("/moq-tiers")
      ? { moq_tiers: { changed: false } }
      : { platform_fee: { changed: false, percent: 0, fixed: 0, amount: 0 } },
  );
});

describe("getCartForPrefill", () => {
  it("reads only the prefill fields and never runs the charge syncs", async () => {
    const cart = await getCartForPrefill();

    expect(cart?.id).toBe("cart_1");
    expect(sdk.store.cart.retrieve).toHaveBeenCalledTimes(1);
    const [, options] = sdk.store.cart.retrieve.mock.calls[0];
    expect(options.fields).toBe(
      "id,email,metadata,completed_at,*shipping_address",
    );
    expect(sdk.client.fetch).not.toHaveBeenCalled();
  });

  it("returns null and drops the cookie for a completed cart", async () => {
    sdk.store.cart.retrieve.mockResolvedValue({
      cart: { ...liveCart, completed_at: "2026-09-09T00:00:00Z" },
    });

    expect(await getCartForPrefill()).toBeNull();
    expect(jar.has("pg_cart_id")).toBe(false);
  });

  it("returns null and drops the cookie when the cart no longer exists", async () => {
    sdk.store.cart.retrieve.mockRejectedValue(
      Object.assign(new Error("Cart id not found"), { status: 404 }),
    );

    expect(await getCartForPrefill()).toBeNull();
    expect(jar.has("pg_cart_id")).toBe(false);
  });

  it("makes no request without a cart cookie", async () => {
    jar.clear();

    expect(await getCartForPrefill()).toBeNull();
    expect(sdk.store.cart.retrieve).not.toHaveBeenCalled();
  });
});

// 2026-10-02: the payment step's sync reports products that changed price or
// weight since they were added (Medusa keeps a line's add-time price).
describe("getCartWithChanges", () => {
  it("passes on the backend's items_changed flag with the synced cart", async () => {
    sdk.client.fetch.mockResolvedValue({
      cart: { ...liveCart, total: 140 },
      sync: { changed: true, items_changed: true },
    });
    const { cart, itemsChanged } = await getCartWithChanges();
    expect(cart?.total).toBe(140);
    expect(itemsChanged).toBe(true);
  });

  it("reads as unchanged when an older backend sends no flag", async () => {
    sdk.client.fetch.mockResolvedValue({ cart: liveCart, sync: { changed: false } });
    expect((await getCartWithChanges()).itemsChanged).toBe(false);
  });

  it("reads as unchanged when the sync fails and the cart is served unsynced", async () => {
    sdk.client.fetch.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));
    const { cart, itemsChanged } = await getCartWithChanges();
    expect(cart?.id).toBe("cart_1");
    expect(itemsChanged).toBe(false);
  });
});

describe("getCart sync policy", () => {
  it("skips both charge syncs when called with { sync: false }", async () => {
    const cart = await getCart({ sync: false });

    expect(cart?.id).toBe("cart_1");
    expect(sdk.store.cart.retrieve).toHaveBeenCalledTimes(1);
    expect(sdk.client.fetch).not.toHaveBeenCalled();
  });

  it("by default runs both charge syncs in ONE request and uses the cart it returns", async () => {
    sdk.client.fetch.mockResolvedValue({
      cart: { ...liveCart, total: 130 },
      sync: { changed: true, moq_tiers: { changed: false }, platform_fee: { changed: true } },
    });

    const cart = await getCart();

    expect(sdk.client.fetch).toHaveBeenCalledTimes(1);
    const [path, init] = sdk.client.fetch.mock.calls[0];
    expect(path).toBe("/store/carts/cart_1/sync");
    expect(init.method).toBe("POST");
    expect(String(init.query.fields)).toMatch(/^id,email,currency_code,metadata,\*items,/);
    expect(String(init.query.fields)).toMatch(/completed_at$/);
    // The sync answers with the cart, so there is no separate read at all.
    expect(sdk.store.cart.retrieve).not.toHaveBeenCalled();
    expect(cart?.total).toBe(130);
  });

  it("falls back to the two single-purpose routes when the backend has no /sync yet", async () => {
    sdk.client.fetch.mockImplementation(async (path: string) => {
      if (path.endsWith("/sync")) {
        throw Object.assign(new Error("Not Found"), { status: 404 });
      }
      return path.endsWith("/moq-tiers")
        ? { moq_tiers: { changed: false } }
        : { platform_fee: { changed: false, percent: 0, fixed: 0, amount: 0 } };
    });

    const cart = await getCart();

    expect(cart?.id).toBe("cart_1");
    const paths = sdk.client.fetch.mock.calls.map(([path]) => path);
    expect(paths).toEqual([
      "/store/carts/cart_1/sync",
      "/store/carts/cart_1/moq-tiers",
      "/store/carts/cart_1/platform-fee",
    ]);
    expect(sdk.store.cart.retrieve).toHaveBeenCalledTimes(1);
  });

  it("serves the cart unsynced (and keeps the cookie) when the sync itself fails", async () => {
    sdk.client.fetch.mockRejectedValue(
      Object.assign(new Error("Internal Server Error"), { status: 500 }),
    );

    const cart = await getCart();

    expect(cart?.id).toBe("cart_1");
    expect(sdk.store.cart.retrieve).toHaveBeenCalledTimes(1);
    expect(sdk.client.fetch).toHaveBeenCalledTimes(1);
    expect(jar.get("pg_cart_id")).toBe("cart_1");
  });
});

describe("adding while orders are paused (Order Acceptance off)", () => {
  it("refuses both add paths before touching the cart", async () => {
    ordersArePaused.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    await expect(addLineItem("variant_1")).rejects.toThrow(CHECKOUT_PAUSED_MESSAGE);
    await expect(
      addConfiguredLineItem({ variantId: "variant_1", quantity: 50 }),
    ).rejects.toThrow(CHECKOUT_PAUSED_MESSAGE);
    expect(sdk.store.cart.createLineItem).not.toHaveBeenCalled();
    expect(sdk.store.cart.create).not.toHaveBeenCalled();
  });
});

describe("addLineItem when the cart has vanished (Sentry STOREFRONT-9)", () => {
  const goneCart = Object.assign(new Error("Cart id not found: cart_1"), { status: 404 });

  beforeEach(() => {
    sdk.store.region.list.mockResolvedValue({ regions: [{ id: "reg_gh", currency_code: "ghs" }] });
    sdk.store.cart.create.mockResolvedValue({ cart: { id: "cart_new" } });
  });

  it("starts a fresh cart and repeats the add instead of failing", async () => {
    sdk.store.cart.createLineItem
      .mockRejectedValueOnce(goneCart)
      .mockResolvedValueOnce({ cart: { ...liveCart, id: "cart_new", items: [] } });

    await addLineItem("variant_1", 2);

    expect(sdk.store.cart.createLineItem).toHaveBeenCalledTimes(2);
    expect(sdk.store.cart.createLineItem.mock.calls[0][0]).toBe("cart_1");
    expect(sdk.store.cart.createLineItem.mock.calls[1][0]).toBe("cart_new");
    expect(jar.get("pg_cart_id")).toBe("cart_new");
  });

  it("does not retry (or drop the cart) when the problem is the variant", async () => {
    const deadVariant = Object.assign(
      new Error("Variants variant_1 do not exist or belong to a product that is not published"),
      { status: 400 },
    );
    sdk.store.cart.createLineItem.mockRejectedValueOnce(deadVariant);

    await expect(addLineItem("variant_1")).rejects.toBe(deadVariant);
    expect(sdk.store.cart.createLineItem).toHaveBeenCalledTimes(1);
    expect(sdk.store.cart.create).not.toHaveBeenCalled();
    expect(jar.get("pg_cart_id")).toBe("cart_1");
  });

  it("gives up after one retry, leaving no stale cookie behind", async () => {
    sdk.store.cart.createLineItem.mockRejectedValue(goneCart);

    await expect(addLineItem("variant_1")).rejects.toBe(goneCart);
    expect(sdk.store.cart.createLineItem).toHaveBeenCalledTimes(2);
    expect(jar.has("pg_cart_id")).toBe(false);
  });
});

describe("applyPromoCode: a valid code Medusa dropped (2026-10-28)", () => {
  // Medusa keeps a code only while it takes money off. A free-delivery code
  // on a GH₵0 delivery is dropped, and the page used to say "Invalid
  // discount code" for it.
  const kindIs = (kind: string | null) =>
    sdk.client.fetch.mockImplementation(async (path: string) =>
      path === "/store/promo-code-kind"
        ? { kind }
        : { cart: liveCart, sync: { changed: false } },
    );
  const dropped = (extra: Record<string, unknown>) =>
    sdk.store.cart.update.mockResolvedValue({
      cart: { ...liveCart, promotions: [], shipping_methods: [], ...extra },
    });

  it("says delivery is already free, as a note, for a free-delivery code on a GH₵0 delivery", async () => {
    kindIs("free_delivery");
    dropped({ shipping_methods: [{ id: "sm_1", amount: 0, name: "Yango Delivery" }] });

    const result = await applyPromoCode("test10");

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/promo-code-kind", {
      query: { code: "TEST10" },
    });
    expect(result).toEqual({
      ok: false,
      error: "Delivery is already free on your order.",
      tone: "info",
    });
  });

  it("explains a free-delivery code on a pickup order", async () => {
    kindIs("free_delivery");
    dropped({
      metadata: { fulfillment_method: "pickup" },
      shipping_methods: [{ id: "sm_1", amount: 0, name: "Store Pickup" }],
    });

    const result = await applyPromoCode("TEST10");

    expect(result).toMatchObject({ ok: false, tone: "info" });
    expect((result as { error: string }).error).toMatch(/pickup/);
  });

  it("keeps 'Invalid discount code' for any other dropped code, or when the lookup fails", async () => {
    kindIs("discount");
    dropped({});
    expect(await applyPromoCode("WELCOME15")).toEqual({
      ok: false,
      error: "Invalid discount code",
      tone: "error",
    });

    sdk.client.fetch.mockImplementation(async (path: string) => {
      if (path === "/store/promo-code-kind") throw Object.assign(new Error("Not Found"), { status: 404 });
      return { cart: liveCart, sync: { changed: false } };
    });
    expect(await applyPromoCode("TEST10")).toMatchObject({ error: "Invalid discount code" });
  });
});
