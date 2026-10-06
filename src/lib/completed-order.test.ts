import { describe, expect, it, vi } from "vitest";
import { findCompletedOrder } from "./completed-order";

const noSleep = vi.fn(async () => {});

describe("findCompletedOrder", () => {
  it("returns the order straight away when the webhook already placed it", async () => {
    const lookup = vi.fn(async () => "order_1");
    expect(await findCompletedOrder(lookup, noSleep, [0, 100])).toBe("order_1");
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("keeps asking while the webhook's completion is still running", async () => {
    const lookup = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("order_2");
    expect(await findCompletedOrder(lookup, noSleep, [0, 10, 10, 10])).toBe("order_2");
    expect(lookup).toHaveBeenCalledTimes(3);
  });

  it("treats a failed lookup as not-yet, not as an answer", async () => {
    const lookup = vi
      .fn<() => Promise<string | null>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce("order_3");
    expect(await findCompletedOrder(lookup, noSleep, [0, 10])).toBe("order_3");
  });

  it("returns null when no order ever appears", async () => {
    const lookup = vi.fn(async () => null);
    const sleep = vi.fn(async () => {});
    expect(await findCompletedOrder(lookup, sleep, [0, 10, 20])).toBeNull();
    expect(lookup).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[10], [20]]);
  });
});
