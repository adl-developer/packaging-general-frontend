import { unstable_cache } from "next/cache";
import { sdk } from "@/lib/medusa";
import { CACHE_TAGS } from "@/lib/revalidate";
import {
  CROSS_SELL_ITEMS,
  DETAIL_FIELDS,
  SAMPLE_PRODUCTS,
  isServiceProduct,
  toFullProduct,
  toSummary,
  type CrossSellProduct,
  type Product,
  type ProductSummary,
} from "@/lib/products";

/**
 * Catalogue readers — server only.
 *
 * Every reader here is wrapped in Next's shared Data Cache (`unstable_cache`),
 * which on Vercel is one cache for every function instance, not a Map inside
 * each lambda. Before 2026-09-09 the catalogue was memoised per instance for
 * five minutes: with a dozen instances serving one visitor in a quarter hour,
 * most page views paid the full backend round trip anyway.
 *
 * Entries live an hour and carry a tag; the backend calls
 * `POST /api/revalidate` with that tag whenever a product, variant or
 * category is saved, so admin edits still show within seconds. Only SUCCESSFUL
 * reads are cached: every loader THROWS on a backend failure or an empty
 * result, and `unstable_cache` never stores a rejection — the public
 * functions catch and apply the same fallbacks as before (sample products,
 * null, empty list).
 *
 * This module is deliberately separate from `lib/products.ts`, which the
 * client-side customizer imports for its pure helpers: `next/cache` is a
 * server-only API and must not enter a client bundle.
 *
 * ⚠ Stock is NOT here and must never be (`lib/stock.ts` reads it live).
 */
const CATALOG_REVALIDATE_SECONDS = 60 * 60;

const cachedRegionId = unstable_cache(
  async (): Promise<string> => {
    const { regions } = await sdk.store.region.list();
    const id = (regions.find((r) => r.currency_code === "ghs") ?? regions[0])?.id;
    if (!id) throw new Error("no region configured");
    return id;
  },
  ["ghana-region-id"],
  { tags: [CACHE_TAGS.catalog], revalidate: 24 * 60 * 60 },
);

/** Ghana region id — needed so the Store API returns GHS calculated prices. */
export async function getRegionId(): Promise<string | undefined> {
  try {
    return await cachedRegionId();
  } catch (err) {
    console.error("[catalog] region lookup failed:", err);
    return undefined;
  }
}

const cachedProductList = unstable_cache(
  async (): Promise<ProductSummary[]> => {
    const region_id = await cachedRegionId();
    const { products: live } = await sdk.store.product.list({
      region_id,
      fields:
        "id,title,handle,description,thumbnail,images.url,metadata,*categories,*variants,variants.calculated_price",
      limit: 100,
    });
    const browsable = live.filter((p) => !isServiceProduct(p));
    // An empty catalogue is the sample-data case — never cache it.
    if (!browsable.length) throw new Error("catalogue is empty");
    return browsable.map(toSummary);
  },
  ["list-products"],
  { tags: [CACHE_TAGS.catalog], revalidate: CATALOG_REVALIDATE_SECONDS },
);

/** Fetch the live catalog for the browse grid. Falls back to the static sample
 *  products (Figma Browse frame) if the backend is unreachable, so /products
 *  is never empty in dev or when Medusa is down. Service products (print-setup
 *  fee) are excluded. */
export async function listProducts(): Promise<ProductSummary[]> {
  try {
    return await cachedProductList();
  } catch (err) {
    console.error("[listProducts] Medusa unreachable; using sample products:", err);
    return SAMPLE_PRODUCTS;
  }
}

const cachedProductBySlug = unstable_cache(
  async (slug: string): Promise<Product | null> => {
    const region_id = await cachedRegionId();
    const { products: live } = await sdk.store.product.list({
      region_id,
      handle: slug,
      fields: DETAIL_FIELDS,
      limit: 1,
    });
    const p = live[0];
    // A miss IS cached (the backend confirmed there is no such product); a
    // newly created product invalidates the catalog tag, so it never hides
    // one for long.
    return !p || isServiceProduct(p) ? null : toFullProduct(p);
  },
  ["product-by-slug"],
  { tags: [CACHE_TAGS.catalog], revalidate: CATALOG_REVALIDATE_SECONDS },
);

/** Fetch a single product by handle (slug) for the detail page. Returns null
 *  on miss or backend error. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    return await cachedProductBySlug(slug);
  } catch (err) {
    console.error(`[getProductBySlug] failed for "${slug}":`, err);
    return null;
  }
}

const cachedCrossSell = unstable_cache(
  async (): Promise<CrossSellProduct[]> => {
    const region_id = await cachedRegionId();
    const handles = [...new Set(CROSS_SELL_ITEMS.map((i) => i.handle))];
    const { products: live } = await sdk.store.product.list({
      region_id,
      handle: handles,
      fields:
        "id,title,handle,description,metadata,*variants,variants.calculated_price",
      limit: handles.length,
    });
    return CROSS_SELL_ITEMS.map((item): CrossSellProduct | null => {
      const p = live.find((x) => x.handle === item.handle);
      if (!p) return null;
      const variant = item.sku
        ? p.variants?.find((v) => v.sku === item.sku)
        : p.variants?.[0];
      if (!variant) return null;
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      return {
        id: variant.id,
        variantId: variant.id,
        slug: p.handle ?? p.id,
        name: item.name ?? p.title,
        description: p.description ?? "",
        pricePerUnit: variant.calculated_price?.calculated_amount ?? 0,
        unitLabel:
          typeof meta.unit_label === "string" ? meta.unit_label : "per unit",
      };
    }).filter((p): p is CrossSellProduct => p !== null);
  },
  ["cross-sell-products"],
  { tags: [CACHE_TAGS.catalog], revalidate: CATALOG_REVALIDATE_SECONDS },
);

/** Fetch the cross-sell accessory variants with live GHS prices. Returns []
 *  when the backend is unreachable or the accessories aren't seeded — the
 *  cart section hides itself in that case. */
export async function listCrossSellProducts(): Promise<CrossSellProduct[]> {
  try {
    return await cachedCrossSell();
  } catch (err) {
    console.error("[listCrossSellProducts] failed:", err);
    return [];
  }
}
