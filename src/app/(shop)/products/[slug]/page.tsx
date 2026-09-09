import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/catalog";
import { getStockForProduct } from "@/lib/stock";
import { getCustomer } from "@/lib/actions/auth";
import {
  LiveProductCustomizer,
  type StockByVariant,
} from "./live-product-customizer";

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

  // The two per-request backend reads start here and are deliberately NOT
  // awaited: the product comes from the shared catalogue cache (lib/catalog.ts),
  // so the customizer (gallery, options, pricing, action bar) is sent at once
  // and these two values stream in behind it — see live-product-customizer.tsx
  // for how they land without remounting the form.
  //
  // Live stock, uncached (see lib/stock.ts), converted to a plain object — a
  // Map can't cross the server/client boundary. getCatalogStock already
  // resolves (never rejects) with an empty map on failure; the rejection
  // handler is belt-and-braces, because a REJECTED promise handed to a client
  // component throws from use() into the nearest error boundary and would
  // take the whole page down over an auxiliary read. `{}` = unknown = in
  // stock (fail open), the same posture as a failed fetch.
  const stock: Promise<StockByVariant> = getStockForProduct(product.id).then(
    (map) => Object.fromEntries(map),
    () => ({}),
  );
  // Only a boolean crosses to the client — Buy Now's click behaviour is
  // signed-in-only (guests get the auth modal), but the customer's own data
  // never needs to reach this client component. The server action re-checks
  // getCustomer() itself regardless — this flag only selects the click path,
  // so it is a signed-in nicety and must not hold the paint. A guest settles
  // instantly (no cookie → no backend call).
  const isSignedIn: Promise<boolean> = getCustomer().then(
    (customer) => Boolean(customer),
    () => false,
  );

  return (
    <LiveProductCustomizer
      product={product}
      stock={stock}
      isSignedIn={isSignedIn}
    />
  );
}
