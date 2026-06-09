import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { getCustomer } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Packaging General account.",
  alternates: { canonical: "/sign-in" },
  robots: { index: false, follow: true },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  // Already signed in — nothing to do here.
  if (await getCustomer()) redirect("/account/orders");
  const { reset } = await searchParams;
  const notice =
    reset === "success"
      ? "Your password has been reset. Please sign in with your new password."
      : undefined;
  return <AuthCard defaultTab="signin" notice={notice} />;
}
