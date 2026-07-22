"use client";

import * as React from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Factory,
  Loader2,
  PackageCheck,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGhs } from "@/lib/format";
import { isValidEmail } from "@/lib/validation";
import {
  lookupOrder,
  lookupOrderByToken,
  type OrderLookupResult,
} from "@/lib/actions/orders";
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
  /** One entry per ordered product (service/fee lines excluded) — the
   *  Product Information card lists them all. */
  products: {
    name: string;
    size: string;
    material: string;
    printing: string;
    quantity: string;
  }[];
  address: string;
  /** Every CHARGED line — fee/service lines included, unlike `products` above
   *  (which describes goods). The invoice itemizes these so the line amounts
   *  sum to the Subtotal. */
  invoiceLines: {
    name: string;
    specs: string;
    quantity: string;
    unitPrice: number;
    amount: number;
  }[];
  /** Signed `?t=…&invoice=1` deep link minted by the backend — what the
   *  invoice QR encodes. Empty string when the backend didn't supply one. */
  invoiceUrl: string;
  pricing: {
    itemName: string;
    itemQty: string;
    itemPrice: number;
    fees: number;
    taxes: number;
    discount: number;
    total: number;
  };
  /** Carrier tracking info from the order's active fulfillment (Yango, etc.).
   *  Null until the fulfillment has been created. */
  carrier: {
    name: string;
    statusLabel: string | null;
    trackingUrl: string | null;
    scheduledFor: string | null;
  } | null;
}

const cardClass = "rounded-card border-2 border-[#e2e1e0] bg-surface";

/**
 * Build the invoice payload from a looked-up order's REAL totals: subtotal,
 * delivery and total come straight from the order; the single tax_total is
 * split across the Ghana levy lines proportionally (VAT 15 / NHIL 2.5 /
 * GETFund 2.5 of the 20-point bundle), with GETFund taking the rounding
 * remainder so the three lines always sum to the amount actually charged.
 * `totalBeforeTax` is derived as total − tax so any discount is absorbed and
 * the column foots to the total. E-VAT receipt fields stay blank until the
 * backend issues real GRA e-invoicing data.
 *
 * ⚠ This mirrors the backend's `utils/invoice-breakdown.ts`, which computes
 * the same figures for the emailed invoice. Separate repos, no shared module —
 * change both together or the email will disagree with this dialog.
 */
function buildInvoice(order: TrackedOrder): InvoiceData {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const taxes = order.pricing.taxes;
  const total = order.pricing.total;
  const vat = round2((taxes * 15) / 20);
  const nhil = round2((taxes * 2.5) / 20);
  const getfund = round2(taxes - vat - nhil);
  return {
    orderNumber: order.number,
    invoiceDate: order.placedOn.replace(/^Placed on /, ""),
    billTo: {
      name: order.customer.name,
      email: order.customer.email,
      phone: order.customer.phone,
      address: order.address,
    },
    lines: order.invoiceLines,
    charges: {
      subtotal: order.pricing.itemPrice,
      platformFee: 0,
      deliveryFee: order.pricing.fees,
      discount: order.pricing.discount,
      totalBeforeTax: round2(total - taxes),
      vat,
      nhil,
      getfund,
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
    qrPayload: order.invoiceUrl,
  };
}

const trackDateFmt = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const scheduledFmt = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatScheduled(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return scheduledFmt.format(d);
}

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
  // Service lines (printing setup fee) are charges, not products — the product
  // card and quantities describe the real goods. Fall back to all items for
  // resilience if the flag is ever absent.
  const goods = o.items.filter((i) => !i.is_service);
  const displayItems = goods.length ? goods : o.items;
  const mainItem = displayItems[0];
  const extraCount = displayItems.length - 1;
  const totalQty = displayItems.reduce((n, i) => n + i.quantity, 0);
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
    products: displayItems.map((item) => {
      const opts = item.options ?? {};
      return {
        name: item.title || "Your order",
        size: opts["Size"] ?? item.variant_title ?? "—",
        material: opts["Material"] ?? "—",
        printing: opts["Printing"] ?? "—",
        quantity: `${item.quantity} ${item.quantity === 1 ? "unit" : "units"}`,
      };
    }),
    address: o.address || "—",
    // Invoice lines cover EVERY charged item, service/fee lines included, so
    // the amounts sum to item_total (the invoice's Subtotal). Amount is
    // unit_price × quantity — `item.total` carries tax and would double-count
    // against the levy lines below it.
    invoiceLines: o.items.map((item) => {
      const opts = item.options ?? {};
      const specs = item.is_service
        ? "One-time printing setup fee"
        : ([opts["Size"], opts["Material"], opts["Printing"]]
            .filter((s): s is string => Boolean(s) && s !== "—")
            .join(" • ") ||
          item.variant_title ||
          "");
      return {
        name: item.title || "Item",
        specs,
        quantity: `${item.quantity}`,
        unitPrice: item.unit_price,
        amount: item.unit_price * item.quantity,
      };
    }),
    invoiceUrl: o.invoice_url ?? "",
    pricing: {
      itemName:
        (mainItem?.title ?? "Order") +
        (extraCount > 0 ? ` +${extraCount} more` : ""),
      itemQty: `${totalQty} ${totalQty === 1 ? "unit" : "units"}`,
      itemPrice: o.totals.item_total,
      fees: o.totals.shipping_total,
      taxes: o.totals.tax_total,
      discount: o.totals.discount_total,
      total: o.totals.total,
    },
    carrier: o.carrier
      ? {
          name: carrierLabel(o.carrier.provider_id),
          statusLabel: o.carrier.status_label,
          trackingUrl: o.carrier.tracking_url,
          scheduledFor: o.carrier.scheduled_for,
        }
      : null,
  };
}

/** Map Medusa fulfillment provider ids to a customer-facing carrier name. */
function carrierLabel(providerId: string | null): string {
  if (!providerId) return "Carrier";
  if (providerId.startsWith("yango")) return "Yango Delivery";
  if (providerId.startsWith("manual")) return "Store Pickup";
  return providerId;
}

export function TrackOrder({
  initialToken,
  initialQuery,
  initialEmail,
  openInvoice,
  loggedInEmail,
}: {
  /** Opaque tracking token from emailed/SMS links (?t=…) — looked up
   *  immediately; no email/order number needed in the URL. */
  initialToken?: string;
  initialQuery?: string;
  initialEmail?: string;
  /** From `?invoice=1` (every "View Invoice" CTA and the invoice QR) — pops
   *  the invoice dialog once the auto-lookup resolves. */
  openInvoice?: boolean;
  /** When set (signed-in customer), the email is applied automatically and the
   *  email field is hidden — the user only enters an order number. */
  loggedInEmail?: string;
}) {
  const isLoggedIn = Boolean(loggedInEmail);
  const [query, setQuery] = React.useState(initialQuery ?? "");
  const [email, setEmail] = React.useState(initialEmail ?? "");
  const [result, setResult] = React.useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = React.useState<string | null>(null);
  const [lookupError, setLookupError] = React.useState(false);
  const [invoiceOpen, setInvoiceOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const resultAnchorRef = React.useRef<HTMLDivElement | null>(null);
  // The inputs that produced `result` — so View Invoice can tell whether the
  // current fields still match the shown order or a fresh lookup is needed.
  const lookedUpRef = React.useRef<{ order: string; email: string } | null>(
    null,
  );

  // Only a real, looked-up order has an invoice — never fabricate one.
  const invoiceData = React.useMemo(
    () => (result ? buildInvoice(result) : null),
    [result],
  );

  const runLookup = React.useCallback(
    (orderNumber: string, emailValue: string, openInvoice = false) => {
      startTransition(async () => {
        const outcome = await lookupOrder(orderNumber, emailValue);
        if (outcome.status === "found") {
          lookedUpRef.current = { order: orderNumber, email: emailValue };
          setResult(mapToTracked(outcome.order));
          setNotFound(null);
          setLookupError(false);
          if (openInvoice) setInvoiceOpen(true);
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

  // Token links (?t=…) resolve on the backend and come back with the order's
  // number + email, which then pre-fill the form so View Invoice / re-lookups
  // keep working exactly as if the customer had typed them.
  const runTokenLookup = React.useCallback(
    (token: string, openInvoiceOnFound = false) => {
      startTransition(async () => {
        const outcome = await lookupOrderByToken(token);
        if (outcome.status === "found") {
          const number = outcome.order.number;
          const emailValue = outcome.order.customer.email ?? "";
          lookedUpRef.current = { order: number, email: emailValue };
          setQuery(number);
          setEmail(emailValue);
          setResult(mapToTracked(outcome.order));
          setNotFound(null);
          setLookupError(false);
          if (openInvoiceOnFound) setInvoiceOpen(true);
        } else if (outcome.status === "not_found") {
          // Bad/expired token — empty string renders the generic "link
          // invalid" copy and the manual form remains as the fallback.
          setResult(null);
          setNotFound("");
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

  // Auto-run when arriving with ?t=… (emailed/SMS links) or ?order=… (the
  // "My Orders" link), using the URL email if present, otherwise the
  // signed-in customer's email.
  React.useEffect(() => {
    const t = (initialToken ?? "").trim();
    if (t) {
      runTokenLookup(t, openInvoice);
      return;
    }
    const o = (initialQuery ?? "").trim();
    const e = (initialEmail ?? loggedInEmail ?? "").trim();
    if (o && e) runLookup(o, e, openInvoice);
  }, [
    initialToken,
    initialQuery,
    initialEmail,
    openInvoice,
    loggedInEmail,
    runLookup,
    runTokenLookup,
  ]);

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

  // Both actions need the same credentials: an order number plus an email
  // (the signed-in email counts). Until both exist the buttons stay disabled.
  // Same precedence as the auto-run effect: an explicit email (typed or from
  // the URL) wins over the signed-in one, so a deep link for an order placed
  // under a different address keeps working.
  const orderNumber = query.trim();
  const emailValue = (email || loggedInEmail || "").trim();
  // Format-check the email too: "View Invoice" is type="button", so native
  // form validation never runs for it.
  const canLookup = Boolean(orderNumber && isValidEmail(emailValue));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canLookup) return;
    runLookup(orderNumber, emailValue);
  }

  // View Invoice works straight from the entered details: reuse the shown
  // order when the fields still match it, otherwise look the order up and
  // open the invoice as soon as it's found.
  function onViewInvoice() {
    if (!canLookup || pending) return;
    const fresh = lookedUpRef.current;
    if (
      result &&
      fresh &&
      fresh.order === orderNumber &&
      fresh.email === emailValue
    ) {
      setInvoiceOpen(true);
      return;
    }
    runLookup(orderNumber, emailValue, true);
  }

  // Shared action buttons — rendered inline with the order-number input when
  // signed in (no email field), or on their own row when logged out.
  const actionButtons = (
    <>
      <button
        type="submit"
        disabled={!canLookup || pending}
        title={
          canLookup
            ? undefined
            : isLoggedIn
              ? "Enter your order number first"
              : "Enter your order number and a valid email first"
        }
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-button bg-rust/90 px-4 text-sm font-medium text-white transition-colors hover:bg-rust disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
        onClick={onViewInvoice}
        disabled={!canLookup || pending}
        title={
          canLookup
            ? undefined
            : isLoggedIn
              ? "Enter your order number first"
              : "Enter your order number and a valid email first"
        }
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-button border border-line bg-background px-4 text-sm font-medium text-brand transition-colors hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background sm:w-auto"
      >
        <Download className="size-4" aria-hidden />
        View Invoice
      </button>
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
      {/* Search card */}
      <section className={cn(cardClass, "overflow-hidden")}>
        <div className="flex flex-col gap-1 border-b-2 border-[#e2e1e0] bg-[linear-gradient(90deg,rgba(150,64,34,0.05)_0%,rgba(164,154,135,0.05)_100%)] p-4 sm:p-6">
          <h1 className="flex items-center gap-2 text-base font-medium text-brand">
            <Search className="size-5 text-rust" aria-hidden />
            Track Your Order
          </h1>
          <p className="text-sm text-muted sm:text-base">
            {isLoggedIn
              ? "Enter your order number to view the current status of your delivery"
              : "Enter your order number and the email you used to view the current status of your delivery"}
          </p>
        </div>
        <form
          className="flex flex-col gap-3 p-4 sm:p-6"
          onSubmit={onSubmit}
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="order-number"
              className="text-sm font-medium text-brand"
            >
              Order Number
            </label>
            {/* Signed in: email is applied automatically (no field), so the
                order-number input and the action buttons share one row. */}
            <div
              className={cn(
                "flex flex-col gap-3",
                isLoggedIn && "sm:flex-row sm:items-end",
              )}
            >
              <input
                id="order-number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., PG-2026-001"
                className={cn(
                  "w-full rounded-button border border-line bg-surface px-4 py-2 text-base leading-6 text-brand placeholder:text-muted/70 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:py-2.5 sm:text-sm sm:leading-5",
                  isLoggedIn && "sm:flex-1",
                )}
              />
              {isLoggedIn && actionButtons}
            </div>
          </div>
          {!isLoggedIn && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="order-email"
                className="text-sm font-medium text-brand"
              >
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
          )}
          {!isLoggedIn && (
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              {actionButtons}
            </div>
          )}
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
        {notFound !== null && (
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
        <h2 className="text-lg font-semibold leading-7 text-[#7e2a0c]">
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
        <h2 className="text-lg font-semibold leading-7 text-[#7e2a0c]">
          Order Not Found
        </h2>
        <p className="break-words text-sm leading-5 text-[#ca3500]">
          {query
            ? `We couldn't find an order with the number "${query}". Please check the order number and try again.`
            : "This tracking link is invalid or has expired. Enter your order number and email above to find your order."}
        </p>
      </div>
    </section>
  );
}

function OrderResult({ order }: { order: TrackedOrder }) {
  return (
    <>
      {/* Status timeline */}
      <section className={cn(cardClass, "overflow-hidden")}>
        <div className="flex flex-col gap-3 border-b-2 border-[#e2e1e0] bg-[linear-gradient(90deg,rgba(150,64,34,0.05)_0%,rgba(164,154,135,0.05)_100%)] p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-medium text-brand">
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
        <div className="p-4 sm:p-6">
          {order.canceled ? (
            <div className="flex items-start gap-3 rounded-option border-2 border-[rgba(231,0,11,0.25)] bg-[rgba(231,0,11,0.06)] p-4 sm:p-5">
              <XCircle className="mt-0.5 size-5 shrink-0 text-[#e7000b]" aria-hidden />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-base font-semibold text-brand">
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
                    <p className="text-base font-semibold text-brand">
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
        <div className="border-b-2 border-[#e2e1e0] bg-[linear-gradient(90deg,rgba(150,64,34,0.05)_0%,rgba(164,154,135,0.05)_100%)] px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-base font-medium text-brand">
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
            <ProductInformation products={order.products} />
          </DetailBlock>

          <DetailBlock title="Delivery Information">
            <DetailGrid rows={[["Address:", order.address]]} />
            {order.carrier && (
              <div className="mt-3 flex flex-col gap-3 rounded-option border border-accent/40 bg-accent/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Truck className="size-5 text-plum" aria-hidden />
                  <span className="text-sm font-semibold text-brand">
                    {order.carrier.name}
                  </span>
                  {order.carrier.statusLabel && (
                    <span className="ml-auto rounded-full border border-plum/30 bg-surface px-2.5 py-0.5 text-xs font-medium text-plum">
                      {order.carrier.statusLabel}
                    </span>
                  )}
                </div>
                {order.carrier.scheduledFor && (
                  <div className="flex items-start gap-2 text-sm text-muted">
                    <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      Scheduled pickup:{" "}
                      <span className="font-medium text-brand">
                        {formatScheduled(order.carrier.scheduledFor)}
                      </span>
                    </span>
                  </div>
                )}
                {order.carrier.trackingUrl && (
                  <a
                    href={order.carrier.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-button border border-line bg-background px-3 text-sm font-medium text-brand transition-colors hover:bg-line/30"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Open live tracking
                  </a>
                )}
              </div>
            )}
          </DetailBlock>

          <DetailBlock title="Pricing Summary">
            <div className="rounded-option border border-[rgba(150,64,34,0.2)] bg-[rgba(150,64,34,0.05)] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-base font-medium text-brand">
                    {order.pricing.itemName}
                  </p>
                  <p className="text-sm text-muted">{order.pricing.itemQty}</p>
                </div>
                <p className="text-base font-semibold text-brand">
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

/** How many products show before the list collapses behind "Show all". */
const PRODUCTS_PREVIEW_COUNT = 2;

/** Every ordered product with its own specs — first two visible, the rest
 *  behind a Show all / Show less toggle (mirrors the confirmation email's
 *  per-item list instead of the old single-item summary). */
function ProductInformation({
  products,
}: {
  products: TrackedOrder["products"];
}) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded
    ? products
    : products.slice(0, PRODUCTS_PREVIEW_COUNT);
  const hiddenCount = products.length - PRODUCTS_PREVIEW_COUNT;

  return (
    <div className="flex flex-col gap-4">
      {visible.map((p, idx) => (
        <div
          key={`${p.name}-${idx}`}
          className={cn(
            "flex flex-col gap-2",
            idx > 0 && "border-t border-line pt-4",
          )}
        >
          <p className="break-words text-sm font-semibold text-brand">
            {p.name}
          </p>
          <DetailGrid
            rows={[
              ["Size:", p.size],
              ["Material:", p.material],
              ["Printing:", p.printing],
              ["Quantity:", p.quantity],
            ]}
          />
        </div>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-button border border-line bg-background px-4 text-sm font-medium text-brand transition-colors hover:bg-line/30"
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
          {expanded
            ? "Show less"
            : `Show all ${products.length} products`}
        </button>
      )}
    </div>
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
      <h3 className="text-base font-semibold text-brand">{title}</h3>
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
