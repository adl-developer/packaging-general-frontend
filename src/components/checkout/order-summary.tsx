import { MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatGhs } from "@/lib/format";
import { DiscountField } from "./discount-field";

export interface OrderLineItem {
  id: string;
  name: string;
  units: number;
  price: number;
}

interface OrderSummaryProps {
  items: OrderLineItem[];
  subtotal: number;
  total: number;
  deliveryAddress: string;
  /** Promotion code currently applied to the cart (cart.promotions). */
  appliedCode?: string | null;
  /** Live discount amount from the cart (cart.discount_total). */
  discount?: number;
  /** Shipping cost as quoted by the chosen carrier (cart.shipping_total). */
  shipping?: number;
  /** Name of the chosen shipping method, e.g. "Yango Delivery". */
  shippingMethod?: string | null;
}

function Divider() {
  return <div className="h-px w-full bg-line" />;
}

export function OrderSummary({
  items,
  subtotal,
  total,
  deliveryAddress,
  appliedCode,
  discount = 0,
  shipping = 0,
  shippingMethod,
}: OrderSummaryProps) {
  return (
    <Card className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>
          {items.length} {items.length === 1 ? "item" : "items"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">Items in your order:</p>
          <ul className="flex flex-col">
            {items.map((item, i) => (
              <li
                key={item.id}
                className={`flex items-start justify-between gap-4 py-2 ${
                  i < items.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-brand">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted">{item.units} units</span>
                </div>
                <span className="text-sm font-medium text-brand">
                  {formatGhs(item.price)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Divider />

        <DiscountField appliedCode={appliedCode} />

        <Divider />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-brand">{formatGhs(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">
                Discount{appliedCode ? ` (${appliedCode})` : ""}
              </span>
              <span className="font-medium text-plum">
                −{formatGhs(discount)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              Delivery{shippingMethod ? ` (${shippingMethod})` : ""}
            </span>
            <span className="text-brand">
              {shipping > 0 ? formatGhs(shipping) : "Calculating…"}
            </span>
          </div>
          <Divider />
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-lg font-semibold">
              {formatGhs(total)}
            </span>
          </div>
          <p className="text-xs text-muted">
            Includes VAT, NHIL, and all applicable fees
          </p>
        </div>

        <div className="flex items-start gap-2 border-t border-line pt-4">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-brand">Delivery to:</span>
            <span className="text-sm text-muted">{deliveryAddress}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
