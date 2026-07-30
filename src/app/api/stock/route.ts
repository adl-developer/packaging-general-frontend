import type { NextRequest } from "next/server";
import { getStockMap } from "@/lib/stock";
import type { StockState } from "@/lib/stock-rules";

/**
 * Same-origin proxy for the live stock read.
 *
 * `getStockMap` calls the Medusa backend directly, which only works
 * server-to-server (no CORS involved). The cart page's client component
 * (`cart-client.tsx`) needs this data too, but a BROWSER calling the Medusa
 * backend directly would depend on Render's `STORE_CORS` including the
 * deployed storefront origin — a value that lives in Render's dashboard, not
 * the repo, and can't be verified here. If it were ever wrong, the fetch
 * would fail, getStockMap's fail-open try/catch would swallow it silently,
 * and the cart guard would be silently dead in production with no signal.
 *
 * Routing through this same-origin handler instead removes the CORS
 * dependency entirely: the browser talks to itself, and only this route
 * (running server-side, like every other Medusa call in this app) talks to
 * the backend.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const productIds = request.nextUrl.searchParams.getAll("id");
  const stock = await getStockMap(productIds);
  return Response.json({
    stock: Object.fromEntries(stock) as Record<string, StockState>,
  });
}
