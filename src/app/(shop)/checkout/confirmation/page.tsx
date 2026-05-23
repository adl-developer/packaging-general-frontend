import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";

export const metadata: Metadata = {
  title: "Order Confirmed",
  // Post-purchase, private — keep out of search indexes.
  robots: { index: false, follow: false },
};

export default function ConfirmationPage() {
  return <OrderConfirmation />;
}
