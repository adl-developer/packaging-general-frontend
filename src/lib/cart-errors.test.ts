import { describe, expect, it } from "vitest";
import { isDeadVariantError } from "./cart-errors";

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
