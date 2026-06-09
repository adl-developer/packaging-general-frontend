import type { Metadata } from "next";
import { ResetPasswordCard } from "@/components/auth/reset-password-card";

export const metadata: Metadata = {
  title: "Reset Password",
  // Carries a one-time token in the URL — never index.
  robots: { index: false, follow: false },
};

// Token/email come from the per-request query string — never cache.
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  return <ResetPasswordCard token={token} email={email} />;
}
