import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completeCheckout } from "@/lib/actions/checkout";

export const metadata: Metadata = {
  title: "Confirming Payment",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface SearchParams {
  reference?: string;
  trxref?: string;
}

/**
 * Paystack redirect target. Paystack appends `?reference=...&trxref=...` and
 * the merchant configures this URL in the Paystack dashboard
 * (Settings → Payments → Callback URL = `${NEXT_PUBLIC_SITE_URL}/checkout/callback`).
 *
 * We don't need to verify anything by hand — the Medusa Paystack provider
 * verifies the reference against Paystack when we call `cart.complete()`.
 */
export default async function PaystackCallbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { reference } = await searchParams;
  if (!reference) {
    redirect("/checkout/payment?error=Missing+payment+reference");
  }

  const result = await completeCheckout();
  if (!result.ok) {
    redirect(`/checkout/payment?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/checkout/confirmation?order=${result.orderId}`);
}
