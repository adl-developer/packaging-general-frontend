import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { getCustomer } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Packaging General account to order packaging online.",
  alternates: { canonical: "/sign-up" },
  robots: { index: false, follow: true },
};

export default async function SignUpPage() {
  // Already signed in — nothing to do here.
  if (await getCustomer()) redirect("/account/orders");
  return <AuthCard defaultTab="signup" />;
}
