import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { sdk } from "@/lib/medusa";
import { formatOrderNumber } from "@/lib/order-number";
import { getCustomer, getOrderEmailAccountStatus } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface SearchParams {
  order?: string;
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { order: orderId } = await searchParams;
  if (!orderId) redirect("/");

  let displayId: string | number | undefined;
  let createdAt: string | undefined;
  let email: string | undefined;
  let company: string | undefined;
  let contactPerson: string | undefined;
  let total: number | undefined;
  let paymentProviderId: string | undefined;
  let deliveryOption: string | undefined;
  try {
    const { order } = await sdk.store.order.retrieve(orderId, {
      fields:
        "id,display_id,created_at,email,metadata,total,*payment_collections,payment_collections.payment_sessions,*shipping_methods",
    });
    displayId = order.display_id ?? undefined;
    createdAt = order.created_at ? String(order.created_at) : undefined;
    email = order.email ?? undefined;
    const meta = (order.metadata ?? {}) as Record<string, unknown>;
    if (typeof meta.company_name === "string") company = meta.company_name;
    if (typeof meta.contact_person === "string") contactPerson = meta.contact_person;
    total = order.total ?? undefined;
    const sessions =
      order.payment_collections?.flatMap((pc) => pc.payment_sessions ?? []) ?? [];
    paymentProviderId =
      sessions.find((s) => s.status === "authorized" || s.status === "captured")
        ?.provider_id ?? sessions[0]?.provider_id ?? undefined;
    deliveryOption = order.shipping_methods?.[0]?.name ?? undefined;
  } catch (err) {
    // Guest orders may not be readable without an auth token — fall back to
    // showing the raw order id so the user at least has something to quote.
    console.warn("[confirmation] order.retrieve failed; showing id only:", err);
  }

  const formatted = formatOrderNumber(displayId, createdAt, orderId);

  // Signed-in customers already have an account (and the order is linked to it),
  // so they must not see the post-checkout "Create Your Account" dialog.
  const isLoggedIn = !!(await getCustomer());

  // Which account dialog the guest sees: create-account (no account for this
  // email), verify-email (unverified account exists), or sign-in (verified
  // account exists). Order number + email gate the lookup server-side.
  const accountStatus =
    !isLoggedIn && email
      ? await getOrderEmailAccountStatus(formatted, email)
      : "none";

  return (
    <OrderConfirmation
      orderNumber={formatted}
      email={email}
      company={company}
      contactPerson={contactPerson}
      total={total}
      paymentProviderId={paymentProviderId}
      deliveryOption={deliveryOption}
      isLoggedIn={isLoggedIn}
      accountStatus={accountStatus}
    />
  );
}
