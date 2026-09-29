import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCustomer, getSignInMethods } from "@/lib/actions/auth";
import { AccountSettings } from "@/components/account/account-settings";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false },
};

// Customer-specific data — never cache.
export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const customer = await getCustomer();
  if (!customer) {
    redirect("/sign-in");
  }
  // Unknown (lookup failed) → treat as having a password: the old forms,
  // whose backend errors explain themselves.
  const methods = await getSignInMethods();
  const hasPassword = methods?.password ?? true;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand/70"
        >
          <ArrowLeft className="size-4" aria-hidden />
          My Orders
        </Link>
      </div>

      <Reveal className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold leading-9 text-brand">
          Account Settings
        </h1>
        <p className="text-base leading-6 text-muted">
          Manage the email and password you sign in with, or close your account.
        </p>
      </Reveal>

      <Reveal>
        <AccountSettings email={customer.email} hasPassword={hasPassword} />
      </Reveal>
    </div>
  );
}
