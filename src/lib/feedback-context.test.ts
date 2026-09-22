import { describe, expect, it } from "vitest";
import {
  clip,
  describeError,
  MAX_ERROR_CHARS,
  pushError,
  pushTrail,
  RING_MAX,
  stripQuery,
  type ErrorEntry,
} from "./feedback-context";

const entry = (message: string): ErrorEntry => ({
  kind: "console.error",
  at: "2026-09-22T10:00:00.000Z",
  message,
});

describe("pushError", () => {
  it("keeps only the newest RING_MAX entries", () => {
    let ring: ErrorEntry[] = [];
    for (let i = 0; i < RING_MAX + 5; i++) ring = pushError(ring, entry(`e${i}`));
    expect(ring).toHaveLength(RING_MAX);
    expect(ring[0].message).toBe("e5");
    expect(ring[ring.length - 1].message).toBe(`e${RING_MAX + 4}`);
  });

  it("clips a single oversized message", () => {
    const ring = pushError([], entry("x".repeat(MAX_ERROR_CHARS * 3)));
    expect(ring[0].message).toHaveLength(MAX_ERROR_CHARS);
    expect(ring[0].message.endsWith("…")).toBe(true);
  });

  it("does not mutate the previous ring", () => {
    const first = pushError([], entry("a"));
    const second = pushError(first, entry("b"));
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(2);
  });
});

describe("pushTrail", () => {
  it("appends and caps at the max, oldest dropped", () => {
    let trail: string[] = [];
    for (let i = 0; i < 20; i++) trail = pushTrail(trail, `/p${i}`, 15);
    expect(trail).toHaveLength(15);
    expect(trail[0]).toBe("/p5");
  });

  it("dedupes an immediate repeat (re-render of the same route)", () => {
    expect(pushTrail(["/cart"], "/cart")).toEqual(["/cart"]);
    expect(pushTrail(["/cart"], "/checkout")).toEqual(["/cart", "/checkout"]);
  });
});

describe("describeError", () => {
  it("names an Error with its message and stack", () => {
    const e = new TypeError("boom");
    const s = describeError(e);
    expect(s.startsWith("TypeError: boom")).toBe(true);
    expect(s).toContain("\n");
  });

  it("passes strings through and JSON-encodes objects", () => {
    expect(describeError("plain")).toBe("plain");
    expect(describeError({ a: 1 })).toBe('{"a":1}');
  });

  it("survives an unserialisable value", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(typeof describeError(circular)).toBe("string");
  });
});

describe("stripQuery", () => {
  it("drops query strings and hashes so tokens never reach the email", () => {
    expect(stripQuery("https://x/t/abc?token=SECRET#frag")).toBe("https://x/t/abc");
    expect(stripQuery("https://x/reset#token=SECRET")).toBe("https://x/reset");
    expect(stripQuery("https://x/plain")).toBe("https://x/plain");
    expect(stripQuery("")).toBe("");
  });
});

describe("clip", () => {
  it("leaves short strings alone and marks clipped ones", () => {
    expect(clip("abc", 5)).toBe("abc");
    expect(clip("abcdef", 4)).toBe("abc…");
  });
});
