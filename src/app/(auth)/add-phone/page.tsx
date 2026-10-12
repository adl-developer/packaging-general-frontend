import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AddPhoneCard } from "@/components/auth/add-phone-card";
import { getCustomer } from "@/lib/actions/auth";
import { safeNextPath } from "@/lib/google-sign-in";

export const metadata: Metadata = {
  title: "Add Your Phone Number",
  robots: { index: false, follow: false },
};

// Per-customer — never cache.
export const dynamic = "force-dynamic";

/**
 * Where the Google callback sends a signed-in customer whose account has no
 * phone (client, 2026-10-12). Signed out → sign in; already has a phone →
 * straight on to `next`.
 */
export default async function AddPhonePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const customer = await getCustomer();
  if (!customer) redirect("/sign-in");
  if (customer.phone?.trim()) redirect(next);
  return <AddPhoneCard next={next} firstName={customer.first_name?.trim() || null} />;
}
