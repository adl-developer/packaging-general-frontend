import { MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChargeRows } from "@/components/charge-rows";
import type { ChargeRow } from "@/lib/charge-breakdown";
import { formatGhs } from "@/lib/format";
import { DiscountField } from "./discount-field";

export interface OrderLineItem {
  id: string;
  name: string;
  units: number;
  price: number;
}

interface OrderSummaryProps {
  /** Goods only, BEFORE tax — the platform fee is a charge row, not an item,
   *  and the levies are itemised below, so the lines sum to Subtotal. */
  items: OrderLineItem[];
  /** The charge ladder (lib/charge-breakdown.ts): Subtotal → Discount →
   *  Delivery → Platform Fee → VAT → NHIL → GETFund → Total. */
  rows: ChargeRow[];
  deliveryAddress: string;
  /** Promotion code currently applied to the cart (cart.promotions). */
  appliedCode?: string | null;
  /** Customer self-pickup (2026-09-22): the address line "Pick up from:". */
  pickup?: boolean;
}

function Divider() {
  return <div className="h-px w-full bg-line" />;
}

export function OrderSummary({
  items,
  rows,
  deliveryAddress,
  appliedCode,
  pickup = false,
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

        <ChargeRows rows={rows} />

        <div className="flex items-start gap-2 border-t border-line pt-4">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-brand">
              {pickup ? "Pick up from:" : "Delivery to:"}
            </span>
            <span className="text-sm text-muted">{deliveryAddress}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
