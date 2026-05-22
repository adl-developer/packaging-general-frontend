import type { Metadata } from "next";
import { DeliveryForm } from "@/components/checkout/delivery-form";

export const metadata: Metadata = {
  title: "Delivery",
  // Private, transactional step — keep out of search indexes.
  robots: { index: false, follow: false },
};

export default function DeliveryPage() {
  return <DeliveryForm />;
}
