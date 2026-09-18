import { NextResponse, type NextRequest } from "next/server";

/**
 * `/t/<token>` — the SHORT order-tracking link (2026-09-17).
 *
 * The backend mints `https://<site>/t/24.iG3oqsoDWx` for every email, SMS and
 * receipt QR because an SMS is billed per 160-character segment and the old
 * `/track-order?t=<71-char token>` link alone was ~140 characters. This route
 * just hands the token to the existing track page, which does the lookup;
 * the token is verified by the backend, never here.
 *
 * Every other query param rides along — `?invoice=1` is what the "View
 * Invoice" CTAs and the receipt QR add, and the track page opens the invoice
 * dialog on it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const target = new URL("/track-order", request.nextUrl.origin);
  target.searchParams.set("t", token);
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "t") target.searchParams.set(key, value);
  });
  return NextResponse.redirect(target, 307);
}
