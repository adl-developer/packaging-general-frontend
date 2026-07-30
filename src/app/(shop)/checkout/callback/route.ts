import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import {
  completeCheckout,
  notifyOrderCompletionFailed,
} from "@/lib/actions/checkout";

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

  // Safe post-payment-failure branch: Paystack's hosted page already charged
  // the customer before this request ran, and cart.complete() then failed for
  // a reason other than a declined/needs-more payment (see completeCheckout's
  // `pending` branch — most likely the manage_inventory/allow_backorder stock
  // guard). Alert staff best-effort (this call never throws — see
  // notifyOrderCompletionFailed) and send the customer to a reassuring state
  // instead of the generic error page. This await is NOT a redirect, so it is
  // fine inside this branch; the redirect() call below still lives outside
  // any try/catch.
  if (!result.ok && result.pending) {
    await notifyOrderCompletionFailed({
      reference,
      cartId: result.cartId,
      reason: result.error,
    });
    redirect(
      `/checkout/confirmation?pending=1&ref=${encodeURIComponent(reference)}`
    );
  }

  // redirect() throws NEXT_REDIRECT, so it must live outside any try/catch.
  if (!result.ok) {
    redirect(`/checkout/payment?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/checkout/confirmation?order=${result.orderId}`);
}
