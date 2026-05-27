import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

  const items: OrderLineItem[] = (cart.items ?? []).map((line) => ({
    id: line.id,
    name: line.product_title ?? line.title ?? "Item",
    units: line.quantity,
    price: line.total ?? line.subtotal ?? 0,
  }));
  const subtotal = cart.item_total ?? cart.subtotal ?? 0;
  const total = cart.total ?? 0;
  const deliveryAddress = formatAddress(cart.shipping_address);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/checkout/delivery"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand/70"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to Delivery
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OrderSummary
          items={items}
          subtotal={subtotal}
          total={total}
          deliveryAddress={deliveryAddress}
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
  );
}
