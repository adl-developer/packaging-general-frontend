import type { Metadata } from "next";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";

export const metadata: Metadata = {
  title: "Verify Email",
  // Carries a one-time token in the URL — never index.
  robots: { index: false, follow: false },
};

// Token/email come from the per-request query string — never cache.
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  return <VerifyEmailCard token={token} email={email} />;
}
