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
