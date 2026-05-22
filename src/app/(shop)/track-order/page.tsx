import type { Metadata } from "next";
import { TrackOrder } from "@/components/track-order/track-order";

export const metadata: Metadata = {
  title: "Track Order",
  description:
    "Track your Packaging General order. Enter your order number to see production and delivery status.",
  alternates: { canonical: "/track-order" },
};

export default function TrackOrderPage() {
  return <TrackOrder />;
}
