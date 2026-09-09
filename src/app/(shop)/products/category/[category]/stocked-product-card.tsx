import { ProductCard } from "@/components/products/product-card";
import type { ProductSummary } from "@/lib/products";
import type { CatalogStock } from "@/lib/stock";
import { familyOutOfStock } from "@/lib/stock-rules";

/**
 * The stock-aware version of a category card, streamed.
 *
 * The category page starts ONE `getCatalogStock` read for all of its products
 * and hands the still-pending promise to every card; each card awaits it
 * here, behind its own <Suspense> whose fallback is the plain <ProductCard>
 * (the same component, minus `outOfStock`). Until the promise settles the
 * page shows the catalogue-cached card with no stock claim either way — the
 * card only ever asserts the negative — and once it does, the stocked card
 * (out-of-stock pill + muted image, or nothing) replaces it in place with
 * byte-identical markup, so nothing moves.
 *
 * Deliberately a Server Component: the stock map never crosses to the client,
 * and `familyOutOfStock([])` keeps the fail-open rule — a variant absent from
 * the map (fetch failed, or variant gone) never paints a card out of stock.
 */
export async function StockedProductCard({
  product,
  stock,
}: {
  product: ProductSummary;
  /** The page's single shared stock read — pending when handed over. */
  stock: Promise<CatalogStock>;
}) {
  const { byVariant } = await stock;
  const outOfStock = familyOutOfStock(
    product.variantIds
      .map((id) => byVariant.get(id))
      .filter((s) => s !== undefined),
  );
  return <ProductCard product={product} outOfStock={outOfStock} />;
}
