import type { MetadataRoute } from "next";

/**
 * Pure sitemap builder (the fetch edge is `src/app/sitemap.ts`).
 *
 * Only public, indexable pages: robots.txt disallows auth, account, cart and
 * checkout, so none of those appear here. Inputs are LIVE data or null — a
 * null list (backend unreachable) contributes nothing rather than the
 * placeholder catalogue, which would publish URLs that 404.
 */

/** Static public pages, with the weight a crawler should give each. */
const STATIC_PAGES: { path: string; priority: number; changeFrequency: SitemapFrequency }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/products", priority: 0.9, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/track-order", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
];

type SitemapFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

export function buildSitemap(
  siteUrl: string,
  products: { slug: string }[] | null,
  categoryHrefs: string[] | null,
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${siteUrl}${p.path === "/" ? "" : p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
  const seen = new Set(entries.map((e) => e.url));
  const add = (path: string, priority: number) => {
    const url = `${siteUrl}${path}`;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({ url, changeFrequency: "weekly", priority });
  };

  // Category cards link either to a category page or, for a single-product
  // category, straight to that product. Only category pages are added here;
  // product pages come from the catalogue below.
  for (const href of categoryHrefs ?? []) {
    if (href.startsWith("/products/category/")) add(href, 0.8);
  }
  for (const p of products ?? []) {
    if (p.slug) add(`/products/${encodeURIComponent(p.slug)}`, 0.7);
  }
  return entries;
}
