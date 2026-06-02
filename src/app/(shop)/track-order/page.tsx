import type { Metadata } from "next";
import { TrackOrder } from "@/components/track-order/track-order";

export const metadata: Metadata = {
  title: "Track Order",
  description:
    "Track your Packaging General order. Enter your order number to see production and delivery status.",
  alternates: { canonical: "/track-order" },
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; email?: string }>;
}) {
  const { order, email } = await searchParams;
  return <TrackOrder initialQuery={order} initialEmail={email} />;
}
