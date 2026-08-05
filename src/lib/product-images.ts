// Product gallery images for the customizer's sticky left panel (Figma
// 3933:25640). The Medusa catalog carries no images today, so the gallery is
// fed from static assets shipped with the storefront.
//
// TO ADD IMAGES:
//   1. Drop the file in `public/products/` — e.g. `public/products/box-tape.jpg`.
//   2. Add the filename to the product's entry in PRODUCT_GALLERY below.
//
// ⚠ REPLACING a photo? Give the new file a NEW NAME rather than overwriting.
// Next's image optimizer caches per (url, width), so swapping the bytes under
// an existing name serves stale variants at some widths and fresh ones at
// others — the symptom is a gallery whose main image disagrees with the
// selected thumbnail. A new filename busts both the dev cache and Vercel's CDN.
//
// The directory is FLAT (not one folder per slug) so a single photo can serve
// several products without duplicating the file — the produce carton shot
// covers the vegetable/yam/mango families, for instance.
//
// The manifest is deliberate rather than convention-only: `public/` is served
// straight off the CDN and is NOT readable from the server filesystem on
// Vercel, so we can't glob the directory at request time, and guessing paths
// would 404 on every product that has no photo yet. A product missing from the
// manifest renders the gallery's neutral placeholder — no broken images.

export interface ProductImage {
  src: string;
  alt: string;
}

/** Converts ordered Medusa product-media URLs into gallery-ready images. */
export function toProductImages(urls: readonly string[], name: string): ProductImage[] {
  return urls.map((src, i) => ({
    src,
    alt: i === 0 ? name : name + " — view " + (i + 1),
  }));
}

/** slug → filenames under `public/products/`, in display order.
 *
 *  `box-*` / `prod-accessories` are the client's own photos. `item-*` (except
 *  the two 200px originals, now unreferenced) are Unsplash/Pexels stand-ins
 *  picked to match that studio look — swap them for real catalogue shots when
 *  the client supplies them. */
const PRODUCT_GALLERY: Record<string, string[]> = {
  "rsc-carton": [
    "box-shipping-spec.jpg",
    "box-shipping-open.jpg",
    "box-shipping-angle.jpg",
  ],
  "archive-box": ["box-archive-closed.jpg", "box-archive-open.jpg"],
  "pizza-box": ["box-pizza-spec.jpg", "box-pizza-open.jpg"],
  "food-box": ["box-food-fit.jpg"],
  "packaging-tray": ["item-pulp-tray.jpg"],
  // The three produce families are all cartons — give each a visibly different
  // box rather than repeating one photo across the category grid.
  "vegetable-carton": ["item-veg-carton.png"],
  "yam-box": ["item-export-cartons.jpg"],
  "mango-box": ["item-tray-carton.jpg"],
  "packaging-tape": ["prod-accessories.jpg"],
  // Wrap covers both stretch film and bubble wrap, so it carries both shots.
  wrap: ["item-stretch-film.jpg", "item-bubble-wrap-roll.jpg"],
  "shredded-paper": ["item-shredded-paper.jpg"],
};

/** Gallery images for a product; empty when none have been supplied yet. */
export function getProductImages(slug: string, name: string): ProductImage[] {
  const files = PRODUCT_GALLERY[slug];
  if (!files?.length) return [];
  return files.map((file, i) => ({
    src: `/products/${file}`,
    alt: i === 0 ? name : `${name} — view ${i + 1}`,
  }));
}
