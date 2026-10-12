"use client";

import * as React from "react";
import { ChevronDown, Store, Truck } from "lucide-react";
import { m } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import type { PickupLocation } from "@/lib/pickup";
import { addressLine } from "@/lib/fulfillment";
import {
  DELIVERY_OFF_MESSAGE,
  PICKUP_OFF_MESSAGE,
  UNAVAILABLE_LABEL,
  type FulfillmentMethods,
} from "@/lib/fulfillment-methods";
import { cn } from "@/lib/utils";
import {
  OrderProgress,
  ProgressBackLink,
} from "@/components/checkout/order-progress";
import { DeliveryForm, type DeliveryInitial } from "./delivery-form";
import { PickupForm, type PickupInitial } from "./pickup-form";

/**
 * Checkout step 3 when pickup is offered (customer self-pickup, 2026-09-22):
 * two collapsed bars — "Pick up from our warehouse" and "Deliver to me".
 * Choosing one expands it (and closes the other); Delivery expands into the
 * existing delivery form unchanged. Both start collapsed unless the cart
 * already chose one (going back from payment re-opens that choice).
 *
 * When pickup is NOT offered the page renders the plain `DeliveryForm`
 * instead of this — see `app/(shop)/checkout/delivery/page.tsx`.
 *
 * Settings → Platform switches (2026-10-12): a switched-off method stays on
 * the page, greyed out as "Currently unavailable" and impossible to open
 * (user's choice over hiding it). The page never renders this with BOTH off.
 */
type Method = "pickup" | "delivery";

export function FulfillmentChooser({
  pickupLocation,
  hoursLines,
  deliveryInitial,
  pickupInitial,
  initialMethod,
  methods,
  accraOnly,
  yangoLiveQuotes = false,
}: {
  pickupLocation: PickupLocation;
  hoursLines: string[] | null;
  deliveryInitial: DeliveryInitial;
  pickupInitial: PickupInitial;
  initialMethod: Method | null;
  /** Which methods Settings → Platform has switched on. */
  methods: FulfillmentMethods;
  /** Home delivery Greater Accra only — passed to the delivery card. */
  accraOnly: boolean;
  /** Settings → Platform → Delivery quotes → "Live quotes" is on: the only
   *  time "Powered by Yango Delivery" shows (user rule, 2026-09-29). */
  yangoLiveQuotes?: boolean;
}) {
  // A cart that chose a method since switched off re-opens nothing on it.
  const [open, setOpen] = React.useState<Method | null>(
    initialMethod && methods[initialMethod] ? initialMethod : null,
  );
  // Back from payment on a now-unavailable method: say why it was dropped.
  const droppedMessage =
    initialMethod && !methods[initialMethod]
      ? initialMethod === "pickup"
        ? PICKUP_OFF_MESSAGE
        : DELIVERY_OFF_MESSAGE
      : null;

  return (
    <>
      <OrderProgress
        step={3}
        back={<ProgressBackLink href="/cart">Back to Cart</ProgressBackLink>}
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <m.div
          initial={{ y: 12 }}
          animate={{ y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
          className="mx-auto flex max-w-2xl flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-medium text-brand">
              Delivery Information
            </h1>
            <p className="text-base text-muted">
              How would you like to get your order?
            </p>
          </div>

          {droppedMessage && (
            <p
              role="alert"
              className="rounded-option border border-[rgba(251,44,54,0.4)] bg-[rgba(231,0,11,0.06)] px-4 py-3 text-sm font-medium text-brand"
            >
              {droppedMessage}
            </p>
          )}

          <OptionCard
            id="pickup"
            icon={Store}
            title="Pick up from our warehouse"
            subtitle={`Free · ${
              pickupLocation.display ??
              addressLine(pickupLocation.address, pickupLocation.city)
            }`}
            disabled={!methods.pickup}
            open={open === "pickup"}
            onToggle={() => setOpen((o) => (o === "pickup" ? null : "pickup"))}
          >
            <PickupForm
              location={pickupLocation}
              hoursLines={hoursLines}
              initial={pickupInitial}
            />
          </OptionCard>

          <OptionCard
            id="delivery"
            icon={Truck}
            title="Deliver to me"
            subtitle="Delivered by Yango in 2–3 business days"
            disabled={!methods.delivery}
            open={open === "delivery"}
            onToggle={() =>
              setOpen((o) => (o === "delivery" ? null : "delivery"))
            }
          >
            <DeliveryForm
              initial={deliveryInitial}
              embedded
              accraOnly={accraOnly}
              yangoLiveQuotes={yangoLiveQuotes}
              pickupAvailable={methods.pickup}
            />
          </OptionCard>
        </m.div>
      </div>
    </>
  );
}

function OptionCard({
  id,
  icon: Icon,
  title,
  subtitle,
  disabled = false,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: typeof Store;
  title: string;
  subtitle: string;
  /** Switched off in Settings → Platform: greyed out, can't be opened. */
  disabled?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = `fulfillment-${id}-panel`;
  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border bg-surface transition-colors",
        open ? "border-brand" : "border-line",
        disabled && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 disabled:cursor-not-allowed"
      >
        {/* Radio-style marker: the bars are a single choice. */}
        <span
          aria-hidden
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-full border-2",
            open ? "border-brand" : "border-line",
          )}
        >
          {open && <span className="size-2.5 rounded-full bg-brand" />}
        </span>
        <Icon className="size-5 shrink-0 text-plum" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-medium leading-6 text-brand">
            {title}
          </span>
          <span className="truncate text-sm leading-5 text-muted">
            {disabled ? UNAVAILABLE_LABEL : subtitle}
          </span>
        </span>
        {disabled ? (
          <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">
            Unavailable
          </span>
        ) : (
          <ChevronDown
            aria-hidden
            className={cn(
              "size-5 shrink-0 text-muted transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>
      {open && !disabled && (
        <div id={panelId} className="border-t border-line p-5 sm:p-6">
          {children}
        </div>
      )}
    </section>
  );
}
