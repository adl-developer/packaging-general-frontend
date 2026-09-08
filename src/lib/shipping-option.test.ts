import { describe, expect, it } from "vitest";
import {
  isUsableShippingOption,
  pickShippingOption,
  shippingOptionPrice,
} from "./shipping-option";

const flat = { id: "so_flat", price_type: "flat", amount: 30 };
const yangoOk = {
  id: "so_yango",
  price_type: "calculated",
  amount: 43.2,
  calculated_price: { calculated_amount: 43.2 },
};
const yangoFailedOpen = {
  id: "so_yango_0",
  price_type: "calculated",
  amount: 0,
  calculated_price: { calculated_amount: 0 },
};
const yangoUnpriced = { id: "so_yango_np", price_type: "calculated", amount: null };

describe("pickShippingOption", () => {
  it("prefers a priced calculated (Yango) option even when a flat one is listed first", () => {
    expect(pickShippingOption([flat, yangoOk])?.id).toBe("so_yango");
    expect(pickShippingOption([yangoOk, flat])?.id).toBe("so_yango");
  });

  it("falls back to the flat option when the calculated one has no price", () => {
    expect(pickShippingOption([yangoUnpriced, flat])?.id).toBe("so_flat");
    expect(pickShippingOption([flat, yangoUnpriced])?.id).toBe("so_flat");
  });

  it("never attaches a calculated option priced at zero", () => {
    expect(pickShippingOption([yangoFailedOpen, flat])?.id).toBe("so_flat");
    expect(pickShippingOption([yangoFailedOpen])).toBeNull();
  });

  it("handles empty and missing lists", () => {
    expect(pickShippingOption([])).toBeNull();
    expect(pickShippingOption(undefined)).toBeNull();
  });
});

describe("price reading", () => {
  it("prefers the calculated amount, then the flat amount", () => {
    expect(shippingOptionPrice(yangoOk)).toBe(43.2);
    expect(shippingOptionPrice(flat)).toBe(30);
    expect(shippingOptionPrice({ id: "x" })).toBeNull();
  });

  it("a flat option is usable even at zero (free delivery is a real rate)", () => {
    expect(isUsableShippingOption({ id: "free", price_type: "flat", amount: 0 })).toBe(true);
    expect(isUsableShippingOption(yangoFailedOpen)).toBe(false);
  });
});
