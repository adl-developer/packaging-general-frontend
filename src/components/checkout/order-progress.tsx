import Link from "next/link";
import type * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The five stages of placing an order, shown as "Step N of 5" + a progress bar
 * at the top of every page in the buying flow (user request 2026-09-22):
 *
 *   1 Shopping & cart        /products/[slug], /cart
 *   2 Contact info           /checkout
 *   3 Delivery info          /checkout/delivery
 *   4 Payment info           /checkout/payment
 *   5 Submit & confirmation  /checkout/confirmation
 *
 * Replaces the product page's old scroll-spy counter, which only counted that
 * page's own form sections ("Step 1 of 3") and so said nothing about where
 * the shopper was in the order as a whole.
 */
export const ORDER_STEPS = [
  "Shopping & cart",
  "Contact info",
  "Delivery info",
  "Payment info",
  "Submit & confirmation",
] as const;

export type OrderStep = 1 | 2 | 3 | 4 | 5;

export function orderStepLabel(step: OrderStep): string {
  return ORDER_STEPS[step - 1];
}

/**
 * Full-width strip: back control on the left, "Step N of 5" on the right,
 * bar underneath. Same markup the product page's sticky header always
 * had, so its height (which the gallery's sticky offset depends on) is
 * unchanged. Pass `className` for positioning (the product page makes it
 * sticky); every other page renders it in flow.
 */
export function OrderProgress({
  step,
  back,
  className,
}: {
  step: OrderStep;
  /** Left-hand control, usually a <ProgressBackLink>. Omit on pages with no
   *  sensible way back (confirmation). */
  back?: React.ReactNode;
  className?: string;
}) {
  const total = ORDER_STEPS.length;
  const label = orderStepLabel(step);
  return (
    <div className={cn("mx-auto w-full max-w-7xl", className)}>
      <div className="border-b border-line bg-surface">
        <div className="flex flex-col gap-3 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {back ?? <span aria-hidden />}
            {/* Count only (user, 2026-09-22) — the step name is not shown;
                screen readers still hear it via the bar's aria-valuetext. */}
            <span className="whitespace-nowrap text-right text-sm text-muted">
              Step {step} of {total}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Order progress"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={step}
            aria-valuetext={`Step ${step} of ${total}: ${label}`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3f4f6]"
          >
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${(step / total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const progressBackClass =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-button px-3 text-sm font-medium text-brand transition-colors hover:text-brand/70";

/** The strip's back control as a plain link. */
export function ProgressBackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={progressBackClass}>
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
