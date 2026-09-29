import { describe, expect, it } from "vitest";
import {
  DEFAULT_AFTER_SIGN_IN,
  googleSignInMessage,
  isGoogleConsentUrl,
  safeNextPath,
  stateFromConsentUrl,
} from "./google-sign-in";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/products/pizza-box")).toBe("/products/pizza-box");
    expect(safeNextPath("/account/orders?x=1")).toBe("/account/orders?x=1");
  });

  it("refuses anything that could leave the site", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "evil.com",
      "javascript:alert(1)",
      "/ok\nSet-Cookie: x",
      "/" + "a".repeat(600),
    ]) {
      expect(safeNextPath(bad)).toBe(DEFAULT_AFTER_SIGN_IN);
    }
  });

  it("never loops back into the callback, and defaults on junk", () => {
    expect(safeNextPath("/auth/google/callback?code=x")).toBe(DEFAULT_AFTER_SIGN_IN);
    expect(safeNextPath(undefined)).toBe(DEFAULT_AFTER_SIGN_IN);
    expect(safeNextPath(42)).toBe(DEFAULT_AFTER_SIGN_IN);
  });
});

describe("isGoogleConsentUrl", () => {
  it("accepts only Google's https consent host", () => {
    expect(isGoogleConsentUrl("https://accounts.google.com/o/oauth2/v2/auth?state=a")).toBe(true);
    expect(isGoogleConsentUrl("http://accounts.google.com/o/oauth2/v2/auth")).toBe(false);
    expect(isGoogleConsentUrl("https://accounts.google.com.evil.com/")).toBe(false);
    expect(isGoogleConsentUrl("https://evil.com/?accounts.google.com")).toBe(false);
    expect(isGoogleConsentUrl("not a url")).toBe(false);
    expect(isGoogleConsentUrl(null)).toBe(false);
  });
});

describe("stateFromConsentUrl", () => {
  it("reads the state Medusa stored the sign-in under", () => {
    expect(stateFromConsentUrl("https://accounts.google.com/o/oauth2/v2/auth?state=abc123&x=1")).toBe("abc123");
    expect(stateFromConsentUrl("https://accounts.google.com/o/oauth2/v2/auth")).toBeNull();
    expect(stateFromConsentUrl("::")).toBeNull();
  });
});

describe("googleSignInMessage", () => {
  it("has a message for every error code and none for junk", () => {
    for (const code of ["cancelled", "unverified", "unavailable", "failed"]) {
      expect(googleSignInMessage(code)).toBeTruthy();
      expect(googleSignInMessage(code)).not.toContain("—");
    }
    expect(googleSignInMessage("<script>")).toBeUndefined();
    expect(googleSignInMessage(undefined)).toBeUndefined();
  });
});
