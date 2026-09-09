import { timingSafeEqual } from "node:crypto";

/**
 * Cache tags for the storefront's shared Data Cache (`unstable_cache` in
 * `lib/catalog.ts`, `lib/categories.ts`, `lib/promotions.ts`,
 * `lib/site-content.ts`) and the contract of `POST /api/revalidate`, which the
 * backend calls when an admin save changes what those readers serve.
 *
 * ⚠ Must match `STOREFRONT_CACHE_TAGS` in the backend's
 * `utils/storefront-revalidate.ts` verbatim — separate repos, nothing checks
 * them against each other. A drift means an admin edit waits for the cache's
 * own expiry (an hour) instead of showing up in seconds.
 *
 * What is NOT here, on purpose: stock (read live, never cached — a money
 * path), carts (per cookie), anything customer-specific.
 */
export const CACHE_TAGS = {
  catalog: "pg-catalog",
  categories: "pg-categories",
  promotions: "pg-promotions",
  siteContent: "pg-site-content",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

const KNOWN_TAGS: ReadonlySet<string> = new Set(Object.values(CACHE_TAGS));

export type RevalidateRequest =
  | { ok: true; tags: CacheTag[] }
  | { ok: false; status: 400 | 401 | 503; error: string };

function secretsMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Validate a revalidation request: the shared secret first (a wrong or
 * missing one learns nothing about which tags exist), then the tag list.
 * `{ all: true }` selects every tag. Pure — the route handler only maps the
 * result to a response.
 */
export function parseRevalidateRequest(
  body: unknown,
  givenSecret: string | undefined,
  expectedSecret: string | undefined,
): RevalidateRequest {
  if (!expectedSecret) {
    return { ok: false, status: 503, error: "Revalidation is not configured" };
  }
  if (!givenSecret || !secretsMatch(givenSecret, expectedSecret)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const input = (body ?? {}) as { tags?: unknown; all?: unknown };
  if (input.all === true) {
    return { ok: true, tags: Object.values(CACHE_TAGS) };
  }

  const raw = Array.isArray(input.tags) ? input.tags : [];
  const tags: CacheTag[] = [];
  for (const tag of raw) {
    if (typeof tag !== "string" || !KNOWN_TAGS.has(tag)) {
      return { ok: false, status: 400, error: `Unknown tag: ${String(tag)}` };
    }
    if (!tags.includes(tag as CacheTag)) tags.push(tag as CacheTag);
  }
  if (!tags.length) {
    return { ok: false, status: 400, error: "No tags given" };
  }
  return { ok: true, tags };
}
