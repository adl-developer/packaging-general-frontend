import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/actions/auth";
import { ReorderRunner } from "@/components/account/reorder-runner";

export const metadata: Metadata = {
  title: "Reorder",
  robots: { index: false, follow: false },
};

// Customer-specific — never cache.
export const dynamic = "force-dynamic";

/**
 * Deep-link target of the delivered email's "Reorder" button
 * (`/account/orders/reorder/<order id>`).
 *
 * Signed in → the runner performs the real one-click reorder (ownership is
 * enforced inside the action) and lands on /cart with the same items.
 * Signed out → the products page, which is where the button went before this
 * route existed (user decision 2026-09-18: no sign-in detour).
 */
export default async function ReorderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, customer] = await Promise.all([params, getCustomer()]);
  if (!customer) {
    redirect("/products");
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold leading-9 text-brand">Reorder</h1>
      <ReorderRunner orderId={id} />
    </div>
  );
}
