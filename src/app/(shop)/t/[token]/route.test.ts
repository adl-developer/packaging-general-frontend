import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

async function redirectOf(url: string, token: string) {
  const res = await GET(new NextRequest(url), {
    params: Promise.resolve({ token }),
  });
  return { status: res.status, location: res.headers.get("location") };
}

describe("GET /t/[token]", () => {
  it("hands the short token to the track page", async () => {
    const r = await redirectOf(
      "https://app.packaginggeneral.com/t/24.iG3oqsoDWx",
      "24.iG3oqsoDWx",
    );
    expect(r.status).toBe(307);
    expect(r.location).toBe(
      "https://app.packaginggeneral.com/track-order?t=24.iG3oqsoDWx",
    );
  });

  it("keeps ?invoice=1 (receipt QR / View Invoice) and other params", async () => {
    const r = await redirectOf(
      "https://app.packaginggeneral.com/t/24.iG3oqsoDWx?invoice=1&utm=sms",
      "24.iG3oqsoDWx",
    );
    expect(r.location).toBe(
      "https://app.packaginggeneral.com/track-order?t=24.iG3oqsoDWx&invoice=1&utm=sms",
    );
  });

  it("never lets a query `t` override the path token", async () => {
    const r = await redirectOf(
      "https://app.packaginggeneral.com/t/24.real?t=99.fake",
      "24.real",
    );
    expect(r.location).toContain("t=24.real");
    expect(r.location).not.toContain("99.fake");
  });
});
