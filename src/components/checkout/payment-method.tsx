"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Smartphone, CreditCard, ChevronDown } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatGhs } from "@/lib/format";
import { cn } from "@/lib/utils";

type Method = "mobile_money" | "card";

interface PaymentOptionProps {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onSelect: () => void;
}

function PaymentOption({
  selected,
  icon,
  title,
  subtitle,
  onSelect,
}: PaymentOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-option border-2 p-4 text-left transition-colors",
        selected
          ? "border-brand bg-brand/5"
          : "border-brand/50 hover:border-brand",
      )}
    >
      <span className="text-brand">{icon}</span>
      <span className="flex flex-col">
        <span className="text-base font-medium text-brand">{title}</span>
        <span className="text-sm font-medium text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

/**
 * Payment method chooser (Figma: Mobile Money + Card).
 * TODO(medusa/paystack): on Pay, create the payment session via the
 * medusa-payment-paystack provider and redirect to the authorization URL.
 */
export function PaymentMethod({ total }: { total: number }) {
  const router = useRouter();
  const [method, setMethod] = React.useState<Method>("mobile_money");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4" role="radiogroup" aria-label="Payment method">
        <PaymentOption
          selected={method === "mobile_money"}
          onSelect={() => setMethod("mobile_money")}
          icon={<Smartphone className="size-5" aria-hidden />}
          title="Mobile Money"
          subtitle="MTN, Vodafone, AirtelTigo"
        />
        <PaymentOption
          selected={method === "card"}
          onSelect={() => setMethod("card")}
          icon={<CreditCard className="size-5" aria-hidden />}
          title="Card Payment"
          subtitle="Visa, Mastercard"
        />
      </div>

      {method === "mobile_money" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="country-code">Country Code</Label>
            <button
              type="button"
              id="country-code"
              className="flex h-9 items-center justify-between rounded-button border border-transparent bg-surface px-3 text-sm font-medium text-brand"
            >
              🇬🇭 Ghana (+233)
              <ChevronDown className="size-4 text-muted" aria-hidden />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="momo-number">Mobile Money Number</Label>
            <Input id="momo-number" inputMode="tel" placeholder="24 123 4567" />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">
          You&apos;ll be securely redirected to Paystack to complete your card
          payment.
        </p>
      )}

      <Button
        variant="primary"
        fullWidth
        size="lg"
        onClick={() => router.push("/checkout/confirmation")}
      >
        Pay {formatGhs(total)}
      </Button>
    </div>
  );
}
