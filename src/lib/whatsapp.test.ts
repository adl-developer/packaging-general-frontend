import { describe, expect, it } from "vitest";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
  buildWhatsappUrl,
  outOfStockEnquiry,
  supportWhatsappUrl,
} from "./whatsapp";

describe("support line", () => {
  it("uses hello@ as the public contact email", () => {
    expect(SUPPORT_EMAIL).toBe("hello@packaginggeneral.com");
  });
  it("is the official Packaging General number", () => {
    expect(SUPPORT_PHONE).toBe("+233591207616");
    expect(SUPPORT_PHONE_DISPLAY.replace(/\s/g, "")).toBe(SUPPORT_PHONE);
  });
  it("opens WhatsApp chat on the support number", () => {
    expect(supportWhatsappUrl("hi")).toBe("https://wa.me/233591207616?text=hi");
  });
});

describe("buildWhatsappUrl", () => {
  it("returns null when no number is configured", () => {
    expect(buildWhatsappUrl(undefined, "hi")).toBeNull();
  });
  it("returns null for a blank number", () => {
    expect(buildWhatsappUrl("   ", "hi")).toBeNull();
  });
  it("strips a leading + and non-digits", () => {
    expect(buildWhatsappUrl("+233 24 123 4567", "hi")).toBe("https://wa.me/233241234567?text=hi");
  });
  it("converts a local 0-prefixed Ghana number to international", () => {
    expect(buildWhatsappUrl("0241234567", "hi")).toBe("https://wa.me/233241234567?text=hi");
  });
  it("url-encodes the message", () => {
    expect(buildWhatsappUrl("233241234567", "a b&c")).toBe("https://wa.me/233241234567?text=a%20b%26c");
  });
});

describe("outOfStockEnquiry", () => {
  it("names the product and every selected option", () => {
    const msg = outOfStockEnquiry({ product: "Pizza Box", specs: ["Size: Large", "Material: Kraft"], quantity: 500 });
    expect(msg).toContain("Pizza Box");
    expect(msg).toContain("Size: Large");
    expect(msg).toContain("500");
  });
  it("survives a product with no options selected", () => {
    expect(() => outOfStockEnquiry({ product: "Tape", specs: [], quantity: 1 })).not.toThrow();
  });
});
