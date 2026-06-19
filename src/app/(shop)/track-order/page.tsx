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
  searchParams: Promise<{ order?: string; email?: string }>;
}) {
  const { order, email } = await searchParams;
  // Public page — never let an auth hiccup break it; fall back to logged-out.
  const customer = await getCustomer().catch(() => null);
  return (
    <TrackOrder
      initialQuery={order}
      initialEmail={email}
      loggedInEmail={customer?.email}
    />
  );
}
