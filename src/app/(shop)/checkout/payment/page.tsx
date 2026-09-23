import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  OrderSummary,
  type OrderLineItem,
} from "@/components/checkout/order-summary";
import { PaymentMethod } from "@/components/checkout/payment-method";
import { getCart } from "@/lib/actions/cart";
import { goodsLines, platformFeeTotal } from "@/lib/platform-fee";
import { addressLine, isPickupCart } from "@/lib/fulfillment";
import { OrderProgress, ProgressBackLink } from "@/components/checkout/order-progress";
import { chargeBreakdown } from "@/lib/charge-breakdown";
import { getLevies } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
};

// Read live cart data on each request (cart is per-cookie, can't be cached).
export const dynamic = "force-dynamic";

function formatAddress(addr: NonNullable<Awaited<ReturnType<typeof getCart>>>["shipping_address"]): string {
  if (!addr) return "";
  return [addr.address_1, addr.city, addr.country_code?.toUpperCase()]
    .filter(Boolean)
    .join(", ");
}

interface SearchParams {
  error?: string;
}

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const cart = await getCart();
  if (!cart || !cart.items?.length) redirect("/cart");
  if (!cart.shipping_address?.address_1 || !cart.shipping_methods?.length) {
    redirect("/checkout/delivery");
  }

  const { error } = await searchParams;

  // ⚠ The platform fee is a cart LINE (Medusa has no order-level fee) but it
  // is a charge, not something the customer chose — so it is pulled out of the
  // item list and out of Subtotal, and rendered as its own row beside delivery
  // and VAT. Doing one without the other double-counts it. See
  // `lib/platform-fee.ts`.
  // Items are shown BEFORE tax (line subtotal) — the levies are itemised
  // in the charge rows below, so the lines add up to Subtotal.
  const items: OrderLineItem[] = goodsLines(cart.items ?? []).map((line) => ({
    id: line.id,
    name: line.product_title ?? line.title ?? "Item",
    units: line.quantity,
    price: Number(line.subtotal ?? line.unit_price * line.quantity),
  }));
  const appliedCode =
    (cart.promotions ?? []).map((p) => p.code).find((c) => !!c) ?? null;
  const pickupAddr = cart.shipping_address;
  // Customer self-pickup (2026-09-22): the backend puts the collector at the
  // pickup point and flags the address; the cart records the choice too.
  const pickup = isPickupCart(
    cart.metadata as Record<string, unknown> | null,
    cart.shipping_address?.metadata as Record<string, unknown> | null,
  );
  // Subtotal → Discount → Delivery → Platform Fee → VAT → NHIL → GETFund →
  // Total (client, 2026-09-23) — same ladder as the receipt and emails.
  const { rows } = chargeBreakdown(
    {
      itemSubtotal: Number(cart.item_subtotal ?? 0),
      platformFee: platformFeeTotal(cart),
      shippingSubtotal: Number(cart.shipping_subtotal ?? 0),
      // Not on the SDK's StoreCart type, but Medusa computes and returns it
      // when requested (CART_FIELDS).
      discountSubtotal: Number(
        (cart as { discount_subtotal?: number }).discount_subtotal ?? 0,
      ),
      total: Number(cart.total ?? 0),
      method: pickup ? "pickup" : "delivery",
      discountLabel: appliedCode,
    },
    await getLevies(),
  );
  // Pickup: the address is the pickup point — one clean line, no "…Accra,
  // Ghana, Accra, GH" repeat.
  const deliveryAddress =
    pickup && pickupAddr?.address_1
      ? addressLine(pickupAddr.address_1, pickupAddr.city)
      : formatAddress(cart.shipping_address);

  return (
    <>
      <OrderProgress
        step={4}
        back={<ProgressBackLink href="/checkout/delivery">Back to Delivery</ProgressBackLink>}
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <OrderSummary
            items={items}
            rows={rows}
            appliedCode={appliedCode}
            deliveryAddress={deliveryAddress}
            pickup={pickup}
          />

          <Card className="flex flex-col gap-6">
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Choose how you&apos;d like to pay</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <PaymentMethod total={Number(cart.total ?? 0)} initialError={error} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
