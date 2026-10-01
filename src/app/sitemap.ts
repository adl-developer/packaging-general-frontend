import type { MetadataRoute } from "next";
import { listLiveProducts } from "@/lib/catalog";
import { listLiveCategoryCards } from "@/lib/categories";
import { IS_PRODUCTION_DEPLOY, SITE_URL } from "@/lib/site-url";
import { buildSitemap } from "@/lib/sitemap";

// Rebuilt at most hourly, like the catalogue cache it reads. Without this the
// route is generated once at build and new products never reach it.
export const revalidate = 3600;

/** /sitemap.xml — production only; every other deploy is noindex and
 *  publishes an empty sitemap rather than advertising its own URLs. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!IS_PRODUCTION_DEPLOY) return [];
  const [products, categories] = await Promise.all([
    listLiveProducts(),
    listLiveCategoryCards(),
  ]);
  return buildSitemap(
    SITE_URL,
    products,
    categories?.map((c) => c.href) ?? null,
  );
}
