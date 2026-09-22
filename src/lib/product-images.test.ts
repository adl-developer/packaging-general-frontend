import { describe, expect, it } from "vitest";
import { toProductImages } from "./product-images";

describe("toProductImages", () => {
  it("preserves Medusa's image order and gives every image useful alt text", () => {
    expect(
      toProductImages(
        [
          "https://media.packaginggeneral.com/products/front.jpg",
          "https://media.packaginggeneral.com/products/side.jpg",
        ],
        "Shipping Carton",
      ),
    ).toEqual([
      {
        src: "https://media.packaginggeneral.com/products/front.jpg",
        alt: "Shipping Carton",
      },
      {
        src: "https://media.packaginggeneral.com/products/side.jpg",
        alt: "Shipping Carton — view 2",
      },
    ]);
  });
});

describe("toProductImages with a cover", () => {
  const urls = [
    "https://media.packaginggeneral.com/products/front.jpg",
    "https://media.packaginggeneral.com/products/side.jpg",
    "https://media.packaginggeneral.com/products/back.jpg",
  ];

  it("leads with the product's cover when it is one of the images", () => {
    const images = toProductImages(urls, "RSC Carton", urls[2]);
    expect(images.map((i) => i.src)).toEqual([urls[2], urls[0], urls[1]]);
    expect(images[0].alt).toBe("RSC Carton");
    expect(images[1].alt).toBe("RSC Carton — view 2");
  });

  it("keeps Medusa's order when the cover is missing or not among the images", () => {
    expect(toProductImages(urls, "RSC Carton", null).map((i) => i.src)).toEqual(urls);
    expect(
      toProductImages(urls, "RSC Carton", "https://media.packaginggeneral.com/x.jpg").map(
        (i) => i.src,
      ),
    ).toEqual(urls);
  });
});
