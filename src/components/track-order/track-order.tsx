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
import { motion, AnimatePresence } from "motion/react";
import {
  DURATION,
  EASE_PREMIUM,
  SPRING_SOFT,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";
import { InvoiceDialog, type InvoiceData } from "./invoice-dialog";

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

/** Build a sample invoice payload from a tracked order. The breakdown numbers
 *  the invoice needs (subtotal / platform fee / delivery fee / VAT / NHIL /
 *  GETFund) aren't in TrackedOrder yet, so we re-derive them from the line
 *  unit price for now. TODO(medusa): replace with the real invoice payload. */
function buildInvoice(order: TrackedOrder): InvoiceData {
  const subtotal = order.pricing.itemPrice;
  const platformFee = 0.63;
  const deliveryFee = 0;
  const totalBeforeTax = subtotal + platformFee + deliveryFee;
  const vat = +(totalBeforeTax * 0.15).toFixed(2);
  const nhil = +(totalBeforeTax * 0.025).toFixed(2);
  const getfund = +(totalBeforeTax * 0.025).toFixed(2);
  const itemTotal = +(totalBeforeTax + vat + nhil + getfund).toFixed(2);
  return {
    orderNumber: order.number,
    invoiceDate: order.placedOn.replace(/^Placed on /, ""),
    billTo: {
      name: order.customer.name,
      email: order.customer.email,
      phone: order.customer.phone,
      address: order.address,
    },
    line: {
      name: order.pricing.itemName,
      specs: `${order.product.size} • ${order.product.material} • ${order.product.printing}`,
      quantity: order.pricing.itemQty,
      subtotal,
      platformFee,
      deliveryFee,
      totalBeforeTax,
      vat,
      nhil,
      getfund,
      itemTotal,
    },
    totalAmount: itemTotal,
    eVat: {
      sdcId: "ES00001001",
      receiptNumber: "1001-6Z1B-N51S",
      internalData: "VYFZW-WZSQ-LHQY-GRNG-YE3W-SJEZ-WP",
      receiptCounter: "ReceiptCounter3",
      mrc: ":00:0C:29:0D:90:D0",
      dateTime: "2026/05/12 05:03:16",
      lineItemCount: "1",
    },
    qrPayload: `pg-invoice:${order.number}`,
  };
}

export function TrackOrder() {
  const [query, setQuery] = React.useState("");
  const [result, setResult] = React.useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = React.useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = React.useState(false);
  const resultAnchorRef = React.useRef<HTMLDivElement | null>(null);

  const invoiceData = React.useMemo(
    () => buildInvoice(result ?? SAMPLE_ORDER),
    [result],
  );

  // Scroll the result/not-found section into view after a successful submit.
  // Respects reduced-motion via `behavior: "smooth"` (browsers honor the pref).
  React.useEffect(() => {
    if (!result && !notFound) return;
    const id = window.requestAnimationFrame(() => {
      resultAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [result, notFound]);

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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
      {/* Search card */}
      <section className={cardClass}>
        <div className="flex flex-col gap-1 p-4 sm:p-6">
          <h1 className="flex items-center gap-2 text-base font-medium tracking-tight text-brand">
            <Search className="size-5 text-rust" aria-hidden />
            Track Your Order
          </h1>
          <p className="text-sm text-muted sm:text-base">
            Enter your order number to view the current status of your delivery
          </p>
        </div>
        <form
          className="flex flex-col gap-2 px-4 pb-4 sm:px-6 sm:pb-6"
          onSubmit={onSubmit}
        >
          <label htmlFor="order-number" className="text-sm font-medium text-brand">
            Order Number
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="order-number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., PG-2026-001"
              className="w-full flex-1 rounded-full border border-line bg-surface px-5 py-2 text-base leading-6 text-brand placeholder:text-muted/70 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/15 sm:py-2.5 sm:text-sm sm:leading-5"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-button bg-rust/90 px-4 text-sm font-medium text-white transition-colors hover:bg-rust sm:w-auto"
              >
                <Search className="size-4" aria-hidden />
                Track Order
              </button>
              <button
                type="button"
                onClick={() => setInvoiceOpen(true)}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-button border border-line bg-background px-4 text-sm font-medium text-brand transition-colors hover:bg-line/30 sm:w-auto"
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

      {/* Scroll target — sits above the result so smooth scroll lands at the
          top of the result block (offset for the sticky site header). */}
      <div
        ref={resultAnchorRef}
        aria-hidden
        className="scroll-mt-[140px] sm:scroll-mt-[160px]"
      />

      <AnimatePresence mode="wait">
        {notFound && (
          <motion.div
            key="not-found"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
          >
            <NotFoundAlert query={notFound} />
          </motion.div>
        )}
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
            className="flex flex-col gap-8"
          >
            <OrderResult order={result} />
          </motion.div>
        )}
      </AnimatePresence>

      <InvoiceDialog
        open={invoiceOpen}
        invoice={invoiceData}
        onClose={() => setInvoiceOpen(false)}
      />
    </div>
  );
}

function NotFoundAlert({ query }: { query: string }) {
  return (
    <section className="flex items-start gap-3 rounded-card border-2 border-[rgba(202,53,0,0.3)] bg-[rgba(202,53,0,0.06)] p-4 sm:p-6">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#ca3500]" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-lg font-semibold leading-7 tracking-tight text-[#7e2a0c]">
          Order Not Found
        </h2>
        <p className="break-words text-sm leading-5 text-[#ca3500]">
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
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium tracking-tight text-brand">
                Order {order.number}
              </h2>
              <p className="text-sm text-muted sm:text-base">{order.placedOn}</p>
            </div>
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING_SOFT}
              className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-[rgba(150,64,34,0.3)] bg-[rgba(150,64,34,0.1)] px-3 py-1.5 text-sm font-medium text-rust sm:py-2 sm:text-base"
            >
              <CheckCircle2 className="size-4 sm:size-5" aria-hidden />
              {order.status}
            </motion.span>
          </div>

          <motion.ol
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="relative flex flex-col gap-6 pt-2 sm:px-6"
          >
            {/* Vertical connector — left edge sits at center of the 48px icon
                (size-12). Mobile: 24px (no extra inset). Desktop: 24px + the
                sm:px-6 inset (1.5rem). */}
            <span
              className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-[#e2e1e0] sm:left-[calc(1.5rem+23px)]"
              aria-hidden
            />
            {order.steps.map((step) => (
              <motion.li
                variants={staggerItem}
                key={step.title}
                className="relative flex items-start gap-4"
              >
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
                <div className="flex min-w-0 flex-col gap-0.5 pt-1">
                  <p className="text-base font-semibold tracking-tight text-brand">
                    {step.title}
                  </p>
                  {step.state === "current" && (
                    <p className="text-sm text-muted">12 May, 05:28</p>
                  )}
                  <p className="text-sm text-muted">{step.detail}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* Order details */}
      <section className={cn(cardClass, "overflow-hidden")}>
        <div className="border-b-2 border-[#e2e1e0] bg-mist px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-base font-medium tracking-tight text-brand">
            Order Details
          </h2>
        </div>
        <div className="flex flex-col gap-6 p-4 sm:p-6">
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-base font-medium tracking-tight text-brand">
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
        <div key={label} className="flex min-w-0 flex-wrap gap-x-2 text-sm">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 break-words font-medium text-brand">{value}</dd>
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
