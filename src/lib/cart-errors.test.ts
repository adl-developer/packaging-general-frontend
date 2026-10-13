import { describe, expect, it } from "vitest";
import { isDeadCartError, isDeadVariantError } from "./cart-errors";

/** Mirrors @medusajs/js-sdk's FetchError: server message + HTTP status. */
class FetchError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

describe("isDeadVariantError", () => {
  // Captured verbatim from the live backend on 2026-07-31 by POSTing a
  // deleted variant id to /store/carts/:id/line-items (HTTP 400).
  const REAL_MESSAGE =
    "Variants variant_01JXXXXXXXXXXXXXXXXXXXXXXX do not exist or belong to a product that is not published";

  // The backend's archived-variant guard (2026-10-05,
  // `backend/src/api/utils/archived-variant-guard.ts`, HTTP 400). Must count
  // as a dead VARIANT, or `clearStaleCartOn4xx` would drop a healthy cart.
  it("recognises the archived-variant refusal", () => {
    expect(
      isDeadVariantError({
        status: 400,
        message: "This option is no longer available. Please choose another.",
      }),
    ).toBe(true);
  });

  it("recognises the real backend rejection", () => {
    expect(isDeadVariantError(new FetchError(REAL_MESSAGE, 400))).toBe(true);
  });

  it("recognises the singular form", () => {
    expect(
      isDeadVariantError(new FetchError("Variant variant_01ABC does not exist", 400)),
    ).toBe(true);
  });

  it("does NOT match a genuinely dead cart — that one must clear the cookie", () => {
    expect(isDeadVariantError(new FetchError("Cart with id cart_01ABC was not found", 404))).toBe(
      false,
    );
  });

  it("does NOT match a completed cart", () => {
    expect(
      isDeadVariantError(new FetchError("Cart cart_01ABC is already completed", 400)),
    ).toBe(false);
  });

  it("is safe on non-Error values", () => {
    expect(isDeadVariantError(undefined)).toBe(false);
    expect(isDeadVariantError(null)).toBe(false);
    expect(isDeadVariantError("Variants do not exist")).toBe(false);
    expect(isDeadVariantError({ message: 42 })).toBe(false);
  });
});

describe("isDeadCartError", () => {
  it("recognises both 404 wordings for a vanished cart", () => {
    expect(
      isDeadCartError(new FetchError("Cart id not found: cart_01M48ZSPTT94WSJ3SKHSHWNF8N", 404)),
    ).toBe(true);
    expect(
      isDeadCartError(new FetchError("Cart with id 'cart_01M3NREAXNHQJ45WQY223RER64' not found", 404)),
    ).toBe(true);
  });

  it("recognises a completed cart", () => {
    expect(isDeadCartError(new FetchError("Cart cart_01ABC is already completed.", 400))).toBe(true);
  });

  it("never treats a line problem as a dead cart", () => {
    expect(
      isDeadCartError(
        new FetchError(
          "Variants variant_01ABC do not exist or belong to a product that is not published",
          400,
        ),
      ),
    ).toBe(false);
    expect(
      isDeadCartError(new FetchError("Some variant does not have the required inventory", 400)),
    ).toBe(false);
  });

  it("ignores a 404 that isn't about the cart, and network blips", () => {
    expect(isDeadCartError(new FetchError("Product not found", 404))).toBe(false);
    expect(isDeadCartError(new Error("fetch failed"))).toBe(false);
    expect(isDeadCartError(undefined)).toBe(false);
  });
});
