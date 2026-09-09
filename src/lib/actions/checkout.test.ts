import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Critical-path contract for the two checkout server actions. Backend calls
 * are mocked at the SDK boundary; Next request APIs are mocked because they
 * only exist inside a request; `after` is captured so the test can prove work
 * was deferred past the response and then run it.
 */
const jar = vi.hoisted(() => new Map<string, string>());
const scheduled = vi.hoisted(() => [] as Array<() => unknown>);
const sdk = vi.hoisted(() => ({
  store: {
    cart: {
      retrieve: vi.fn(),
      update: vi.fn(),
      addShippingMethod: vi.fn(),
    },
    customer: {
      update: vi.fn(),
      listAddress: vi.fn(),
      updateAddress: vi.fn(),
      createAddress: vi.fn(),
    },
    fulfillment: {
      listCartOptions: vi.fn(),
      calculate: vi.fn(),
    },
  },
  client: { fetch: vi.fn() },
}));

vi.mock("@/lib/medusa", () => ({
  sdk,
  authHeaders: (token: string) => ({ authorization: `Bearer ${token}` }),
  createAuthClient: () => sdk,
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
vi.mock("next/server", () => ({
  after: (callback: () => unknown) => {
    scheduled.push(callback);
  },
}));
vi.mock("./auth", () => ({
  getCustomer: vi.fn(async () => null),
  signInCustomer: vi.fn(),
  signUpCustomer: vi.fn(),
}));
vi.mock("@/lib/stock", () => ({ getStockMap: vi.fn(async () => new Map()) }));

import { revalidatePath } from "next/cache";
import {
  getCheckoutPrefill,
  saveContactInfo,
  saveDeliveryAddress,
} from "./checkout";

// Non-production cookie name (see lib/auth-token.ts).
const AUTH_COOKIE = "_medusa_jwt";

const contact = {
  companyName: "Perf Ltd",
  contactPerson: "Ama Mensah",
  phone: "0244123456",
  email: "ama@example.com",
};

const delivery = {
  contactName: "Ama Mensah",
  phone: "0244123456",
  email: "ama@example.com",
  address: "1 Probe Street, Osu",
  instructions: "Call on arrival",
  lat: 5.6037,
  lng: -0.187,
};

const liveCart = {
  id: "cart_1",
  completed_at: null,
  email: "ama@example.com",
  metadata: { company_name: "Perf Ltd", contact_person: "Ama Mensah" },
  shipping_address: null,
  items: [],
};

async function runScheduled() {
  for (const callback of scheduled.splice(0)) await callback();
}

beforeEach(() => {
  vi.clearAllMocks();
  // The actions log expected failures (404 -> cookie cleanup) via console.error.
  vi.spyOn(console, "error").mockImplementation(() => {});
  jar.clear();
  scheduled.length = 0;
  jar.set("pg_cart_id", "cart_1");
  sdk.store.cart.retrieve.mockResolvedValue({ cart: liveCart });
  sdk.store.cart.update.mockResolvedValue({ cart: liveCart });
  sdk.store.cart.addShippingMethod.mockResolvedValue({ cart: liveCart });
  sdk.store.fulfillment.listCartOptions.mockResolvedValue({
    shipping_options: [{ id: "so_flat", price_type: "flat", amount: 30 }],
  });
  sdk.store.customer.update.mockResolvedValue({ customer: {} });
  sdk.store.customer.listAddress.mockResolvedValue({ addresses: [] });
  sdk.store.customer.updateAddress.mockResolvedValue({ customer: {} });
  sdk.store.customer.createAddress.mockResolvedValue({ customer: {} });
  sdk.client.fetch.mockResolvedValue({});
});

describe("saveContactInfo", () => {
  it("writes the contact details with one cart update and nothing else", async () => {
    const result = await saveContactInfo(contact);

    expect(result).toEqual({ ok: true });
    expect(sdk.store.cart.update).toHaveBeenCalledTimes(1);
    const [id, body] = sdk.store.cart.update.mock.calls[0];
    expect(id).toBe("cart_1");
    expect(body.email).toBe("ama@example.com");
    expect(body.metadata).toMatchObject({
      company_name: "Perf Ltd",
      contact_person: "Ama Mensah",
    });
    expect(String(body.metadata.contact_phone)).toMatch(/^\+233/);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(0);
  });

  it("defers the signed-in profile sync until after the response", async () => {
    jar.set(AUTH_COOKIE, "tok_123");

    const result = await saveContactInfo(contact);

    expect(result).toEqual({ ok: true });
    expect(sdk.store.customer.update).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);

    await runScheduled();

    expect(sdk.store.customer.update).toHaveBeenCalledTimes(1);
    const [payload, , headers] = sdk.store.customer.update.mock.calls[0];
    expect(payload.company_name).toBe("Perf Ltd");
    expect(String(payload.phone)).toMatch(/^\+233/);
    expect(headers).toEqual({ authorization: "Bearer tok_123" });
  });
});

describe("saveDeliveryAddress", () => {
  it("saves the address, attaches the flat option, and never revalidates", async () => {
    const result = await saveDeliveryAddress(delivery);

    expect(result).toEqual({ ok: true });
    expect(sdk.store.cart.update).toHaveBeenCalledTimes(1);
    const [, body] = sdk.store.cart.update.mock.calls[0];
    expect(body.shipping_address.address_1).toBe("1 Probe Street, Osu");
    expect(body.shipping_address.metadata).toMatchObject({
      instructions: "Call on arrival",
      lat: 5.6037,
      lng: -0.187,
    });
    expect(sdk.store.cart.addShippingMethod).toHaveBeenCalledWith("cart_1", {
      option_id: "so_flat",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(0);
  });

  it("defers the signed-in address upsert: updates the default address after the response", async () => {
    jar.set(AUTH_COOKIE, "tok_123");
    sdk.store.customer.listAddress.mockResolvedValue({
      addresses: [
        { id: "addr_old", is_default_shipping: false },
        { id: "addr_default", is_default_shipping: true },
      ],
    });

    const result = await saveDeliveryAddress(delivery);

    expect(result).toEqual({ ok: true });
    expect(sdk.store.customer.listAddress).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);

    await runScheduled();

    expect(sdk.store.customer.updateAddress).toHaveBeenCalledTimes(1);
    const [id, payload, , headers] =
      sdk.store.customer.updateAddress.mock.calls[0];
    expect(id).toBe("addr_default");
    expect(payload.address_1).toBe("1 Probe Street, Osu");
    expect(headers).toEqual({ authorization: "Bearer tok_123" });
    expect(sdk.store.customer.createAddress).not.toHaveBeenCalled();
  });

  it("defers the signed-in address upsert: creates a default address when none exists", async () => {
    jar.set(AUTH_COOKIE, "tok_123");

    await saveDeliveryAddress(delivery);
    await runScheduled();

    expect(sdk.store.customer.createAddress).toHaveBeenCalledTimes(1);
    const [payload] = sdk.store.customer.createAddress.mock.calls[0];
    expect(payload.is_default_shipping).toBe(true);
    expect(payload.address_1).toBe("1 Probe Street, Osu");
    expect(sdk.store.customer.updateAddress).not.toHaveBeenCalled();
  });
});

describe("getCheckoutPrefill", () => {
  it("reads the cart with the slim prefill fields and runs no charge sync", async () => {
    const prefill = await getCheckoutPrefill();

    expect(prefill.email).toBe("ama@example.com");
    expect(prefill.companyName).toBe("Perf Ltd");
    expect(sdk.store.cart.retrieve).toHaveBeenCalledTimes(1);
    const [, options] = sdk.store.cart.retrieve.mock.calls[0];
    expect(options.fields).toBe(
      "id,email,metadata,completed_at,*shipping_address",
    );
    expect(sdk.client.fetch).not.toHaveBeenCalled();
  });
});
