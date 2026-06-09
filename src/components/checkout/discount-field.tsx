"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { applyPromoCode, removePromoCode } from "@/lib/actions/cart";

/**
 * Discount code entry, wired to Medusa promotions. Applying updates the
 * cart's promo_codes server-side; on success we router.refresh() so the
 * server-rendered totals (subtotal/discount/total) re-render from the live
 * cart. Medusa silently ignores unknown codes — the server action reports
 * that back as "Invalid discount code".
 */
export function DiscountField({
  appliedCode = null,
}: {
  /** Code currently attached to the cart (from cart.promotions). */
  appliedCode?: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function apply() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter a discount code");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await applyPromoCode(trimmed);
      if (result.ok) {
        setCode("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function remove() {
    if (!appliedCode) return;
    setError(null);
    startTransition(async () => {
      const result = await removePromoCode(appliedCode);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (appliedCode) {
    return (
      <div className="flex flex-col gap-2">
        <Label>Discount Code</Label>
        <div className="flex items-center justify-between gap-2 rounded-button border border-line bg-[rgba(196,188,176,0.3)] px-3 py-2">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-brand">
            <Check className="size-4" aria-hidden />
            {appliedCode} applied
          </span>
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            aria-label={`Remove discount code ${appliedCode}`}
            className="grid size-7 place-items-center rounded-button text-muted transition-colors hover:bg-line/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <X className="size-4" aria-hidden />
            )}
          </button>
        </div>
        {error && <FieldError>{error}</FieldError>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="discount-code">Discount Code</Label>
      <div className="flex gap-2">
        <Input
          id="discount-code"
          value={code}
          invalid={!!error}
          disabled={isPending}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Enter code"
        />
        <Button variant="outline" onClick={apply} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
