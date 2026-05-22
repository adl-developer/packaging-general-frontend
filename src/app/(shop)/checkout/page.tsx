import type { Metadata } from "next";
import { CompanyInfoForm } from "@/components/checkout/company-info-form";

export const metadata: Metadata = {
  title: "Checkout",
  // Private, transactional step — keep out of search indexes.
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CompanyInfoForm />;
}
