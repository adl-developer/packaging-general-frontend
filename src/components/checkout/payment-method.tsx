"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Smartphone, CreditCard, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatGhs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { initiatePaystack } from "@/lib/actions/checkout";
import type { PaymentMethodChoice } from "@/lib/paystack-channels";

type Method = PaymentMethodChoice;

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
        "flex w-full items-center gap-3 rounded-option border-2 p-4 text-left transition-[color,background-color,border-color] duration-200",
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
 * Payment method chooser. The Mobile Money / Card choice is sent to Paystack
 * as its `channels`, so the hosted page opens on that method only
 * (2026-10-06). Paystack asks for the MoMo number or card details itself, so
 * this step collects no payment details. Pressing Pay initiates a Paystack payment session
 * and redirects to the authorization URL; on return Paystack hits
 * /checkout/callback?reference=… which completes the cart.
 */
export function PaymentMethod({
  total,
  initialError,
}: {
  total: number;
  initialError?: string;
}) {
  const [method, setMethod] = React.useState<Method>("mobile_money");
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const router = useRouter();

  function onPay() {
    setError(null);
    startTransition(async () => {
      const result = await initiatePaystack(method);
      if (!result.ok) {
        setError(result.error);
        // The cart's figures were just brought up to date (a product changed
        // price or weight): re-render the summary so the new total is the one
        // on screen before they press Pay again. This state survives it.
        if (result.refresh) router.refresh();
        return;
      }
      window.location.href = result.authorizationUrl;
    });
  }

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

      {/* Customers were closing the tab on Paystack's page before the payment
          finished (2026-10-06). */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-option border border-[rgba(184,168,217,0.4)] bg-accent/10 px-3 py-2.5 text-sm text-brand"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-plum" aria-hidden />
        <div className="flex flex-col gap-1">
          <p>
            On the next page, powered by Paystack, enter your payment details,
            then wait while your payment is processed.
          </p>
          <p className="font-medium">
            Do not close the window or tab until the payment is complete.
          </p>
          <p>
            Once it succeeds, you&apos;ll be redirected to your order
            confirmation automatically.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-button bg-[rgba(231,0,11,0.08)] px-3 py-2 text-sm font-medium text-[#7e2a0c]">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        fullWidth
        size="lg"
        onClick={onPay}
        disabled={isPending}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Redirecting to Paystack…
          </span>
        ) : (
          <>Pay {formatGhs(total)}</>
        )}
      </Button>
    </div>
  );
}
