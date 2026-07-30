import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCustomizer } from "@/components/products/product-customizer";
import { getProductBySlug } from "@/lib/products";
import { getStockForProduct } from "@/lib/stock";

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
  const stockMap = await getStockForProduct(product.id);
  const stock = Object.fromEntries(stockMap);
  return <ProductCustomizer product={product} stock={stock} />;
}
