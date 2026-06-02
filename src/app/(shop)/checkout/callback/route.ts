import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { completeCheckout } from "@/lib/actions/checkout";

/**
 * Paystack redirect target — a Route Handler, NOT a page.
 *
 * Paystack sends the browser here with `?reference=...&trxref=...` after the
 * hosted payment (the URL is set in the Paystack dashboard → Settings →
 * Payments → Callback URL = `${NEXT_PUBLIC_SITE_URL}/checkout/callback`).
 *
 * Why a Route Handler and not a page: completing the cart clears the cart
 * cookie (`cookies().delete()`). Cookie mutation is ONLY legal in a Route
 * Handler or Server Action — never during a Server Component render. As a page
 * this threw mid-completion, got swallowed by completeCheckout's try/catch, and
 * sent paid customers to an empty `/cart` even though the order was placed.
 *
 * We don't verify the reference by hand — the Medusa Paystack provider verifies
 * it against Paystack inside `cart.complete()`.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference) {
    redirect("/checkout/payment?error=Missing+payment+reference");
  }

  const result = await completeCheckout();

  // redirect() throws NEXT_REDIRECT, so it must live outside any try/catch.
  if (!result.ok) {
    redirect(`/checkout/payment?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/checkout/confirmation?order=${result.orderId}`);
}
