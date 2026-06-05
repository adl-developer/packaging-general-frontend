"use client";

import * as React from "react";
import { Smartphone, CreditCard, ChevronDown, Loader2 } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatGhs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { initiatePaystack } from "@/lib/actions/checkout";

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
 * Payment method chooser. The Mobile Money / Card toggle is presentational —
 * Paystack's hosted page lets the user pick between channels (MoMo, card,
 * USSD, bank) regardless. Pressing Pay initiates a Paystack payment session
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

  function onPay() {
    setError(null);
    startTransition(async () => {
      const result = await initiatePaystack();
      if (!result.ok) {
        setError(result.error);
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

      <AnimatePresence mode="wait" initial={false}>
        {method === "mobile_money" ? (
          <motion.div
            key="momo"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DURATION.fast, ease: EASE_PREMIUM }}
            className="flex flex-col gap-4"
          >
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
              <p className="text-xs text-muted">
                You&apos;ll authorize the payment on Paystack and confirm the prompt
                on this phone.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="card"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DURATION.fast, ease: EASE_PREMIUM }}
            className="text-sm text-muted"
          >
            You&apos;ll be securely redirected to Paystack to complete your card
            payment.
          </motion.p>
        )}
      </AnimatePresence>

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
