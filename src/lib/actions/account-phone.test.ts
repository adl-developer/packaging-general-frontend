import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ store: { customer: { update: vi.fn() } } }));
const token = vi.hoisted(() => ({ value: "jwt" as string | undefined }));
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);

vi.mock("@/lib/medusa", () => ({
  sdk,
  authHeaders: (t: string) => ({ authorization: `Bearer ${t}` }),
}));
vi.mock("@/lib/auth-token", () => ({ getAuthToken: async () => token.value }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

import { saveAccountPhone } from "./account-phone";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  token.value = "jwt";
  sdk.store.customer.update.mockResolvedValue({});
});

describe("saveAccountPhone", () => {
  it("saves the phone in E.164 and continues to `next`", async () => {
    await expect(
      saveAccountPhone({ error: null }, form({ phone: "024 123 4567", next: "/checkout" })),
    ).rejects.toThrow("NEXT_REDIRECT:/checkout");
    expect(sdk.store.customer.update).toHaveBeenCalledWith(
      { phone: "+233241234567" },
      {},
      { authorization: "Bearer jwt" },
    );
  });

  it("refuses an invalid phone without saving", async () => {
    const out = await saveAccountPhone({ error: null }, form({ phone: "123", next: "/" }));
    expect(out.error).toBeTruthy();
    expect(sdk.store.customer.update).not.toHaveBeenCalled();
  });

  it("never follows an off-site `next`", async () => {
    await expect(
      saveAccountPhone({ error: null }, form({ phone: "0241234567", next: "//evil.com" })),
    ).rejects.toThrow("NEXT_REDIRECT:/account/orders");
  });

  it("keeps the customer on the page when the save fails", async () => {
    sdk.store.customer.update.mockRejectedValue(new Error("boom"));
    const out = await saveAccountPhone({ error: null }, form({ phone: "0241234567", next: "/" }));
    expect(out.error).toMatch(/couldn't save/i);
    expect(redirect).not.toHaveBeenCalled();
  });
});
