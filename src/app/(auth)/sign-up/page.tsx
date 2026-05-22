import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Packaging General account to order packaging online.",
  alternates: { canonical: "/sign-up" },
  robots: { index: false, follow: true },
};

export default function SignUpPage() {
  return <AuthCard defaultTab="signup" />;
}
