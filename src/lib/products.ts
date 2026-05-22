// TODO(medusa): replace with the live Medusa catalog. Shared by /products
// (browse) and /products/[slug] (detail/customizer). Cards 3-4 + size options
// are placeholder data pending the Medusa product model.

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
    slug: "standard-shipping-carton",
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
    slug: "premium-mailer-box",
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
    slug: "folding-carton-fmcg",
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
