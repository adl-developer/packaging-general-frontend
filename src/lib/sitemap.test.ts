import { describe, expect, it } from "vitest";
import { buildSitemap } from "./sitemap";

const SITE = "https://packaginggeneral.com";
const urls = (s: ReturnType<typeof buildSitemap>) => s.map((e) => e.url);

describe("buildSitemap", () => {
  it("lists the static public pages under the site origin", () => {
    expect(urls(buildSitemap(SITE, [], []))).toEqual([
      "https://packaginggeneral.com",
      "https://packaginggeneral.com/products",
      "https://packaginggeneral.com/about",
      "https://packaginggeneral.com/track-order",
      "https://packaginggeneral.com/terms",
      "https://packaginggeneral.com/privacy",
    ]);
  });

  it("adds category pages and products from live data", () => {
    const out = urls(
      buildSitemap(
        SITE,
        [{ slug: "pizza-box" }, { slug: "rsc-carton" }],
        ["/products/category/food-packaging", "/products/rsc-carton"],
      ),
    );
    expect(out).toContain("https://packaginggeneral.com/products/category/food-packaging");
    expect(out).toContain("https://packaginggeneral.com/products/pizza-box");
    expect(out).toContain("https://packaginggeneral.com/products/rsc-carton");
  });

  it("skips category cards that link straight to a product, and never duplicates", () => {
    const out = urls(
      buildSitemap(SITE, [{ slug: "rsc-carton" }], ["/products/rsc-carton"]),
    );
    expect(out.filter((u) => u.endsWith("/products/rsc-carton"))).toHaveLength(1);
  });

  it("publishes only the static pages when the backend is unreachable", () => {
    expect(buildSitemap(SITE, null, null)).toHaveLength(6);
  });

  it("never lists private or transactional routes", () => {
    const out = urls(
      buildSitemap(SITE, [{ slug: "a" }], ["/products/category/x"]),
    ).join(" ");
    for (const path of ["/cart", "/checkout", "/account", "/sign-in", "/api/"]) {
      expect(out).not.toContain(path);
    }
  });

  it("encodes slugs and drops empty ones", () => {
    const out = urls(buildSitemap(SITE, [{ slug: "box & lid" }, { slug: "" }], []));
    expect(out).toContain("https://packaginggeneral.com/products/box%20%26%20lid");
    expect(out).toHaveLength(7);
  });
});
