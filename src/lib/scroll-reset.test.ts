import { describe, expect, it } from "vitest";
import { shouldResetScroll } from "./scroll-reset";

describe("shouldResetScroll", () => {
  it("does nothing on the very first render (no previous route)", () => {
    expect(
      shouldResetScroll({
        prevPathname: null,
        pathname: "/checkout/payment",
        hash: "",
        traversalTarget: null,
      })
    ).toBe(false);
  });

  it("resets when the customer advances to a new route", () => {
    expect(
      shouldResetScroll({
        prevPathname: "/checkout/delivery",
        pathname: "/checkout/payment",
        hash: "",
        traversalTarget: null,
      })
    ).toBe(true);
  });

  it("leaves the position alone when only the query changed", () => {
    expect(
      shouldResetScroll({
        prevPathname: "/checkout/payment",
        pathname: "/checkout/payment",
        hash: "",
        traversalTarget: null,
      })
    ).toBe(false);
  });

  it("leaves back/forward navigation to the browser's scroll restoration", () => {
    expect(
      shouldResetScroll({
        prevPathname: "/checkout/payment",
        pathname: "/checkout/delivery",
        hash: "",
        traversalTarget: "/checkout/delivery",
      })
    ).toBe(false);
  });

  it("ignores a stale traversal target that points somewhere else", () => {
    expect(
      shouldResetScroll({
        prevPathname: "/cart",
        pathname: "/checkout",
        hash: "",
        traversalTarget: "/cart",
      })
    ).toBe(true);
  });

  it("does not fight an in-page anchor link", () => {
    expect(
      shouldResetScroll({
        prevPathname: "/cart",
        pathname: "/about",
        hash: "#team",
        traversalTarget: null,
      })
    ).toBe(false);
  });
});
