"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Factory,
  Loader2,
  PackageCheck,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGhs } from "@/lib/format";
import { lookupOrder, type OrderLookupResult } from "@/lib/actions/orders";
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
 * Wired to the real GET /store/order-lookup backend route (order number +
 * email). The invoice is derived from the looked-up order's totals; its E-VAT
 * receipt fields stay blank until real GRA e-invoicing data exists on the
 * backend.
 */
type StepState = "completed" | "current" | "pending";

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
  canceled: boolean;
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

const cardClass = "rounded-card border-2 border-[#e2e1e0] bg-surface";

/** Build the invoice payload from a looked-up order's REAL totals: subtotal,
 *  delivery and total come straight from the order; the single tax_total is
 *  split across the Ghana levy lines proportionally (VAT 15 / NHIL 2.5 /
 *  GETFund 2.5 of the 20-point bundle) so the lines always sum to the actual
 *  amount charged. E-VAT receipt fields stay blank until the backend issues
 *  real GRA e-invoicing data. */
function buildInvoice(order: TrackedOrder): InvoiceData {
  const subtotal = order.pricing.itemPrice;
  const deliveryFee = order.pricing.fees;
  const taxes = order.pricing.taxes;
  const total = order.pricing.total;
  const totalBeforeTax = +(total - taxes).toFixed(2);
  const vat = +((taxes * 15) / 20).toFixed(2);
  const nhil = +((taxes * 2.5) / 20).toFixed(2);
  const getfund = +(taxes - vat - nhil).toFixed(2);
  const specs = [
    order.product.size,
    order.product.material,
    order.product.printing,
  ]
    .filter((s) => s && s !== "—")
    .join(" • ");
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
      specs,
      quantity: order.pricing.itemQty,
      subtotal,
      platformFee: 0,
      deliveryFee,
      totalBeforeTax,
      vat,
      nhil,
      getfund,
      itemTotal: total,
    },
    totalAmount: total,
    eVat: {
      sdcId: "—",
      receiptNumber: "—",
      internalData: "—",
      receiptCounter: "—",
      mrc: "—",
      dateTime: "—",
      lineItemCount: "—",
    },
    qrPayload: `pg-invoice:${order.number}`,
  };
}

const trackDateFmt = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const STEP_META: { title: string; detail: string; Icon: TimelineStep["Icon"] }[] =
  [
    {
      title: "Order Received",
      detail: "Your order has been received and is being reviewed",
      Icon: CheckCircle2,
    },
    {
      title: "In Production",
      detail: "Your order is being produced",
      Icon: Factory,
    },
    {
      title: "Ready for Delivery",
      detail: "Your order is ready and awaiting dispatch",
      Icon: Truck,
    },
    {
      title: "Delivered",
      detail: "Your order has been delivered",
      Icon: PackageCheck,
    },
  ];

/** Map the real backend lookup result onto the TrackedOrder UI shape. */
function mapToTracked(o: OrderLookupResult): TrackedOrder {
  const canceled = o.status === "canceled";
  const firstItem = o.items[0];
  const totalQty = o.items.reduce((n, i) => n + i.quantity, 0);
  const steps: TimelineStep[] = STEP_META.map((m, idx) => ({
    title: m.title,
    detail:
      idx === o.current_step ? m.detail : idx < o.current_step ? "Completed" : "Pending",
    state:
      idx < o.current_step
        ? "completed"
        : idx === o.current_step
          ? "current"
          : "pending",
    Icon: m.Icon,
  }));
  return {
    number: o.number,
    placedOn: o.placed_on
      ? `Placed on ${trackDateFmt.format(new Date(o.placed_on))}`
      : "",
    status: canceled
      ? "Order Canceled"
      : (STEP_META[o.current_step]?.title ?? "Order Received"),
    canceled,
    steps,
    customer: {
      name: o.customer.name || "—",
      phone: o.customer.phone || "—",
      email: o.customer.email,
    },
    product: {
      name: firstItem?.title ?? "Your order",
      size: o.items.length > 1 ? `${o.items.length} products` : "—",
      material: "—",
      printing: "—",
      quantity: `${totalQty} ${totalQty === 1 ? "unit" : "units"}`,
    },
    address: o.address || "—",
    pricing: {
      itemName: firstItem?.title ?? "Order",
      itemQty: `${totalQty} ${totalQty === 1 ? "unit" : "units"}`,
      itemPrice: o.totals.item_total,
      fees: o.totals.shipping_total,
      taxes: o.totals.tax_total,
      total: o.totals.total,
    },
  };
}

export function TrackOrder({
  initialQuery,
  initialEmail,
}: {
  initialQuery?: string;
  initialEmail?: string;
}) {
  const [query, setQuery] = React.useState(initialQuery ?? "");
  const [email, setEmail] = React.useState(initialEmail ?? "");
  const [result, setResult] = React.useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = React.useState<string | null>(null);
  const [lookupError, setLookupError] = React.useState(false);
  const [invoiceOpen, setInvoiceOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const resultAnchorRef = React.useRef<HTMLDivElement | null>(null);

  // Only a real, looked-up order has an invoice — never fabricate one.
  const invoiceData = React.useMemo(
    () => (result ? buildInvoice(result) : null),
    [result],
  );

  const runLookup = React.useCallback(
    (orderNumber: string, emailValue: string) => {
      startTransition(async () => {
        const outcome = await lookupOrder(orderNumber, emailValue);
        if (outcome.status === "found") {
          setResult(mapToTracked(outcome.order));
          setNotFound(null);
          setLookupError(false);
        } else if (outcome.status === "not_found") {
          setResult(null);
          setNotFound(orderNumber);
          setLookupError(false);
        } else {
          setResult(null);
          setNotFound(null);
          setLookupError(true);
        }
      });
    },
    [],
  );

  // Auto-run when arriving with ?order=…&email=… (e.g. the "My Orders" link).
  React.useEffect(() => {
    const o = (initialQuery ?? "").trim();
    const e = (initialEmail ?? "").trim();
    if (o && e) runLookup(o, e);
  }, [initialQuery, initialEmail, runLookup]);

  // Scroll the result/not-found section into view after a successful submit.
  // Respects reduced-motion via `behavior: "smooth"` (browsers honor the pref).
  React.useEffect(() => {
    if (!result && !notFound && !lookupError) return;
    const id = window.requestAnimationFrame(() => {
      resultAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [result, notFound, lookupError]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const orderNumber = query.trim();
    const emailValue = email.trim();
    if (!orderNumber || !emailValue) return;
    runLookup(orderNumber, emailValue);
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
            Enter your order number and the email you used to view the current
            status of your delivery
          </p>
        </div>
        <form
          className="flex flex-col gap-3 px-4 pb-4 sm:px-6 sm:pb-6"
          onSubmit={onSubmit}
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="order-number"
              className="text-sm font-medium text-brand"
            >
              Order Number
            </label>
            <input
              id="order-number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., PG-2026-001"
              className="w-full rounded-button border border-line bg-surface px-4 py-2 text-base leading-6 text-brand placeholder:text-muted/70 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:py-2.5 sm:text-sm sm:leading-5"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="order-email" className="text-sm font-medium text-brand">
              Email Address
            </label>
            <input
              id="order-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              className="w-full rounded-button border border-line bg-surface px-4 py-2 text-base leading-6 text-brand placeholder:text-muted/70 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:py-2.5 sm:text-sm sm:leading-5"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-button bg-rust/90 px-4 text-sm font-medium text-white transition-colors hover:bg-rust disabled:opacity-60 sm:w-auto"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Search className="size-4" aria-hidden />
              )}
              Track Order
            </button>
            <button
              type="button"
              onClick={() => setInvoiceOpen(true)}
              disabled={!result}
              title={result ? undefined : "Track an order first to view its invoice"}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-button border border-line bg-background px-4 text-sm font-medium text-brand transition-colors hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background sm:w-auto"
            >
              <Download className="size-4" aria-hidden />
              View Invoice
            </button>
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
        {lookupError && (
          <motion.div
            key="lookup-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
          >
            <LookupErrorAlert />
          </motion.div>
        )}
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

function LookupErrorAlert() {
  return (
    <section
      role="alert"
      className="flex items-start gap-3 rounded-card border-2 border-[rgba(202,53,0,0.3)] bg-[rgba(202,53,0,0.06)] p-4 sm:p-6"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#ca3500]" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-lg font-semibold leading-7 tracking-tight text-[#7e2a0c]">
          Something Went Wrong
        </h2>
        <p className="text-sm leading-5 text-[#ca3500]">
          We couldn&apos;t look up your order right now. Please check your
          connection and try again in a moment.
        </p>
      </div>
    </section>
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
              className={cn(
                "inline-flex w-fit items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-medium sm:py-2 sm:text-base",
                order.canceled
                  ? "border-[rgba(231,0,11,0.25)] bg-[rgba(231,0,11,0.06)] text-[#e7000b]"
                  : "border-[rgba(150,64,34,0.3)] bg-[rgba(150,64,34,0.1)] text-rust",
              )}
            >
              {order.canceled ? (
                <XCircle className="size-4 sm:size-5" aria-hidden />
              ) : (
                <CheckCircle2 className="size-4 sm:size-5" aria-hidden />
              )}
              {order.status}
            </motion.span>
          </div>

          {order.canceled ? (
            <div className="flex items-start gap-3 rounded-option border-2 border-[rgba(231,0,11,0.25)] bg-[rgba(231,0,11,0.06)] p-4 sm:p-5">
              <XCircle className="mt-0.5 size-5 shrink-0 text-[#e7000b]" aria-hidden />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-base font-semibold tracking-tight text-brand">
                  This order has been canceled
                </p>
                <p className="text-sm leading-5 text-muted">
                  If you were charged, your refund is on its way. Questions?
                  Contact us and quote order {order.number}.
                </p>
              </div>
            </div>
          ) : (
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
                      step.state === "completed"
                        ? "border-accent bg-accent text-white"
                        : step.state === "current"
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
                    <p className="text-sm text-muted">{step.detail}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          )}
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
