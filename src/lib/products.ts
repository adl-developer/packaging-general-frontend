// Browse (/products) and the detail customizer are wired to the live Medusa
// catalog (backend import-catalog.ts). One product = one FAMILY (Pizza Box,
// Packaging Tape, …); every variation — size, width, colour, window, board —
// is an option. Option titles stay Size/Material (the combo lookup relies on
// them) while metadata.option_labels carries the display names; materials/
// printing/tier descriptors are mirrored in product metadata. Combos can be
// SPARSE (White RSC only in 400³) — the customizer disables unavailable ones.
// The static `products` array remains ONLY as a browse fallback when the
// backend is unreachable.

import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";

export interface SizeOption {
  /** Option value, e.g. "Small" (legacy/accessory fallback: the variant id). */
  id: string;
  label: string; // e.g. "Small (30×20×15cm)"
  dimensions: string; // e.g. "300 × 200 × 150 mm" ("" = no box dims)
}

export interface MaterialOption {
  id: string; // option value, e.g. "Kraft Single Wall"
  label: string;
  description: string;
}

export interface PrintingOption {
  id: string; // option value, e.g. "1-Color Print"
  label: string;
  description: string;
  /** One-time setup charge (GHS). 0 = none. */
  setupFee: number;
  /** Per-unit surcharge (GHS) — already baked into the variant price. */
  perUnit: number;
}

export interface PriceTier {
  minQuantity: number;
  label: string; // e.g. "Bulk discount"
  discountPct: number;
}

/** One sellable variant = a (size, material, printing) combination. */
export interface VariantCombo {
  sizeId: string;
  materialId: string;
  printingId: string;
  variantId: string;
  /** Base-tier GHS unit price for this combo (tier discounts apply on top). */
  unitPrice: number;
}

/** Human labels for the customizer's option sections. The backend keeps the
 *  Medusa option TITLES fixed (Size / Material — the combo lookup relies on
 *  them) and mirrors display labels into metadata.option_labels, so one
 *  product can present "Width × Colour" (tape) and another "Size × Window"
 *  (food box). */
export interface OptionLabels {
  size: string;
  material: string;
}

export interface Product {
  id: string;
  slug: string;
  category: string;
  name: string;
  description: string;
  startingPrice: number;
  moq: number;
  features: string[];
  optionLabels: OptionLabels;
  sizes: SizeOption[];
  /** Empty for products without material choices (accessories, legacy). */
  materials: MaterialOption[];
  /** Empty for products without printing choices. */
  printing: PrintingOption[];
  /** Empty when the product has no volume pricing. */
  tiers: PriceTier[];
  /** Lookup table mapping option selections → variant id + unit price. */
  combos: VariantCombo[];
}

/** Find the variant for a (size, material, printing) selection. Products
 *  without material/printing options use "" for those ids. */
export function resolveCombo(
  product: Pick<Product, "combos">,
  sizeId: string,
  materialId: string,
  printingId: string,
): VariantCombo | undefined {
  return product.combos.find(
    (c) =>
      c.sizeId === sizeId &&
      c.materialId === materialId &&
      c.printingId === printingId,
  );
}

/** The tier a quantity falls into (highest matching minQuantity). */
export function tierFor(
  tiers: PriceTier[],
  quantity: number,
): PriceTier | undefined {
  let match: PriceTier | undefined;
  for (const t of [...tiers].sort((a, b) => a.minQuantity - b.minQuantity)) {
    if (quantity >= t.minQuantity) match = t;
  }
  return match ?? tiers[0];
}

/** "50-199 units" / "1000+ units" — range label for a tier within its list. */
export function tierRangeLabel(tiers: PriceTier[], tier: PriceTier): string {
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  const next = sorted[sorted.indexOf(tier) + 1];
  return next
    ? `${tier.minQuantity}-${next.minQuantity - 1} units`
    : `${tier.minQuantity}+ units`;
}

// ─────────────────────────────────────────────────────────────────────────
// Static fallback data (backend offline) — mirrors the seeded model.
// ─────────────────────────────────────────────────────────────────────────

const CARTON_SIZES: SizeOption[] = [
  { id: "Small", label: "Small (30×20×15cm)", dimensions: "300 × 200 × 150 mm" },
  { id: "Medium", label: "Medium (40×30×20cm)", dimensions: "400 × 300 × 200 mm" },
  { id: "Large", label: "Large (50×40×30cm)", dimensions: "500 × 400 × 300 mm" },
];

const CARTON_MATERIALS: MaterialOption[] = [
  {
    id: "Kraft Single Wall",
    label: "Kraft Single Wall",
    description: "Standard brown kraft paper, 125gsm",
  },
  {
    id: "Kraft Double Wall",
    label: "Kraft Double Wall",
    description: "Extra strength for heavy goods, 200gsm",
  },
];

const CARTON_PRINTING: PrintingOption[] = [
  {
    id: "No Printing",
    label: "No Printing",
    description: "Plain packaging",
    setupFee: 0,
    perUnit: 0,
  },
  {
    id: "1-Color Print",
    label: "1-Color Print",
    description: "Single color logo/text",
    setupFee: 500,
    perUnit: 0.5,
  },
  {
    id: "2-Color Print",
    label: "2-Color Print",
    description: "Two color printing",
    setupFee: 750,
    perUnit: 0.8,
  },
];

const DEFAULT_OPTION_LABELS: OptionLabels = {
  size: "Size",
  material: "Material",
};

const CARTON_TIERS: PriceTier[] = [
  { minQuantity: 50, label: "Base pricing", discountPct: 0 },
  { minQuantity: 200, label: "Bulk discount", discountPct: 5 },
  { minQuantity: 500, label: "Volume discount", discountPct: 10 },
  { minQuantity: 1000, label: "Best pricing", discountPct: 15 },
];

export const products: Product[] = [
  {
    id: "1",
    slug: "shipping-carton",
    category: "Shipping Carton",
    name: "Standard Shipping Carton",
    description: "Durable single-wall carton for general shipping needs",
    startingPrice: 3.5,
    moq: 50,
    features: ["3 sizes available", "3 print options"],
    optionLabels: DEFAULT_OPTION_LABELS,
    sizes: CARTON_SIZES,
    materials: CARTON_MATERIALS,
    printing: CARTON_PRINTING,
    tiers: CARTON_TIERS,
    combos: [],
  },
  {
    id: "2",
    slug: "mailer-box",
    category: "Mailer Box",
    name: "Premium Mailer Box",
    description: "Custom-designed mailer box for e-commerce brands",
    startingPrice: 4.2,
    moq: 50,
    features: ["3 sizes available", "3 print options"],
    optionLabels: DEFAULT_OPTION_LABELS,
    sizes: CARTON_SIZES,
    materials: CARTON_MATERIALS,
    printing: CARTON_PRINTING,
    tiers: CARTON_TIERS,
    combos: [],
  },
  {
    id: "3",
    slug: "folding-carton",
    category: "Folding Carton (FMCG)",
    name: "Folding Carton",
    description: "Retail-ready packaging for food and consumer goods",
    startingPrice: 2.8,
    moq: 100,
    features: ["3 sizes available", "3 print options"],
    optionLabels: DEFAULT_OPTION_LABELS,
    sizes: CARTON_SIZES,
    materials: CARTON_MATERIALS,
    printing: CARTON_PRINTING,
    tiers: CARTON_TIERS,
    combos: [],
  },
  {
    id: "4",
    slug: "export-agro-box",
    category: "Export/Agro Box",
    name: "Export/Agro Box",
    description: "Heavy-duty packaging for agricultural exports and produce",
    startingPrice: 6.5,
    moq: 50,
    features: ["3 sizes available", "3 print options"],
    optionLabels: DEFAULT_OPTION_LABELS,
    sizes: CARTON_SIZES,
    materials: CARTON_MATERIALS,
    printing: CARTON_PRINTING,
    tiers: CARTON_TIERS,
    combos: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Live Medusa catalog. Maps Store API products → storefront shapes.
// ─────────────────────────────────────────────────────────────────────────

/** Subset of fields the browse card needs (from the live catalog). */
export interface ProductSummary {
  id: string;
  slug: string;
  category: string;
  name: string;
  description: string;
  startingPrice: number;
  moq: number;
  features: string[];
}

let cachedRegionId: string | undefined;

/** Ghana region id — needed so the Store API returns GHS calculated prices. */
async function getRegionId(): Promise<string | undefined> {
  if (cachedRegionId) return cachedRegionId;
  const { regions } = await sdk.store.region.list();
  cachedRegionId =
    (regions.find((r) => r.currency_code === "ghs") ?? regions[0])?.id;
  return cachedRegionId;
}

/**
 * Catalog caches (module scope, per server instance).
 *
 * Products/prices are seed data that effectively never change at runtime, yet
 * every /products and /products/[slug] navigation was re-fetching them from
 * Medusa — a full backend round-trip that made "Place Order" feel slow (the
 * detail page fetches TWICE: generateMetadata + the page). A short TTL keeps a
 * re-seed from wedging a long-lived instance with stale data. Only SUCCESSFUL
 * backend responses are cached — a transient failure must not stick.
 */
const CATALOG_TTL_MS = 5 * 60 * 1000;
type Cached<T> = { data: T; at: number };
function fresh<T>(entry: Cached<T> | null | undefined): T | undefined {
  return entry && Date.now() - entry.at < CATALOG_TTL_MS ? entry.data : undefined;
}
let listProductsCache: Cached<ProductSummary[]> | null = null;
const productBySlugCache = new Map<string, Cached<Product | null>>();
let crossSellCache: Cached<CrossSellProduct[]> | null = null;

/** Internal service products (e.g. the print-setup fee) are purchasable but
 *  never browsed directly. */
function isServiceProduct(p: HttpTypes.StoreProduct): boolean {
  return Boolean((p.metadata as Record<string, unknown> | null)?.service);
}

function toSummary(p: HttpTypes.StoreProduct): ProductSummary {
  const prices = (p.variants ?? [])
    .map((v) => v.calculated_price?.calculated_amount)
    .filter((n): n is number => typeof n === "number");
  const meta = (p.metadata ?? {}) as Record<string, unknown>;
  return {
    id: p.id,
    slug: p.handle ?? p.id,
    category: p.categories?.[0]?.name ?? "Packaging",
    name: p.title,
    description: p.description ?? "",
    startingPrice: prices.length ? Math.min(...prices) : 0,
    moq: typeof meta.moq === "number" ? meta.moq : Number(meta.moq) || 0,
    features: Array.isArray(meta.features) ? (meta.features as string[]) : [],
  };
}

// Two-field pattern: `*variants` returns the scalar columns,
// `variants.calculated_price` adds the computed price, `*variants.options` +
// `variants.options.option.title` expose which option values a variant holds.
const DETAIL_FIELDS =
  "id,title,handle,description,metadata,*categories,*variants,variants.calculated_price,*variants.options,variants.options.option.title";

/** Fetch a single product by handle (slug) for the detail page. Returns null
 *  on miss or backend error. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const cached = fresh(productBySlugCache.get(slug));
  if (cached !== undefined) return cached;
  try {
    const region_id = await getRegionId();
    const { products: live } = await sdk.store.product.list({
      region_id,
      handle: slug,
      fields: DETAIL_FIELDS,
      limit: 1,
    });
    const p = live[0];
    const result = !p || isServiceProduct(p) ? null : toFullProduct(p);
    productBySlugCache.set(slug, { data: result, at: Date.now() });
    return result;
  } catch (err) {
    console.error(`[getProductBySlug] failed for "${slug}":`, err);
    return null; // transient — don't cache
  }
}

/** A variant's option values keyed by option title (Size/Material/Printing). */
function variantOptionMap(
  v: HttpTypes.StoreProductVariant,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const o of v.options ?? []) {
    const title = o.option?.title;
    if (title && o.value) map[title] = o.value;
  }
  return map;
}

function toFullProduct(p: HttpTypes.StoreProduct): Product {
  const summary = toSummary(p);
  const meta = (p.metadata ?? {}) as Record<string, unknown>;
  const variants = p.variants ?? [];

  // Display labels for the option sections ("Width"/"Colour"/"Window" …) —
  // mirrored by the catalog import; option TITLES stay Size/Material.
  const metaLabels = (meta.option_labels ?? {}) as Record<string, unknown>;
  const optionLabels: OptionLabels = {
    size:
      typeof metaLabels.Size === "string" && metaLabels.Size
        ? metaLabels.Size
        : DEFAULT_OPTION_LABELS.size,
    material:
      typeof metaLabels.Material === "string" && metaLabels.Material
        ? metaLabels.Material
        : DEFAULT_OPTION_LABELS.material,
  };

  // ── Enriched model (seed model_version ≥ 2): options + metadata mirrors ──
  const metaMaterials = Array.isArray(meta.materials)
    ? (meta.materials as Array<{ value?: string; description?: string }>)
    : [];
  const metaPrinting = Array.isArray(meta.printing)
    ? (meta.printing as Array<{
        value?: string;
        description?: string;
        per_unit?: number;
        setup_fee?: number;
      }>)
    : [];
  const metaTiers = Array.isArray(meta.tiers)
    ? (meta.tiers as Array<{
        min_quantity?: number;
        label?: string;
        discount_pct?: number;
      }>)
    : [];

  const materials: MaterialOption[] = metaMaterials
    .filter((m): m is { value: string; description?: string } => !!m?.value)
    .map((m) => ({
      id: m.value,
      label: m.value,
      description: m.description ?? "",
    }));

  const printing: PrintingOption[] = metaPrinting
    .filter((pr): pr is { value: string } & typeof pr => !!pr?.value)
    .map((pr) => ({
      id: pr.value,
      label: pr.value,
      description: pr.description ?? "",
      setupFee: Number(pr.setup_fee ?? 0),
      perUnit: Number(pr.per_unit ?? 0),
    }));

  const tiers: PriceTier[] = metaTiers
    .filter((t) => typeof t?.min_quantity === "number")
    .map((t) => ({
      minQuantity: t.min_quantity as number,
      label: t.label ?? "Pricing",
      discountPct: Number(t.discount_pct ?? 0),
    }));

  // Sizes from the Size option values; dimensions from any variant carrying
  // that value (dims are the same across materials/printing). Smallest first.
  type Sized = SizeOption & { _len: number };
  const sizeById = new Map<string, Sized>();
  const combos: VariantCombo[] = [];

  for (const v of variants) {
    const opts = variantOptionMap(v);
    const sizeValue = opts.Size;
    const price = v.calculated_price?.calculated_amount;
    combos.push({
      sizeId: sizeValue ?? v.id,
      materialId: opts.Material ?? "",
      printingId: opts.Printing ?? "",
      variantId: v.id,
      unitPrice: typeof price === "number" ? price : 0,
    });

    if (sizeValue && !sizeById.has(sizeValue)) {
      const L = Number(v.length ?? 0);
      const W = Number(v.width ?? 0);
      const H = Number(v.height ?? 0);
      sizeById.set(sizeValue, {
        id: sizeValue,
        label:
          L && W && H
            ? `${sizeValue} (${L / 10}×${W / 10}×${H / 10}cm)`
            : sizeValue,
        dimensions: L && W && H ? `${L} × ${W} × ${H} mm` : "",
        _len: L,
      });
    }
  }

  let sizes: SizeOption[] = [...sizeById.values()]
    .sort((a, b) => a._len - b._len)
    .map((s) => ({ id: s.id, label: s.label, dimensions: s.dimensions }));

  // Accessories (tape, bubble wrap) carry a "Unit" option rather than Size —
  // fall back to one option per variant so the detail page can still add to
  // cart. TODO: dedicated non-carton detail view.
  if (!sizes.length) {
    sizes = variants.map((v) => ({
      id: v.id,
      label: v.title ?? "Standard",
      dimensions: "",
    }));
    // Re-key combos onto the fallback size ids (variant ids).
    combos.length = 0;
    for (const v of variants) {
      combos.push({
        sizeId: v.id,
        materialId: "",
        printingId: "",
        variantId: v.id,
        unitPrice: v.calculated_price?.calculated_amount ?? 0,
      });
    }
  }

  return { ...summary, optionLabels, sizes, materials, printing, tiers, combos };
}

// ─────────────────────────────────────────────────────────────────────────
// Cart cross-sell ("people also order") — live accessory products.
// ─────────────────────────────────────────────────────────────────────────

/** Accessory VARIANTS surfaced on the cart page. Since the catalog family
 *  consolidation, tape colours/widths are variants of one `packaging-tape`
 *  product — each cross-sell card targets a specific variant by SKU (no sku =
 *  the product's first variant). Seeded by import-catalog.ts. */
export const CROSS_SELL_ITEMS: Array<{
  handle: string;
  sku?: string;
  /** Card title override (product title alone is ambiguous across variants). */
  name?: string;
}> = [
  { handle: "packaging-tape", sku: "PG-ACC-001", name: "Packaging Tape — Brown 48mm" },
  { handle: "packaging-tape", sku: "PG-ACC-002", name: "Packaging Tape — Clear 48mm" },
  { handle: "bubble-wrap" },
];

export interface CrossSellProduct {
  /** Unique per CARD — the variant id (two cards can share one product). */
  id: string;
  /** The sellable variant — what addLineItem() needs. */
  variantId: string;
  slug: string;
  name: string;
  description: string;
  pricePerUnit: number;
  unitLabel: string;
}

/** Fetch the cross-sell accessory variants with live GHS prices. Returns []
 *  when the backend is unreachable or the accessories aren't seeded — the
 *  cart section hides itself in that case. */
export async function listCrossSellProducts(): Promise<CrossSellProduct[]> {
  const cached = fresh(crossSellCache);
  if (cached !== undefined) return cached;
  try {
    const region_id = await getRegionId();
    const handles = [...new Set(CROSS_SELL_ITEMS.map((i) => i.handle))];
    const { products: live } = await sdk.store.product.list({
      region_id,
      handle: handles,
      fields:
        "id,title,handle,description,metadata,*variants,variants.calculated_price",
      limit: handles.length,
    });
    const result = CROSS_SELL_ITEMS.map((item): CrossSellProduct | null => {
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
    crossSellCache = { data: result, at: Date.now() };
    return result;
  } catch (err) {
    console.error("[listCrossSellProducts] failed:", err);
    return []; // transient — don't cache
  }
}

/** ProductSummary projection of the static `products` array — the Figma
 *  sample products. Used as a fallback when the Medusa backend is offline so
 *  the browse page still renders meaningful content. */
const SAMPLE_PRODUCTS: ProductSummary[] = products.map((p) => ({
  id: p.id,
  slug: p.slug,
  category: p.category,
  name: p.name,
  description: p.description,
  startingPrice: p.startingPrice,
  moq: p.moq,
  features: p.features,
}));

/** Fetch the live catalog for the browse grid. Falls back to the static sample
 *  products (Figma Browse frame) if the backend is unreachable, so /products
 *  is never empty in dev or when Medusa is down. Service products (print-setup
 *  fee) are excluded. */
export async function listProducts(): Promise<ProductSummary[]> {
  const cached = fresh(listProductsCache);
  if (cached !== undefined) return cached;
  try {
    const region_id = await getRegionId();
    const { products: live } = await sdk.store.product.list({
      region_id,
      fields:
        "id,title,handle,description,metadata,*categories,*variants,variants.calculated_price",
      limit: 100,
    });
    const browsable = live.filter((p) => !isServiceProduct(p));
    const result = browsable.length ? browsable.map(toSummary) : SAMPLE_PRODUCTS;
    // Only cache real catalog data — not the empty→sample fallback.
    if (browsable.length) listProductsCache = { data: result, at: Date.now() };
    return result;
  } catch (err) {
    console.error("[listProducts] Medusa unreachable; using sample products:", err);
    return SAMPLE_PRODUCTS;
  }
}
