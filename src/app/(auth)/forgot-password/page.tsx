import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForgotPasswordCard } from "@/components/auth/forgot-password-card";
import { getCustomer } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Packaging General account password.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: true },
};

export default async function ForgotPasswordPage() {
  // Already signed in — no reason to reset from here.
  if (await getCustomer()) redirect("/account/orders");
  return <ForgotPasswordCard />;
}
