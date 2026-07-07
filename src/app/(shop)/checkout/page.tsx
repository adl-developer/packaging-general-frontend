import type { Metadata } from "next";
import { CompanyInfoForm } from "@/components/checkout/company-info-form";
import { getCheckoutPrefill } from "@/lib/actions/checkout";

export const metadata: Metadata = {
  title: "Checkout",
  // Private, transactional step — keep out of search indexes.
  robots: { index: false, follow: false },
};

// Prefill comes from the per-cookie cart + signed-in customer — never cache.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const prefill = await getCheckoutPrefill();
  return (
    <CompanyInfoForm
      initial={{
        companyName: prefill.companyName,
        contactPerson: prefill.contactPerson,
        phone: prefill.contactPhone,
        email: prefill.email,
      }}
    />
  );
}
