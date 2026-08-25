import { describe, expect, it } from "vitest";
import {
  ABOUT_FEATURE_COUNT,
  ABOUT_STAGE_COUNT,
  coerceAbout,
  DEFAULT_ABOUT,
  type AboutContent,
} from "./about-content";

const goodAbout = (): AboutContent =>
  JSON.parse(JSON.stringify(DEFAULT_ABOUT)) as AboutContent;

describe("coerceAbout", () => {
  it("accepts the canonical default shape and returns a copy", () => {
    const input = goodAbout();
    const out = coerceAbout(input);
    expect(out).toEqual(DEFAULT_ABOUT);
    expect(out).not.toBe(input);
    expect(out?.intro.features).not.toBe(input.intro.features);
  });

  it("returns null for non-objects", () => {
    for (const raw of [undefined, null, "", 42, [], true]) {
      expect(coerceAbout(raw)).toBeNull();
    }
  });

  it("returns null WHOLE when any section is missing or empty", () => {
    const missing = goodAbout() as unknown as Record<string, unknown>;
    delete missing.foundation;
    expect(coerceAbout(missing)).toBeNull();

    const blank = goodAbout();
    blank.founder.name = "   ";
    expect(coerceAbout(blank)).toBeNull();
  });

  it(`requires exactly ${ABOUT_FEATURE_COUNT} well-formed feature cards`, () => {
    const short = goodAbout();
    short.intro.features = short.intro.features.slice(0, 2);
    expect(coerceAbout(short)).toBeNull();

    const bad = goodAbout();
    bad.intro.features[2] = { title: "Ok", body: "" };
    expect(coerceAbout(bad)).toBeNull();
  });

  it(`requires exactly ${ABOUT_STAGE_COUNT} non-empty stages`, () => {
    const extra = goodAbout();
    extra.journey.stages = [...extra.journey.stages, "Mars — Someday"];
    expect(coerceAbout(extra)).toBeNull();

    const blank = goodAbout();
    blank.journey.stages[1] = "";
    expect(coerceAbout(blank)).toBeNull();
  });

  it("accepts an empty photo_url (built-in photo) but not a missing one", () => {
    const empty = goodAbout();
    empty.founder.photo_url = "";
    expect(coerceAbout(empty)?.founder.photo_url).toBe("");

    const missing = goodAbout() as unknown as {
      founder: Record<string, unknown>;
    };
    delete missing.founder.photo_url;
    expect(coerceAbout(missing)).toBeNull();
  });

  it("keeps a custom photo_url", () => {
    const custom = goodAbout();
    custom.founder.photo_url = "https://media.packaginggeneral.com/x.jpg";
    expect(coerceAbout(custom)?.founder.photo_url).toBe(
      "https://media.packaginggeneral.com/x.jpg",
    );
  });
});
