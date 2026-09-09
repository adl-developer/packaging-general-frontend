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
      deleteLineItem: vi.fn(),
    },
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

import { getCart, getCartForPrefill } from "./cart";

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
