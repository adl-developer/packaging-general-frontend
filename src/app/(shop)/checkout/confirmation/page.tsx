import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { sdk } from "@/lib/medusa";

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
  let email: string | undefined;
  let company: string | undefined;
  let contactPerson: string | undefined;
  try {
    const { order } = await sdk.store.order.retrieve(orderId, {
      fields: "id,display_id,email,metadata",
    });
    displayId = order.display_id ?? undefined;
    email = order.email ?? undefined;
    const meta = (order.metadata ?? {}) as Record<string, unknown>;
    if (typeof meta.company_name === "string") company = meta.company_name;
    if (typeof meta.contact_person === "string") contactPerson = meta.contact_person;
  } catch (err) {
    // Guest orders may not be readable without an auth token — fall back to
    // showing the raw order id so the user at least has something to quote.
    console.warn("[confirmation] order.retrieve failed; showing id only:", err);
  }

  const formatted = displayId ? `PG-${displayId}` : orderId.replace(/^order_/, "PG-").toUpperCase();

  return (
    <OrderConfirmation
      orderNumber={formatted}
      email={email}
      company={company}
      contactPerson={contactPerson}
    />
  );
}
