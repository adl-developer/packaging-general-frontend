// Browse (/products) is wired to the live Medusa catalog via `listProducts()`.
// The static `products`/`getProduct` data below still backs the detail page
// (/products/[slug]) customizer (sizes-with-dimensions, materials, printing
// setup fees) until those are modelled in the backend. See `listProducts`.

import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";

export interface SizeOption {
  id: string;
  label: string; // e.g. "Small (30×20×15cm)"
  dimensions: string; // e.g. "300 × 200 × 150 mm"
}

export interface MaterialOption {
  id: string;
  label: string;
  description: string;
}

export interface PrintingOption {
  id: string;
  label: string;
  description: string;
  setupFee?: string; // e.g. "Setup fee: GH₵ 500.00 + GH₵ 0.50/unit"
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
  sizes: SizeOption[];
}

const CARTON_SIZES: SizeOption[] = [
  { id: "s", label: "Small (30×20×15cm)", dimensions: "300 × 200 × 150 mm" },
  { id: "m", label: "Medium (40×30×20cm)", dimensions: "400 × 300 × 200 mm" },
  { id: "l", label: "Large (50×40×30cm)", dimensions: "500 × 400 × 300 mm" },
];

// Customization options (Figma frame 404:1371). Shared across cartons for now.
// TODO(medusa): drive these from product variants/options per product.
export const CARTON_MATERIALS: MaterialOption[] = [
  { id: "single", label: "Kraft Single Wall", description: "Standard brown kraft paper, 125gsm" },
  { id: "double", label: "Kraft Double Wall", description: "Extra strength for heavy goods, 200gsm" },
];

export const CARTON_PRINTING: PrintingOption[] = [
  { id: "none", label: "No Printing", description: "Plain packaging" },
  {
    id: "1color",
    label: "1-Color Print",
    description: "Single color logo/text",
    setupFee: "Setup fee: GH₵ 500.00 + GH₵ 0.50/unit",
  },
  {
    id: "2color",
    label: "2-Color Print",
    description: "Two color printing",
    setupFee: "Setup fee: GH₵ 750.00 + GH₵ 0.80/unit",
  },
];

/** Quantity → pricing-tier label (Figma shows "50-199 units - Base pricing"). */
export function quantityTier(qty: number): string {
  if (qty >= 1000) return "1000+ units - Best pricing";
  if (qty >= 500) return "500-999 units - Volume discount";
  if (qty >= 200) return "200-499 units - Bulk discount";
  return "50-199 units - Base pricing";
}

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
    sizes: CARTON_SIZES,
  },
  {
    id: "2",
    slug: "mailer-box",
    category: "Mailer Box",
    name: "Premium Mailer Box",
    description: "Custom-designed mailer box for e-commerce brands",
    startingPrice: 4.2,
    moq: 50,
    features: ["3 sizes available", "2 print options"],
    sizes: CARTON_SIZES,
  },
  {
    id: "3",
    slug: "folding-carton",
    category: "Folding Carton (FMCG)",
    name: "Folding Carton",
    description: "Retail-ready packaging for food and consumer goods",
    startingPrice: 2.8,
    moq: 100,
    features: ["3 sizes available", "4 print options"],
    sizes: CARTON_SIZES,
  },
  {
    id: "4",
    slug: "export-agro-box",
    category: "Export/Agro Box",
    name: "Export/Agro Box",
    description: "Heavy-duty packaging for agricultural exports and produce",
    startingPrice: 5.5,
    moq: 50,
    features: ["2 sizes available", "2 print options"],
    sizes: CARTON_SIZES,
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

// ─────────────────────────────────────────────────────────────────────────
// Live Medusa catalog (browse). Maps Store API products → browse-card shape.
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
 *  is never empty in dev or when Medusa is down. */
export async function listProducts(): Promise<ProductSummary[]> {
  try {
    const region_id = await getRegionId();
    const { products: live } = await sdk.store.product.list({
      region_id,
      fields:
        "id,title,handle,description,metadata,*categories,*variants.calculated_price",
      limit: 100,
    });
    return live.length ? live.map(toSummary) : SAMPLE_PRODUCTS;
  } catch (err) {
    console.error("[listProducts] Medusa unreachable; using sample products:", err);
    return SAMPLE_PRODUCTS;
  }
}
