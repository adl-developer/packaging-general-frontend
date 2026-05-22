import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "Payment",
  // Checkout is a private, transactional step — keep it out of search indexes.
  robots: { index: false, follow: false },
};

// TODO(medusa): replace this sample data with the live cart from Medusa.
const items: OrderLineItem[] = [
  { id: "1", name: "Standard Shipping Carton", units: 50, price: 263.62 },
  { id: "2", name: "Packaging Tape - Brown", units: 1, price: 15.75 },
];
const subtotal = 279.37;
const total = 279.37;
const deliveryAddress = "123 Test Location, Spintex Rd., Accra";

export default function CheckoutPage() {
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
          discountCode="PGEASTERT"
        />

        <Card className="flex flex-col gap-6">
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Choose how you&apos;d like to pay</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <PaymentMethod total={total} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
