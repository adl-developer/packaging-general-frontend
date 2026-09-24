import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { storefrontUrlFromHeaders } from "./storefront-origin";

const from = (h: Record<string, string>) => (name: string) => h[name] ?? null;

describe("storefrontUrlFromHeaders", () => {
  it("uses the forwarded host and proto (Vercel behind Cloudflare)", () => {
    expect(
      storefrontUrlFromHeaders(
        from({
          "x-forwarded-host": "www.packaginggeneral.com",
          "x-forwarded-proto": "https",
          host: "packaging-general-frontend-abc.vercel.app",
        }),
      ),
    ).toBe("https://www.packaginggeneral.com");
  });

  it("tells staging apart from production", () => {
    expect(storefrontUrlFromHeaders(from({ host: "app.packaginggeneral.com" }))).toBe(
      "https://app.packaginggeneral.com",
    );
  });

  it("takes the first value of a comma-joined forwarded header and lower-cases it", () => {
    expect(
      storefrontUrlFromHeaders(
        from({ "x-forwarded-host": "APP.packaginggeneral.com, proxy.internal" }),
      ),
    ).toBe("https://app.packaginggeneral.com");
  });

  it("keeps http for local development", () => {
    expect(storefrontUrlFromHeaders(from({ host: "localhost:3000" }))).toBe(
      "http://localhost:3000",
    );
  });

  it("returns null for a missing or malformed host", () => {
    expect(storefrontUrlFromHeaders(from({}))).toBeNull();
    expect(storefrontUrlFromHeaders(from({ host: "evil.example/path" }))).toBeNull();
    expect(storefrontUrlFromHeaders(from({ host: "a b" }))).toBeNull();
  });
});
