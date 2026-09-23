/**
 * The charge breakdown — ONE ladder for every surface that shows what a cart
 * or order costs (client, 2026-09-23):
 *
 *   Subtotal → Discount → Delivery → Platform Fee → VAT → NHIL → GETFund → Total
 *
 * Lines above the levies are BEFORE tax and the levies sit on top, so the rows
 * add up to the Total exactly. Zero lines are hidden, except Subtotal, Total
 * and a pickup order's "Pickup · Free".
 *
 * ⚠ Twin of `backend/src/utils/charge-breakdown.ts` — same rules, same
 * rounding. Orders come with the backend's rows already built (order lookup
 * → `breakdown.rows`); this one is for the LIVE cart (cart page, payment
 * summary) and for the few order reads that go through the SDK directly.
 * Change both together.
 *
 * Pure and client-safe — the cart page recomputes it on every optimistic
 * quantity change. Never import `next/cache` or the SDK here.
 *
 * Inputs are Medusa's *_subtotal fields: `item_total` / `shipping_total` /
 * `discount_total` INCLUDE tax. For tax-exclusive lines,
 *   item_subtotal − discount_subtotal + shipping_subtotal + tax_total = total
 * (verified against Medusa's own totals code). Tax is derived as
 * `total − every line above it`, so the rows foot to the pesewa even though
 * Medusa's totals are unrounded.
 */

export type LevyKey = "vat" | "nhil" | "getfund";
export type LevyPoints = { vat: number; nhil: number; getfund: number };

/** VAT 15 + NHIL 2.5 + GETFund 2.5 (Act 1151, from 2026-01-01) — the
 *  fallback when the configured split can't be read. */
export const STATUTORY_LEVIES: LevyPoints = { vat: 15, nhil: 2.5, getfund: 2.5 };

const LEVY_NAMES: Record<LevyKey, string> = {
  vat: "VAT",
  nhil: "NHIL",
  getfund: "GETFund",
};
const LEVY_ORDER: LevyKey[] = ["vat", "nhil", "getfund"];

export type ChargeRowKey =
  | "subtotal"
  | "discount"
  | "delivery"
  | "platform_fee"
  | LevyKey
  | "tax"
  | "total";

export interface ChargeRow {
  key: ChargeRowKey;
  label: string;
  /** Always positive; `negative` means the row is subtracted (discount). */
  amount: number;
  negative?: boolean;
  /** A zero-cost pickup row — render "Free". */
  free?: boolean;
}

export interface ChargeBreakdown {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  platformFee: number;
  vat: number;
  nhil: number;
  getfund: number;
  taxTotal: number;
  total: number;
  rows: ChargeRow[];
}

export interface ChargeBreakdownInput {
  /** Medusa `item_subtotal` — before tax/discount, INCLUDES the fee line. */
  itemSubtotal: number;
  /** Before-tax platform fee (`platformFeeTotal`). */
  platformFee?: number;
  /** Medusa `shipping_subtotal`. */
  shippingSubtotal: number;
  /** Medusa `discount_subtotal`. */
  discountSubtotal?: number;
  /** Medusa `total`. */
  total: number;
  method?: "delivery" | "pickup";
  /** e.g. the promo code. */
  discountLabel?: string | null;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function formatRate(points: number): string {
  return String(Math.round(points * 100) / 100);
}

/** A usable split from an untrusted payload, or null. */
export function coerceLevies(raw: unknown): LevyPoints | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out = { vat: Number(r.vat), nhil: Number(r.nhil), getfund: Number(r.getfund) };
  return [out.vat, out.nhil, out.getfund].every((n) => Number.isFinite(n) && n >= 0)
    ? out
    : null;
}

/** Split `tax` by the configured rates; the last non-zero levy takes the
 *  rounding remainder so the amounts always sum to `tax`. */
export function splitLevies(
  tax: number,
  points: LevyPoints,
): { key: LevyKey; label: string; amount: number }[] {
  const keys = LEVY_ORDER.filter((k) => (Number(points[k]) || 0) > 0);
  const totalPoints = keys.reduce((s, k) => s + Number(points[k]), 0);
  let allocated = 0;
  return LEVY_ORDER.map((key) => {
    const rate = Math.max(0, Number(points[key]) || 0);
    let amount = 0;
    if (rate > 0 && totalPoints > 0) {
      amount =
        key === keys[keys.length - 1]
          ? round2(tax - allocated)
          : round2((tax * rate) / totalPoints);
      allocated = round2(allocated + amount);
    }
    return { key, label: `${LEVY_NAMES[key]} (${formatRate(rate)}%)`, amount };
  });
}

export function chargeBreakdown(
  input: ChargeBreakdownInput,
  points: LevyPoints = STATUTORY_LEVIES,
): ChargeBreakdown {
  const platformFee = round2(input.platformFee ?? 0);
  const subtotal = round2(round2(input.itemSubtotal) - platformFee);
  const discount = round2(input.discountSubtotal ?? 0);
  const deliveryFee = round2(input.shippingSubtotal);
  const total = round2(input.total);
  const beforeTax = round2(subtotal - discount + deliveryFee + platformFee);
  const taxTotal = Math.max(0, round2(total - beforeTax));

  const levies = splitLevies(taxTotal, points);
  const leviesSum = round2(levies.reduce((s, l) => s + l.amount, 0));
  const byKey = (k: LevyKey) => levies.find((l) => l.key === k)?.amount ?? 0;

  const rows: ChargeRow[] = [{ key: "subtotal", label: "Subtotal", amount: subtotal }];
  if (discount > 0) {
    rows.push({
      key: "discount",
      label: input.discountLabel ? `Discount (${input.discountLabel})` : "Discount",
      amount: discount,
      negative: true,
    });
  }
  if (input.method === "pickup") {
    rows.push({ key: "delivery", label: "Pickup", amount: deliveryFee, free: deliveryFee === 0 });
  } else if (deliveryFee > 0) {
    // Just "Delivery" — the courier/method name isn't a charge detail
    // (client, 2026-09-23).
    rows.push({ key: "delivery", label: "Delivery", amount: deliveryFee });
  }
  if (platformFee > 0) {
    rows.push({ key: "platform_fee", label: "Platform Fee", amount: platformFee });
  }
  for (const l of levies) {
    if (l.amount > 0) rows.push({ key: l.key, label: l.label, amount: l.amount });
  }
  if (taxTotal > 0 && leviesSum === 0) {
    rows.push({ key: "tax", label: "Tax", amount: taxTotal });
  }
  rows.push({ key: "total", label: "Total", amount: total });

  return {
    subtotal,
    discount,
    deliveryFee,
    platformFee,
    vat: byKey("vat"),
    nhil: byKey("nhil"),
    getfund: byKey("getfund"),
    taxTotal,
    total,
    rows,
  };
}

/** Rows from an untrusted API payload (order lookup's `breakdown.rows`), or
 *  null when absent/malformed — callers then compute their own. */
export function coerceRows(raw: unknown): ChargeRow[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const rows: ChargeRow[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const o = r as Record<string, unknown>;
    if (typeof o.key !== "string" || typeof o.label !== "string") return null;
    const amount = Number(o.amount);
    if (!Number.isFinite(amount)) return null;
    rows.push({
      key: o.key as ChargeRowKey,
      label: o.label,
      amount,
      ...(o.negative === true ? { negative: true } : {}),
      ...(o.free === true ? { free: true } : {}),
    });
  }
  return rows;
}
