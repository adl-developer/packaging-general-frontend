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
  const items: OrderLineItem[] = goodsLines(cart.items ?? []).map((line) => ({
    id: line.id,
    name: line.product_title ?? line.title ?? "Item",
    units: line.quantity,
    price: line.total ?? line.subtotal ?? 0,
  }));
  const platformFee = platformFeeTotal(cart);
  const subtotal =
    Math.round(((cart.item_total ?? cart.subtotal ?? 0) - platformFee) * 100) /
    100;
  const total = cart.total ?? 0;
  const discount = Number(cart.discount_total ?? 0);
  const shipping = Number(cart.shipping_total ?? cart.shipping_subtotal ?? 0);
  const shippingMethod = cart.shipping_methods?.[0]?.name ?? null;
  const appliedCode =
    (cart.promotions ?? []).map((p) => p.code).find((c) => !!c) ?? null;
  const pickupAddr = cart.shipping_address;
  // Customer self-pickup (2026-09-22): the backend puts the collector at the
  // pickup point and flags the address; the cart records the choice too.
  const pickup = isPickupCart(
    cart.metadata as Record<string, unknown> | null,
    cart.shipping_address?.metadata as Record<string, unknown> | null,
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
            subtotal={subtotal}
            platformFee={platformFee}
            total={total}
            discount={discount}
            shipping={shipping}
            shippingMethod={shippingMethod}
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
              <PaymentMethod total={total} initialError={error} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
