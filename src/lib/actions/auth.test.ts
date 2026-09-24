import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Account-settings password actions. The backend is mocked at the SDK
 * boundary; Next's request APIs are mocked because they only exist inside a
 * request. `redirect()` throws like the real one so the control flow is real.
 */
const jar = vi.hoisted(() => new Map<string, string>());
const sdk = vi.hoisted(() => ({
  store: { customer: { retrieve: vi.fn() }, cart: { transferCart: vi.fn() } },
  client: { fetch: vi.fn() },
}));
const authClient = vi.hoisted(() => ({
  auth: { resetPassword: vi.fn() },
}));
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);

vi.mock("@/lib/medusa", () => ({
  sdk,
  createAuthClient: () => authClient,
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
vi.mock("next/navigation", () => ({ redirect }));

import { changeAccountPassword, sendAccountResetLink } from "./auth";

const AUTH_COOKIE = "_medusa_jwt";
const IDLE = { ok: false, error: null };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  jar.clear();
  jar.set(AUTH_COOKIE, "old.jwt.token");
  sdk.client.fetch.mockResolvedValue({ changed: true, token: "fresh.jwt.token" });
});

describe("changeAccountPassword", () => {
  it("posts to the account password route and swaps the session cookie for the fresh token", async () => {
    const state = await changeAccountPassword(
      IDLE,
      form({
        current_password: "old-secret-1",
        new_password: "new-secret-22",
        confirm: "new-secret-22",
      }),
    );

    expect(state).toEqual({ ok: true, error: null });
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/account/password", {
      method: "POST",
      body: { current_password: "old-secret-1", new_password: "new-secret-22" },
      headers: { authorization: "Bearer old.jwt.token" },
    });
    expect(jar.get(AUTH_COOKIE)).toBe("fresh.jwt.token");
  });

  it("rejects a short new password before calling the backend", async () => {
    const state = await changeAccountPassword(
      IDLE,
      form({ current_password: "old-secret-1", new_password: "short", confirm: "short" }),
    );
    expect(state.ok).toBe(false);
    expect(state.error).toMatch(/at least 8/);
    expect(sdk.client.fetch).not.toHaveBeenCalled();
  });

  it("rejects a mismatched confirmation before calling the backend", async () => {
    const state = await changeAccountPassword(
      IDLE,
      form({
        current_password: "old-secret-1",
        new_password: "new-secret-22",
        confirm: "new-secret-23",
      }),
    );
    expect(state.error).toMatch(/don't match/);
    expect(sdk.client.fetch).not.toHaveBeenCalled();
  });

  it("rejects a new password equal to the current one before calling the backend", async () => {
    const state = await changeAccountPassword(
      IDLE,
      form({
        current_password: "same-secret-1",
        new_password: "same-secret-1",
        confirm: "same-secret-1",
      }),
    );
    expect(state.error).toMatch(/different/);
    expect(sdk.client.fetch).not.toHaveBeenCalled();
  });

  it("maps a 401 to 'Incorrect password.' and keeps the session", async () => {
    sdk.client.fetch.mockRejectedValue(Object.assign(new Error("Unauthorized"), { status: 401 }));

    const state = await changeAccountPassword(
      IDLE,
      form({ current_password: "wrong", new_password: "new-secret-22", confirm: "new-secret-22" }),
    );

    expect(state).toEqual({ ok: false, error: "Incorrect password." });
    expect(jar.get(AUTH_COOKIE)).toBe("old.jwt.token");
  });

  it("drops the dead session and sends the customer to sign in when no fresh token came back", async () => {
    sdk.client.fetch.mockResolvedValue({ changed: true, token: null });

    await expect(
      changeAccountPassword(
        IDLE,
        form({ current_password: "old-secret-1", new_password: "new-secret-22", confirm: "new-secret-22" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/sign-in?password=changed");
    expect(jar.has(AUTH_COOKIE)).toBe(false);
  });

  it("sends a signed-out visitor to sign in without calling the backend", async () => {
    jar.delete(AUTH_COOKIE);
    await expect(
      changeAccountPassword(
        IDLE,
        form({ current_password: "old-secret-1", new_password: "new-secret-22", confirm: "new-secret-22" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/sign-in");
    expect(sdk.client.fetch).not.toHaveBeenCalled();
  });
});

describe("sendAccountResetLink", () => {
  it("requests a reset link for the SESSION's email (no form input is read)", async () => {
    sdk.store.customer.retrieve.mockResolvedValue({ customer: { email: "ama@example.com" } });
    authClient.auth.resetPassword.mockResolvedValue(undefined);

    const state = await sendAccountResetLink();

    expect(state).toEqual({ ok: true, error: null });
    expect(authClient.auth.resetPassword).toHaveBeenCalledWith("customer", "emailpass", {
      identifier: "ama@example.com",
      // No request headers under test → no storefront recorded; the backend
      // then links the reset to the primary storefront.
      metadata: {},
    });
  });

  it("surfaces a rate limit as a friendly message", async () => {
    sdk.store.customer.retrieve.mockResolvedValue({ customer: { email: "ama@example.com" } });
    authClient.auth.resetPassword.mockRejectedValue(Object.assign(new Error("429"), { status: 429 }));

    const state = await sendAccountResetLink();

    expect(state.ok).toBe(false);
    expect(state.error).toMatch(/Too many requests/);
  });
});
