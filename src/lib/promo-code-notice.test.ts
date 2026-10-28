import { describe, expect, it } from "vitest";
import {
  DELIVERY_ALREADY_FREE_MESSAGE,
  FREE_DELIVERY_NO_METHOD_MESSAGE,
  FREE_DELIVERY_PICKUP_MESSAGE,
  INVALID_CODE_MESSAGE,
  droppedCodeMessage,
} from "./promo-code-notice";

const delivery = { pickup: false, hasDeliveryMethod: true };

describe("droppedCodeMessage", () => {
  it("says delivery is already free for a free-delivery code on a GH₵0 delivery", () => {
    expect(droppedCodeMessage("free_delivery", delivery)).toEqual({
      error: DELIVERY_ALREADY_FREE_MESSAGE,
      tone: "info",
    });
  });

  it("explains pickup orders have no delivery to discount", () => {
    expect(
      droppedCodeMessage("free_delivery", { pickup: true, hasDeliveryMethod: true }),
    ).toEqual({ error: FREE_DELIVERY_PICKUP_MESSAGE, tone: "info" });
  });

  it("asks for delivery first when none is chosen yet", () => {
    expect(
      droppedCodeMessage("free_delivery", { pickup: false, hasDeliveryMethod: false }),
    ).toEqual({ error: FREE_DELIVERY_NO_METHOD_MESSAGE, tone: "info" });
  });

  it("keeps 'Invalid discount code' for other kinds and unknown codes", () => {
    expect(droppedCodeMessage("discount", delivery)).toEqual({
      error: INVALID_CODE_MESSAGE,
      tone: "error",
    });
    expect(droppedCodeMessage(null, delivery)).toEqual({
      error: INVALID_CODE_MESSAGE,
      tone: "error",
    });
  });

  it("never uses an em dash in customer copy", () => {
    for (const m of [
      DELIVERY_ALREADY_FREE_MESSAGE,
      FREE_DELIVERY_PICKUP_MESSAGE,
      FREE_DELIVERY_NO_METHOD_MESSAGE,
    ]) {
      expect(m).not.toContain("—");
    }
  });
});
