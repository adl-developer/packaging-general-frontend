"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Factory,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGhs } from "@/lib/format";

/**
 * Track Order — Figma frames: search (469:17227), found/timeline
 * (424:3550), not-found alert (452:12370). Card border #e2e1e0, rust accent
 * (#964022) primary, lavender (#b8a8d9) for the current timeline step.
 *
 * TODO(medusa): replace SAMPLE_ORDER + the lookup with the real order API.
 */
type StepState = "current" | "pending";

interface TimelineStep {
  title: string;
  detail: string;
  state: StepState;
  Icon: React.ComponentType<{ className?: string }>;
}

interface TrackedOrder {
  number: string;
  placedOn: string;
  status: string;
  steps: TimelineStep[];
  customer: { name: string; phone: string; email: string };
  product: {
    name: string;
    size: string;
    material: string;
    printing: string;
    quantity: string;
  };
  address: string;
  pricing: {
    itemName: string;
    itemQty: string;
    itemPrice: number;
    fees: number;
    taxes: number;
    total: number;
  };
}

const SAMPLE_ORDER: TrackedOrder = {
  number: "PG-52889553",
  placedOn: "Placed on 12 May 2026",
  status: "Order Received",
  steps: [
    {
      title: "Order Received",
      detail: "Your order has been received and is being reviewed",
      state: "current",
      Icon: CheckCircle2,
    },
    { title: "In Production", detail: "Production will start soon", state: "pending", Icon: Factory },
    { title: "Ready for Delivery", detail: "Pending", state: "pending", Icon: Truck },
    { title: "Delivered", detail: "Pending", state: "pending", Icon: PackageCheck },
  ],
  customer: {
    name: "Emmanuel Ntim",
    phone: "+233 45678912",
    email: "entim@gmail.com",
  },
  product: {
    name: "Packaging Tape - Brown",
    size: "Standard",
    material: "Standard",
    printing: "No Printing",
    quantity: "1 units",
  },
  address: "123 Test Location, Spintex Rd, Accra",
  pricing: {
    itemName: "Packaging Tape - Brown",
    itemQty: "1 units",
    itemPrice: 12.5,
    fees: 0.63,
    taxes: 2.63,
    total: 15.75,
  },
};

const cardClass = "rounded-card border-2 border-[#e2e1e0] bg-surface";

export function TrackOrder() {
  const [query, setQuery] = React.useState("");
  const [result, setResult] = React.useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = query.trim();
    if (!value) return;
    // TODO(medusa): real lookup. Demo: any "PG-…" number resolves to the sample.
    if (/^PG-/i.test(value)) {
      setResult({ ...SAMPLE_ORDER, number: value.toUpperCase() });
      setNotFound(null);
    } else {
      setResult(null);
      setNotFound(value);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Search card */}
      <section className={cardClass}>
        <div className="flex flex-col gap-1 p-6">
          <h1 className="flex items-center gap-2 text-base font-medium tracking-tight text-brand">
            <Search className="size-5 text-rust" aria-hidden />
            Track Your Order
          </h1>
          <p className="text-base text-muted">
            Enter your order number to view the current status of your delivery
          </p>
        </div>
        <form className="flex flex-col gap-2 px-6 pb-6" onSubmit={onSubmit}>
          <label htmlFor="order-number" className="text-sm font-medium text-brand">
            Order Number
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="order-number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., PG-2026-001"
              className="h-9 flex-1 rounded-button border border-input bg-surface px-3 text-sm text-brand placeholder:text-muted focus-visible:border-brand focus-visible:outline-none"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-2 rounded-button bg-rust/90 px-4 text-sm font-medium text-white transition-colors hover:bg-rust"
              >
                <Search className="size-4" aria-hidden />
                Track Order
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-button border border-line bg-background px-4 text-sm font-medium text-brand transition-colors hover:bg-line/30"
              >
                <Download className="size-4" aria-hidden />
                View Invoice
              </button>
            </div>
          </div>
          <p className="text-xs text-muted">
            You can find your order number in the confirmation email or SMS
          </p>
        </form>
      </section>

      {notFound && <NotFoundAlert query={notFound} />}
      {result && <OrderResult order={result} />}
    </div>
  );
}

function NotFoundAlert({ query }: { query: string }) {
  return (
    <section className="flex items-start gap-3 rounded-card border-2 border-[rgba(202,53,0,0.3)] bg-[rgba(202,53,0,0.06)] p-6">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#ca3500]" aria-hidden />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold leading-7 tracking-tight text-[#7e2a0c]">
          Order Not Found
        </h2>
        <p className="text-sm leading-5 text-[#ca3500]">
          We couldn&apos;t find an order with the number &quot;{query}&quot;.
          Please check the order number and try again.
        </p>
      </div>
    </section>
  );
}

function OrderResult({ order }: { order: TrackedOrder }) {
  return (
    <>
      {/* Status timeline */}
      <section className={cardClass}>
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium tracking-tight text-brand">
                Order {order.number}
              </h2>
              <p className="text-base text-muted">{order.placedOn}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-[rgba(150,64,34,0.3)] bg-[rgba(150,64,34,0.1)] px-3 py-2 text-base font-medium text-rust">
              <CheckCircle2 className="size-5" aria-hidden />
              {order.status}
            </span>
          </div>

          <ol className="relative flex flex-col gap-6 px-6 pt-2">
            {/* Vertical connector */}
            <span
              className="absolute left-[calc(1.5rem+23px)] top-6 bottom-6 w-0.5 bg-[#e2e1e0]"
              aria-hidden
            />
            {order.steps.map((step) => (
              <li key={step.title} className="relative flex items-start gap-4">
                <span
                  className={cn(
                    "z-10 grid size-12 shrink-0 place-items-center rounded-full border-2",
                    step.state === "current"
                      ? "border-accent bg-[rgba(184,168,217,0.1)] text-accent"
                      : "border-input bg-[#f3f4f6] text-[#99a1af]",
                  )}
                >
                  <step.Icon className="size-6" />
                </span>
                <div className="flex flex-col gap-0.5 pt-1">
                  <p className="text-base font-semibold tracking-tight text-brand">
                    {step.title}
                  </p>
                  {step.state === "current" && (
                    <p className="text-sm text-muted">12 May, 05:28</p>
                  )}
                  <p className="text-sm text-muted">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Order details */}
      <section className={cn(cardClass, "overflow-hidden")}>
        <div className="border-b-2 border-[#e2e1e0] bg-mist px-6 py-5">
          <h2 className="text-base font-medium tracking-tight text-brand">
            Order Details
          </h2>
        </div>
        <div className="flex flex-col gap-6 p-6">
          <DetailGrid
            rows={[
              ["Name:", order.customer.name],
              ["Phone:", order.customer.phone],
              ["Email:", order.customer.email],
            ]}
          />

          <DetailBlock title="Product Information">
            <DetailGrid
              rows={[
                ["Product:", order.product.name],
                ["Size:", order.product.size],
                ["Material:", order.product.material],
                ["Printing:", order.product.printing],
                ["Quantity:", order.product.quantity],
              ]}
            />
          </DetailBlock>

          <DetailBlock title="Delivery Information">
            <DetailGrid rows={[["Address:", order.address]]} />
          </DetailBlock>

          <DetailBlock title="Pricing Summary">
            <div className="rounded-option border border-[rgba(150,64,34,0.2)] bg-[rgba(150,64,34,0.05)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium tracking-tight text-brand">
                    {order.pricing.itemName}
                  </p>
                  <p className="text-sm text-muted">{order.pricing.itemQty}</p>
                </div>
                <p className="text-base font-semibold tracking-tight text-brand">
                  {formatGhs(order.pricing.itemPrice)}
                </p>
              </div>
              <dl className="mt-3 flex flex-col gap-1 border-t border-[rgba(150,64,34,0.2)] pt-3 text-xs">
                <SummaryRow label="Processing fee + Delivery" value={order.pricing.fees} />
                <SummaryRow
                  label="Taxes (VAT + NHIL + GETFund)"
                  value={order.pricing.taxes}
                />
                <div className="flex items-center justify-between pt-1 font-medium text-brand">
                  <dt>Total</dt>
                  <dd>{formatGhs(order.pricing.total)}</dd>
                </div>
              </dl>
            </div>
          </DetailBlock>
        </div>
      </section>
    </>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-semibold tracking-tight text-brand">{title}</h3>
      {children}
    </div>
  );
}

function DetailGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2 text-sm">
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium text-brand">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-muted">
      <dt>{label}</dt>
      <dd>{formatGhs(value)}</dd>
    </div>
  );
}
