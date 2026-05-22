import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Packaging General account.",
  alternates: { canonical: "/sign-in" },
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return <AuthCard defaultTab="signin" />;
}
