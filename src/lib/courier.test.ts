import { describe, expect, it } from "vitest";
import { coerceCourier, courierDialHref, courierPhoneLabel } from "./courier";

describe("coerceCourier", () => {
  it("keeps a well-formed courier from the order lookup", () => {
    expect(
      coerceCourier({
        name: "Kwame A.",
        vehicle: "Toyota Corolla, GR 1234-24",
        phone: "+233302000000",
        ext: "0163",
        tracking_url: "https://yango.example/share/abc",
      }),
    ).toEqual({
      name: "Kwame A.",
      vehicle: "Toyota Corolla, GR 1234-24",
      phone: "+233302000000",
      ext: "0163",
      trackingUrl: "https://yango.example/share/abc",
    });
  });

  it("is null for an older backend or an empty courier", () => {
    expect(coerceCourier(undefined)).toBeNull();
    expect(coerceCourier(null)).toBeNull();
    expect(
      coerceCourier({ name: null, vehicle: " ", phone: null, ext: null, tracking_url: null }),
    ).toBeNull();
  });

  it("drops a tracking link that isn't http(s)", () => {
    expect(
      coerceCourier({ name: "Kwame", tracking_url: "javascript:alert(1)" })?.trackingUrl,
    ).toBeNull();
  });

  it("never keeps an extension without a number", () => {
    expect(coerceCourier({ name: "Kwame", phone: null, ext: "0163" })?.ext).toBeNull();
  });
});

describe("courier phone", () => {
  it("dials the extension after a pause", () => {
    expect(courierDialHref("+233 30 200 0000", "0163")).toBe("tel:+233302000000,0163");
    expect(courierDialHref("+233302000000", null)).toBe("tel:+233302000000");
  });

  it("labels the number with its extension", () => {
    expect(courierPhoneLabel("+233302000000", "0163")).toBe("+233302000000 ext 0163");
    expect(courierPhoneLabel("+233302000000", null)).toBe("+233302000000");
  });
});
