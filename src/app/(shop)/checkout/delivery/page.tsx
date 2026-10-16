import type { Metadata } from "next";
import { DeliveryForm } from "@/components/checkout/delivery-form";
import { FulfillmentChooser } from "@/components/checkout/fulfillment-chooser";
import { CheckoutPausedNotice } from "@/components/checkout/checkout-paused-notice";
import {
  OrderProgress,
  ProgressBackLink,
} from "@/components/checkout/order-progress";
import { checkoutOpen } from "@/lib/fulfillment-methods";
import { getCheckoutPrefill } from "@/lib/actions/checkout";
import { getPickupLocation } from "@/lib/pickup";
import {
  getDeliveryAreaAccraOnly,
  getFooterHoursLines,
  getFulfillmentMethods,
  getYangoLiveQuotes,
} from "@/lib/site-content";
import { ordersPausedPanel } from "@/components/orders-paused/orders-paused-gate";

export const metadata: Metadata = {
  title: "Delivery",
  // Private, transactional step — keep out of search indexes.
  robots: { index: false, follow: false },
};

// Prefill comes from the per-cookie cart + signed-in customer — never cache.
export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  // Settings → Order Acceptance OFF → the "Orders paused" page (2026-10-16).
  const paused = await ordersPausedPanel();
  if (paused) return paused;

  const [prefill, pickupLocation, hoursLines, accraOnly, yangoLiveQuotes, methods] = await Promise.all([
    getCheckoutPrefill(),
    getPickupLocation(),
    getFooterHoursLines().catch(() => null),
    // Same cached site-content read as the hours above — no extra request.
    getDeliveryAreaAccraOnly(),
    getYangoLiveQuotes(),
    getFulfillmentMethods(),
  ]);

  // Settings → Platform pickup / delivery switches (2026-10-12). Nothing the
  // customer could choose (both off, or delivery off with no pickup point) →
  // checkout is paused: no form, just the contact options.
  if (!checkoutOpen(methods, Boolean(pickupLocation))) {
    return (
      <>
        <OrderProgress
          step={3}
          back={<ProgressBackLink href="/cart">Back to Cart</ProgressBackLink>}
        />
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <h1 className="text-base font-medium text-brand">Delivery Information</h1>
            <CheckoutPausedNotice />
          </div>
        </div>
      </>
    );
  }

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
    return (
      <DeliveryForm
        initial={deliveryInitial}
        accraOnly={accraOnly}
        yangoLiveQuotes={yangoLiveQuotes}
      />
    );
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
      methods={methods}
      accraOnly={accraOnly}
      yangoLiveQuotes={yangoLiveQuotes}
    />
  );
}
