import {
  toStockState,
  type StockState,
  type VariantStockFields,
} from "@/lib/stock-rules";

/**
 * Live stock, deliberately kept OUT of lib/products.ts.
 *
 * That module memoises the catalog for 5 minutes on the stated assumption that
 * "products are seed data that effectively never change at runtime". That is
 * true of names, prices and options — and FALSE of stock. Folding inventory
 * into those cached fetches would serve stock up to 5 minutes stale, and the
 * cache is per server instance, so Vercel lambdas would disagree with each
 * other. A customer would see "in stock", add to cart, and be blocked at
 * checkout: exactly the failure this feature exists to prevent.
 *
 * So: separate request, no cache, small payload (no prices, no options, no
 * region needed).
 *
 * Do NOT use `sdk.store.product.list` here. Verified against the installed
 * SDK (node_modules/@medusajs/js-sdk/dist/esm/store/index.d.ts:338):
 *   list: (query?: HttpTypes.StoreProductListParams, headers?: ClientHeaders) => Promise<...>
 * — exactly two parameters, no fetch-options bag, so there is no way to pass
 * `cache: "no-store"` through it. Since an accidentally-cached stock read
 * silently defeats this entire feature, this one call uses raw `fetch`, where
 * the cache semantics are explicit and visible.
 */
const STOCK_FIELDS =
  "id,variants.id,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

/** Keyed by VARIANT id. Empty map = "unknown", which callers treat as in stock. */
export async function getStockMap(productIds: string[]): Promise<Map<string, StockState>> {
  const out = new Map<string, StockState>();
  if (!productIds.length) return out;
  try {
    const params = new URLSearchParams({
      fields: STOCK_FIELDS,
      limit: String(productIds.length),
    });
    for (const id of productIds) params.append("id", id);

    const res = await fetch(`${BACKEND_URL}/store/products?${params}`, {
      headers: {
        "x-publishable-api-key":
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
      },
      // The whole point of this module. Next 15+ defaults fetch to no-store,
      // but relying on a framework default for the one value that makes this
      // feature correct is not worth the risk — state it explicitly.
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`stock fetch failed: ${res.status}`);
    const { products } = (await res.json()) as {
      products: Array<{
        id: string;
        variants?: Array<VariantStockFields & { id?: string }>;
      }>;
    };
    for (const p of products) {
      for (const v of p.variants ?? []) {
        if (v.id) out.set(v.id, toStockState(v));
      }
    }
  } catch (err) {
    // Fail OPEN on purpose — see the Global Constraints. Medusa still refuses a
    // genuinely short order at cart.complete(), so the money path stays safe;
    // blocking the entire catalog over one auxiliary request would turn a
    // backend blip into a total shop outage.
    console.error("[getStockMap] stock unavailable, treating as in stock:", err);
  }
  return out;
}

export async function getStockForProduct(productId: string): Promise<Map<string, StockState>> {
  return getStockMap([productId]);
}
