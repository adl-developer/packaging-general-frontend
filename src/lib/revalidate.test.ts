import { describe, expect, it } from "vitest";
import { CACHE_TAGS, parseRevalidateRequest } from "./revalidate";

const SECRET = "s3cret-value-1234567890";

describe("parseRevalidateRequest", () => {
  it("accepts a correct secret and known tags", () => {
    const result = parseRevalidateRequest(
      { tags: ["pg-catalog", "pg-categories"] },
      SECRET,
      SECRET,
    );
    expect(result).toEqual({ ok: true, tags: ["pg-catalog", "pg-categories"] });
  });

  it("expands `all` to every known tag", () => {
    const result = parseRevalidateRequest({ all: true }, SECRET, SECRET);
    expect(result).toEqual({ ok: true, tags: Object.values(CACHE_TAGS) });
  });

  it("rejects a wrong or missing secret with 401 and no tag detail", () => {
    expect(parseRevalidateRequest({ tags: ["pg-catalog"] }, "nope", SECRET)).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    expect(parseRevalidateRequest({ tags: ["pg-catalog"] }, undefined, SECRET)).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
  });

  it("refuses to run at all when the server has no secret configured", () => {
    expect(parseRevalidateRequest({ tags: ["pg-catalog"] }, "", undefined)).toEqual({
      ok: false,
      status: 503,
      error: "Revalidation is not configured",
    });
  });

  it("rejects unknown tags and an empty selection with 400", () => {
    expect(parseRevalidateRequest({ tags: ["pg-catalog", "users"] }, SECRET, SECRET)).toEqual({
      ok: false,
      status: 400,
      error: "Unknown tag: users",
    });
    expect(parseRevalidateRequest({ tags: [] }, SECRET, SECRET)).toEqual({
      ok: false,
      status: 400,
      error: "No tags given",
    });
    expect(parseRevalidateRequest({}, SECRET, SECRET)).toEqual({
      ok: false,
      status: 400,
      error: "No tags given",
    });
    expect(parseRevalidateRequest(null, SECRET, SECRET)).toEqual({
      ok: false,
      status: 400,
      error: "No tags given",
    });
  });

  it("de-duplicates repeated tags", () => {
    const result = parseRevalidateRequest(
      { tags: ["pg-catalog", "pg-catalog"] },
      SECRET,
      SECRET,
    );
    expect(result).toEqual({ ok: true, tags: ["pg-catalog"] });
  });
});
