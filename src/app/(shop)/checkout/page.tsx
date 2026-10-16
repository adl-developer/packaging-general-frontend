import type { Metadata } from "next";
import { BusinessHoursNotice } from "@/components/checkout/business-hours-notice";
import { CompanyInfoForm } from "@/components/checkout/company-info-form";
import { getCheckoutPrefill } from "@/lib/actions/checkout";
import { ordersPausedPanel } from "@/components/orders-paused/orders-paused-gate";

export const metadata: Metadata = {
  title: "Checkout",
  // Private, transactional step — keep out of search indexes.
  robots: { index: false, follow: false },
};

// Prefill comes from the per-cookie cart + signed-in customer — never cache.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // Settings → Order Acceptance OFF → the "Orders paused" page (2026-10-16).
  const paused = await ordersPausedPanel();
  if (paused) return paused;

  const prefill = await getCheckoutPrefill();
  return (
    <CompanyInfoForm
      initial={{
        companyName: prefill.companyName,
        contactPerson: prefill.contactPerson,
        phone: prefill.contactPhone,
        email: prefill.email,
      }}
      // Informational only — never blocks ordering. Renders nothing until
      // business hours are configured in the admin portal. Passed in so the
      // form places it under the steps bar, never above it.
      notice={<BusinessHoursNotice />}
    />
  );
}
