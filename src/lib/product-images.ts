// Product gallery images.
//
// ⚠ IMAGES ARE MANAGED IN THE ADMIN PORTAL, NOT IN THIS REPO.
// Settings → Product Management → edit a product → Product Images. Uploads go
// to Cloudflare R2 through the backend and come back on the Medusa product as
// `images[]` + `thumbnail`. There is nothing to add here and no file to drop
// into `public/`.
//
// This file used to carry a `PRODUCT_GALLERY` manifest mapping slugs to files
// in `public/products/`, because the Medusa catalog had no images. Both
// databases were backfilled on 2026-08-06
// (`backend/src/scripts/backfill-product-images.ts`) and the manifest and its
// 18 files were removed.
//
// ⚠ DO NOT REINTRODUCE A STATIC FALLBACK. It is not a harmless safety net: a
// fallback only fires when Medusa returns NO images, so it silently hides the
// case where someone clears a product's media in the admin — the storefront
// keeps showing a stale photo and the admin stops being the source of truth.
// Worse, it does NOT protect against the failure that actually happened in
// production, where a product had a BAD image (a `localhost:9000` upload from
// before the R2 switch); a bad image beats no image, so the page simply broke.
// A product with no images renders the gallery's neutral placeholder, which is
// the honest signal that something needs uploading.

export interface ProductImage {
  src: string;
  alt: string;
}

/**
 * Converts ordered Medusa product-media URLs into gallery-ready images.
 *
 * The product's cover (`thumbnail`, chosen in the admin) leads the gallery
 * when it is one of the images, so the picture on the product card is also
 * the first one on the product page. The admin now moves the cover to first
 * on "Set cover" too; this handles products saved before it did. A cover that
 * isn't among the images (or none) leaves Medusa's order untouched.
 */
export function toProductImages(
  urls: readonly string[],
  name: string,
  thumbnail?: string | null,
): ProductImage[] {
  const coverIndex = thumbnail ? urls.indexOf(thumbnail) : -1;
  const ordered =
    coverIndex > 0
      ? [urls[coverIndex], ...urls.slice(0, coverIndex), ...urls.slice(coverIndex + 1)]
      : urls;
  return ordered.map((src, i) => ({
    src,
    alt: i === 0 ? name : name + " — view " + (i + 1),
  }));
}
