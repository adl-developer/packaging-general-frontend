import { describe, expect, it } from "vitest";
import {
  chargeBreakdown,
  coerceLevies,
  coerceRows,
  splitLevies,
} from "./charge-breakdown";

// Same probe cart as the backend twin's tests (Medusa decorateCartTotals):
// goods 3×100 with a 30 discount, fee 13.50, delivery 57.71, 20% on all.
const probe = {
  itemSubtotal: 313.5,
  platformFee: 13.5,
  shippingSubtotal: 57.71,
  discountSubtotal: 30,
  total: 409.452,
  deliveryLabel: "Yango Delivery",
  discountLabel: "PGEASTER10",
};

describe("chargeBreakdown (twin of the backend's)", () => {
  it("produces the same ladder as the backend for the same cart", () => {
    expect(chargeBreakdown(probe).rows.map((r) => [r.label, r.amount])).toEqual([
      ["Subtotal", 300],
      ["Discount (PGEASTER10)", 30],
      ["Delivery (Yango Delivery)", 57.71],
      ["Platform Fee", 13.5],
      ["VAT (15%)", 51.18],
      ["NHIL (2.5%)", 8.53],
      ["GETFund (2.5%)", 8.53],
      ["Total", 409.45],
    ]);
  });

  it("foots to the total", () => {
    const rows = chargeBreakdown(probe).rows;
    const sum = rows
      .filter((r) => r.key !== "total")
      .reduce((s, r) => s + (r.negative ? -r.amount : r.amount), 0);
    expect(Math.round(sum * 100) / 100).toBe(409.45);
  });

  it("hides zero lines (production today: no tax, no fee)", () => {
    const b = chargeBreakdown({
      itemSubtotal: 242.25,
      shippingSubtotal: 57.71,
      total: 299.96,
      deliveryLabel: "Yango Delivery",
    });
    expect(b.rows.map((r) => r.label)).toEqual([
      "Subtotal",
      "Delivery (Yango Delivery)",
      "Total",
    ]);
  });

  it("keeps a free pickup row", () => {
    const b = chargeBreakdown({ itemSubtotal: 50, shippingSubtotal: 0, total: 60, method: "pickup" });
    expect(b.rows[1]).toEqual({ key: "delivery", label: "Pickup", amount: 0, free: true });
  });

  it("follows the configured rates", () => {
    const b = chargeBreakdown(
      { itemSubtotal: 100, shippingSubtotal: 0, total: 118 },
      { vat: 15, nhil: 3, getfund: 0 },
    );
    expect(b.rows.map((r) => r.label)).toEqual(["Subtotal", "VAT (15%)", "NHIL (3%)", "Total"]);
  });
});

describe("splitLevies", () => {
  it("gives the remainder to the last non-zero levy", () => {
    expect(splitLevies(0.07, { vat: 15, nhil: 2.5, getfund: 2.5 }).map((l) => l.amount)).toEqual([
      0.05, 0.01, 0.01,
    ]);
  });
});

describe("payload guards", () => {
  it("coerceLevies accepts a valid split only", () => {
    expect(coerceLevies({ vat: 15, nhil: 2.5, getfund: 2.5 })).toEqual({ vat: 15, nhil: 2.5, getfund: 2.5 });
    expect(coerceLevies({ vat: "x" })).toBeNull();
    expect(coerceLevies(null)).toBeNull();
  });

  it("coerceRows rejects malformed rows", () => {
    expect(coerceRows([{ key: "subtotal", label: "Subtotal", amount: 10 }])).toEqual([
      { key: "subtotal", label: "Subtotal", amount: 10 },
    ]);
    expect(coerceRows([{ key: "subtotal", amount: 10 }])).toBeNull();
    expect(coerceRows(undefined)).toBeNull();
  });
});
