import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { parseRevalidateRequest } from "@/lib/revalidate";

/**
 * POST /api/revalidate — drop cached catalogue / category / promotion /
 * site-content data on demand. Called by the backend (a subscriber on
 * product, variant and category events, and the admin settings routes) with
 * the shared secret in `x-revalidate-secret`; body `{ tags: [...] }` or
 * `{ all: true }`. Tags and the secret handshake live in `lib/revalidate.ts`.
 *
 * Expires immediately (`{ expire: 0 }`) rather than stale-while-revalidate:
 * the caller is an admin who just pressed Save and expects the storefront to
 * show the change on the next load.
 */
export async function POST(req: Request) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const result = parseRevalidateRequest(
    body,
    req.headers.get("x-revalidate-secret") ?? undefined,
    process.env.REVALIDATE_SECRET,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  for (const tag of result.tags) {
    revalidateTag(tag, { expire: 0 });
  }
  return NextResponse.json({
    revalidated: result.tags,
    at: new Date().toISOString(),
  });
}
