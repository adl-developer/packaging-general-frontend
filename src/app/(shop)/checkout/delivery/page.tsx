import type { Metadata } from "next";
import { DeliveryForm } from "@/components/checkout/delivery-form";
import { FulfillmentChooser } from "@/components/checkout/fulfillment-chooser";
import { getCheckoutPrefill } from "@/lib/actions/checkout";
import { getPickupLocation } from "@/lib/pickup";
import { getFooterHoursLines } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Delivery",
  // Private, transactional step — keep out of search indexes.
  robots: { index: false, follow: false },
};

// Prefill comes from the per-cookie cart + signed-in customer — never cache.
export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  const [prefill, pickupLocation, hoursLines] = await Promise.all([
    getCheckoutPrefill(),
    getPickupLocation(),
    getFooterHoursLines().catch(() => null),
  ]);

  const deliveryInitial = {
    contactName: prefill.deliveryName,
    phone: prefill.deliveryPhone,
    email: prefill.email,
    address: prefill.address,
    instructions: prefill.instructions,
    lat: prefill.lat,
    lng: prefill.lng,
  };

  // Pickup not offered (no pickup point / phone / option, or the backend
  // predates it) → exactly the delivery-only page that existed before.
  if (!pickupLocation) {
    return <DeliveryForm initial={deliveryInitial} />;
  }

  return (
    <FulfillmentChooser
      pickupLocation={pickupLocation}
      hoursLines={hoursLines}
      deliveryInitial={deliveryInitial}
      pickupInitial={{
        collectorName: prefill.pickupName,
        phone: prefill.pickupPhone,
        email: prefill.email,
      }}
      initialMethod={prefill.fulfillmentMethod}
    />
  );
}
