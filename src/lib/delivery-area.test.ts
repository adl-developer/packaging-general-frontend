import { describe, expect, it } from "vitest";
import {
  OUTSIDE_DELIVERY_AREA_MESSAGE,
  isOutsideAreaRefusal,
  isOutsideDeliveryArea,
  isWithinGreaterAccra,
  outsideAreaEnquiry,
} from "./delivery-area";

// Same towns as the backend's delivery-area.unit.spec.ts — the two copies
// must agree, and nothing else checks that they do.
const INSIDE: Record<string, [number, number]> = {
  "Accra Central": [5.5502, -0.2174],
  Tema: [5.6698, -0.0166],
  "Business Location (Spintex)": [5.645268, -0.114049],
  Madina: [5.6819, -0.1654],
  Amasaman: [5.7016, -0.2997],
  Weija: [5.558, -0.335],
  Dodowa: [5.8826, -0.0985],
  Prampram: [5.7106, 0.113],
  "Ada Foah": [5.7837, 0.6307],
};

const OUTSIDE: Record<string, [number, number]> = {
  Kasoa: [5.5345, -0.419],
  Nsawam: [5.8089, -0.3503],
  Aburi: [5.8483, -0.1753],
  Akosombo: [6.296, 0.053],
  Sogakope: [6.008, 0.593],
  Aflao: [6.1167, 1.1917],
  "Cape Coast": [5.1053, -1.2466],
  Kumasi: [6.6885, -1.6244],
  Tamale: [9.4075, -0.8533],
};

describe("isWithinGreaterAccra", () => {
  it.each(Object.entries(INSIDE))("%s is inside", (_n, [lat, lng]) => {
    expect(isWithinGreaterAccra(lat, lng)).toBe(true);
  });
  it.each(Object.entries(OUTSIDE))("%s is outside", (_n, [lat, lng]) => {
    expect(isWithinGreaterAccra(lat, lng)).toBe(false);
  });
});

describe("isOutsideDeliveryArea", () => {
  const kumasi = { lat: 6.6885, lng: -1.6244 };
  it("warns only when the switch is on and a pin is set outside", () => {
    expect(isOutsideDeliveryArea(true, kumasi)).toBe(true);
    expect(isOutsideDeliveryArea(false, kumasi)).toBe(false);
    expect(isOutsideDeliveryArea(true, null)).toBe(false);
    expect(isOutsideDeliveryArea(true, { lat: 5.5502, lng: -0.2174 })).toBe(false);
  });
});

describe("isOutsideAreaRefusal", () => {
  it("recognises the backend's refusal message verbatim", () => {
    expect(isOutsideAreaRefusal(OUTSIDE_DELIVERY_AREA_MESSAGE)).toBe(true);
    expect(isOutsideAreaRefusal("No delivery options are available right now.")).toBe(false);
    expect(isOutsideAreaRefusal(undefined)).toBe(false);
  });
});

describe("outsideAreaEnquiry", () => {
  it("names the address, the pin and the items", () => {
    const text = outsideAreaEnquiry({
      address: "Adum, Kumasi",
      coords: { lat: 6.6885, lng: -1.6244 },
      items: ["2 × Vegetable Carton (500 g)", "1 × Pizza Box"],
    });
    expect(text).toBe(
      "Hi Packaging General, I'd like to place an order for delivery to Adum, Kumasi. " +
        "Map pin: https://maps.google.com/?q=6.688500,-1.624400. " +
        "My order: 2 × Vegetable Carton (500 g); 1 × Pizza Box. Can you help?",
    );
  });

  it("still reads naturally with no address, pin or items", () => {
    expect(outsideAreaEnquiry({ address: " ", items: [] })).toBe(
      "Hi Packaging General, I'd like to place an order for delivery outside Greater Accra. Can you help?",
    );
  });

  it("uses no em dashes in customer copy", () => {
    expect(OUTSIDE_DELIVERY_AREA_MESSAGE).not.toContain("—");
    expect(outsideAreaEnquiry({ address: "x", items: ["1 × y"] })).not.toContain("—");
  });
});
