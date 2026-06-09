import type { Metadata } from "next";
import { DeliveryForm } from "@/components/checkout/delivery-form";
import { getCheckoutPrefill } from "@/lib/actions/checkout";

export const metadata: Metadata = {
  title: "Delivery",
  // Private, transactional step — keep out of search indexes.
  robots: { index: false, follow: false },
};

// Prefill comes from the per-cookie cart + signed-in customer — never cache.
export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  const prefill = await getCheckoutPrefill();
  return (
    <DeliveryForm
      initial={{
        contactName: prefill.deliveryName,
        phone: prefill.deliveryPhone,
        email: prefill.email,
        address: prefill.address,
        instructions: prefill.instructions,
      }}
    />
  );
}
