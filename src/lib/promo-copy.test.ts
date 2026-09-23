import { describe, expect, it } from "vitest";
import { namedCode, promoMessage, promoOffer, promoScope } from "./promo-copy";
import type { ActivePromotion, PromoBanner } from "./promotions";

const easter: ActivePromotion = {
  code: "PGEASTER10",
  value: 10,
  valueType: "percentage",
  campaignName: "Easter",
};

const live = (message: string): PromoBanner => ({ live: true, message });

describe("promoMessage — one text for the promo bar AND the cart box", () => {
  it("uses the admin-typed banner verbatim, even when it disagrees with the promotion", () => {
    // The 2026-09-16 mismatch: banner said 15% OFF, promotion record is 10%.
    // Both surfaces must now show the operator's text, so they agree.
    const m = promoMessage(
      easter,
      live("Enjoy End of Summer Promo of 15%OFF with code: PGEASTER10"),
    );
    expect(m).toEqual({
      headline: "Enjoy End of Summer Promo of 15%OFF with code: PGEASTER10",
      subMessage: "",
      // The message already spells the code out — never print it twice.
      code: null,
      useCode: "PGEASTER10",
    });
  });

  it("adds the code beside a typed message that doesn't mention it", () => {
    expect(promoMessage(easter, live("Big Easter sale"))).toEqual({
      headline: "Big Easter sale",
      subMessage: "",
      code: "PGEASTER10",
      useCode: "PGEASTER10",
    });
    // Case-insensitive, and the sub-message counts too.
    expect(promoMessage(easter, live("Big sale\nuse pgeaster10"))?.code).toBeNull();
  });

  it("never adds the live code beside a message that names a different one", () => {
    // 2026-09-23: the bar read "…with code: PGEOS15   Code: PGEASTER10".
    const m = promoMessage(
      easter,
      live("Enjoy End of Summer Promo of 15%OFF with code: PGEOS15"),
    );
    expect(m?.code).toBeNull();
    expect(m?.headline).toBe("Enjoy End of Summer Promo of 15%OFF with code: PGEOS15");
  });

  it("tells the cart box to use the code the message names, not the live one", () => {
    // 2026-09-23: bar said "Code: QWERT", cart box said "Use code PGEASTER10".
    expect(
      promoMessage(easter, live("Enjoy 10% off for all Sunday orders Code: QWERT"))
        ?.useCode,
    ).toBe("QWERT");
    // …even with no active promotion at all.
    expect(promoMessage(null, live("Sale! Code: QWERT"))?.useCode).toBe("QWERT");
  });

  it("splits the first line as headline and the rest as the sub-message", () => {
    const m = promoMessage(easter, live("Big sale\nEnds Friday\nAccra only"));
    expect(m).toEqual({
      headline: "Big sale",
      subMessage: "Ends Friday Accra only",
      code: "PGEASTER10",
      useCode: "PGEASTER10",
    });
  });

  it("derives copy from the promotion when no message is typed", () => {
    expect(promoMessage(easter, live(""))).toEqual({
      headline: "Enjoy 10% off for all Easter orders",
      subMessage: "",
      code: "PGEASTER10",
      useCode: "PGEASTER10",
    });
    expect(promoMessage(easter, live("   \n  "))).toEqual({
      headline: "Enjoy 10% off for all Easter orders",
      subMessage: "",
      code: "PGEASTER10",
      useCode: "PGEASTER10",
    });
  });

  it("shows a typed message even with no active promotion", () => {
    expect(promoMessage(null, live("Free delivery week"))).toEqual({
      headline: "Free delivery week",
      subMessage: "",
      code: null,
      useCode: null,
    });
  });

  it("returns null when paused, or when there is nothing to say", () => {
    expect(promoMessage(easter, { live: false, message: "Big sale" })).toBeNull();
    expect(promoMessage(null, live(""))).toBeNull();
  });
});

describe("derived promo copy", () => {
  it("formats percentage and fixed offers", () => {
    expect(promoOffer(easter)).toBe("10% off");
    expect(
      promoOffer({ ...easter, valueType: "fixed", value: 50 }),
    ).toMatch(/50\.00 off$/);
  });

  it("scopes to the campaign name when there is one", () => {
    expect(promoScope(easter)).toBe("for all Easter orders");
    expect(promoScope({ ...easter, campaignName: null })).toBe("your order");
  });
});

describe("namedCode", () => {
  it("finds the code a message spells out", () => {
    expect(namedCode("15%OFF with code: PGEOS15")).toBe("PGEOS15");
    expect(namedCode("Use Code PGEASTER10 at checkout")).toBe("PGEASTER10");
    expect(namedCode("CODE:SUMMER")).toBe("SUMMER");
    expect(namedCode("code – PG-EOS_15")).toBe("PG-EOS_15");
  });

  it("ignores prose that merely says 'code'", () => {
    expect(namedCode("Big sale")).toBeNull();
    expect(namedCode("this code works")).toBeNull();
    expect(namedCode("Enter the code at checkout")).toBeNull();
    expect(namedCode("promo code: OK")).toBeNull();
    expect(namedCode("barcode PGEOS15")).toBeNull();
  });
});
