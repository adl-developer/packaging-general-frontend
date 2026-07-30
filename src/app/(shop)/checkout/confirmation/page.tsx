import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
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
  /** Set by /checkout/callback when Paystack's payment succeeded but
   *  cart.complete() failed — see the safe post-payment-failure branch in
   *  lib/actions/checkout.ts. */
  pending?: string;
  ref?: string;
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { order: orderId, pending, ref } = await searchParams;

  // Payment succeeded, order completion did not — never show a raw error or
  // imply the money wasn't taken. This branch has no order to look up.
  if (pending === "1") {
    return <PendingConfirmation reference={ref} />;
  }

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

/**
 * Rendered when `/checkout/callback` hit its safe post-payment-failure
 * branch: Paystack already charged the customer, but `cart.complete()`
 * failed (most likely the manage_inventory/allow_backorder stock guard —
 * see lib/actions/checkout.ts). Staff are alerted server-side before this
 * page ever renders (fire-and-forget from the callback route).
 *
 * Wording is deliberately reassuring and specific: never a raw error, never
 * anything implying the money wasn't taken or that the order is lost, never
 * a prompt to pay again.
 */
function PendingConfirmation({ reference }: { reference?: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 rounded-card border-2 border-[#fde68a] bg-surface pb-6 pt-12 px-6 text-center">
        <span className="grid place-items-center rounded-full bg-[#fef3c7] p-8">
          <Clock className="size-20 text-[#b45309]" aria-hidden />
        </span>

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold leading-9 text-brand">
            Payment received — your order needs confirmation
          </h1>
          <p className="text-lg text-muted">
            We&apos;ve received your payment. Our team has already been
            notified and will confirm your order shortly.
          </p>
        </div>

        {reference && (
          <div className="flex w-full max-w-[448px] flex-col gap-2 rounded-option border border-[#e5e7eb] bg-[#f9fafb] p-[25px] text-left">
            <span className="text-sm text-muted">Payment Reference:</span>
            <span className="break-all font-mono text-base font-bold text-brand">
              {reference}
            </span>
          </div>
        )}

        <p className="max-w-[448px] text-sm text-muted">
          Please keep this reference for your records. If you&apos;d like to
          check in sooner, contact our support team and quote it.
        </p>

        <div className="flex w-full max-w-[448px] gap-4">
          <Link
            href="/products"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-button bg-brand px-6 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
