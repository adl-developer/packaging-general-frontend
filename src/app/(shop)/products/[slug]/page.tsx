import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCustomizer } from "@/components/products/product-customizer";
import { getProductBySlug } from "@/lib/products";
import { getStockForProduct } from "@/lib/stock";
import { getCustomer } from "@/lib/actions/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  // Live stock, uncached (see lib/stock.ts). Converted to a plain object —
  // a Map can't cross the server/client boundary into the customizer.
  const [stockMap, customer] = await Promise.all([
    getStockForProduct(product.id),
    getCustomer(),
  ]);
  const stock = Object.fromEntries(stockMap);
  // Only a boolean crosses to the client — Buy Now is signed-in-only (never
  // shown-and-disabled for guests), but the customer's own data never needs
  // to reach this client component. The server action re-checks getCustomer()
  // itself regardless — this flag only controls whether the button renders.
  return (
    <ProductCustomizer
      product={product}
      stock={stock}
      isSignedIn={Boolean(customer)}
    />
  );
}
