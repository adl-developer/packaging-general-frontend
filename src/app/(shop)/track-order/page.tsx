import type { Metadata } from "next";
import { getCustomer } from "@/lib/actions/auth";
import { TrackOrder } from "@/components/track-order/track-order";

export const metadata: Metadata = {
  title: "Track Order",
  description:
    "Track your Packaging General order. Enter your order number to see production and delivery status.",
  alternates: { canonical: "/track-order" },
};

// Reads the auth cookie to decide whether to auto-apply the signed-in email.
export const dynamic = "force-dynamic";

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{
    t?: string;
    order?: string;
    email?: string;
    invoice?: string;
  }>;
}) {
  // `t` is the opaque tracking token from emailed/SMS links (no PII in the
  // URL); `order`/`email` remain for the in-site links and old emails.
  // `invoice=1` comes from every "View Invoice" CTA and the invoice QR — it
  // opens the invoice dialog as soon as the lookup resolves.
  const { t, order, email, invoice } = await searchParams;
  // Public page — never let an auth hiccup break it; fall back to logged-out.
  const customer = await getCustomer().catch(() => null);
  return (
    <TrackOrder
      initialToken={t}
      initialQuery={order}
      initialEmail={email}
      openInvoice={invoice === "1"}
      loggedInEmail={customer?.email}
    />
  );
}
