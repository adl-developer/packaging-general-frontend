"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Mail,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatGhs } from "@/lib/format";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { emailInvoice } from "@/lib/actions/orders";

/**
 * Invoice dialog — Figma frame 452:12223 (mobile). Centered scrollable modal
 * with company header, Bill To, itemized breakdown, total card, E-VAT receipt
 * info + QR code, and Download / Email Invoice actions.
 *
 * Download opens a print-friendly copy (the browser's print dialog offers
 * "Save as PDF"). Email Invoice posts to the backend, which mails the order's
 * own email address.
 */
export interface InvoiceLine {
  name: string;
  specs: string; // e.g. "Standard • Standard • No Printing"
  quantity: string;
  subtotal: number;
  platformFee: number;
  deliveryFee: number;
  totalBeforeTax: number;
  vat: number;
  nhil: number;
  getfund: number;
  itemTotal: number;
}

export interface InvoiceData {
  orderNumber: string;
  invoiceDate: string;
  billTo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  line: InvoiceLine;
  totalAmount: number;
  eVat: {
    sdcId: string;
    receiptNumber: string;
    internalData: string;
    receiptCounter: string;
    mrc: string;
    dateTime: string;
    lineItemCount: string;
  };
  /** Payload encoded inside the QR (E-VAT verification URL/string). */
  qrPayload: string;
}

type EmailStatus =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent" }
  | { state: "error"; message: string };

export function InvoiceDialog({
  open,
  invoice,
  onClose,
}: {
  open: boolean;
  invoice: InvoiceData | null;
  onClose: () => void;
}) {
  const [emailStatus, setEmailStatus] = React.useState<EmailStatus>({
    state: "idle",
  });

  // Reset the email feedback each time the dialog reopens — done during
  // render (the documented "adjust state when props change" pattern) instead
  // of an effect, so there's no extra cascading render.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setEmailStatus({ state: "idle" });
  }

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const sendInvoiceEmail = React.useCallback(async () => {
    if (!invoice) return;
    setEmailStatus({ state: "sending" });
    const result = await emailInvoice(invoice.orderNumber, invoice.billTo.email);
    setEmailStatus(
      result.ok
        ? { state: "sent" }
        : { state: "error", message: result.error }
    );
  }, [invoice]);

  return (
    <AnimatePresence>
      {open && invoice && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_PREMIUM }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-title"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
            className="relative my-auto w-full max-w-md overflow-hidden rounded-card border border-[#c4bcb0] bg-[#e8e5de] shadow-xl"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close invoice"
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-button text-brand/70 transition-colors hover:bg-line/30 hover:text-brand"
            >
              <X className="size-4" aria-hidden />
            </button>

            <div className="flex flex-col gap-6 p-6">
              <header className="flex flex-col items-center gap-2 text-center">
                <h2
                  id="invoice-title"
                  className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-brand"
                >
                  <FileText className="size-6 text-rust" aria-hidden />
                  Invoice
                </h2>
                <p className="text-sm text-muted">
                  Order {invoice.orderNumber}
                </p>
              </header>

              {/* Company + invoice details card (rust-tinted) */}
              <section className="rounded-card border border-[rgba(150,64,34,0.2)] bg-[rgba(150,64,34,0.05)] p-6">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold tracking-tight text-brand">
                    Packaging General
                  </h3>
                  <p className="text-sm text-muted">
                    Digital-first packaging platform
                  </p>
                  <p className="text-sm text-muted">Accra, Ghana</p>
                </div>
                <div className="mt-6 flex flex-col gap-1 text-right">
                  <h3 className="text-lg font-semibold tracking-tight text-brand">
                    Invoice Details
                  </h3>
                  <p className="text-sm text-muted">
                    Order #: {invoice.orderNumber}
                  </p>
                  <p className="text-sm text-muted">
                    Date: {invoice.invoiceDate}
                  </p>
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-base font-semibold tracking-tight text-brand">
                  Bill To
                </h3>
                <div className="flex flex-col gap-0 text-sm text-muted">
                  <p>{invoice.billTo.name}</p>
                  <p className="break-words">{invoice.billTo.email}</p>
                  <p>{invoice.billTo.phone}</p>
                  <p className="mt-2 break-words">{invoice.billTo.address}</p>
                </div>
              </section>

              <hr className="border-[#c4bcb0]" />

              {/* Items */}
              <section className="flex flex-col gap-4">
                <h3 className="text-base font-semibold tracking-tight text-brand">
                  Items
                </h3>
                <div className="flex flex-col gap-3 rounded-card border border-[#c4bcb0] p-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-base font-medium tracking-tight text-brand">
                      {invoice.line.name}
                    </p>
                    <p className="text-sm text-muted">{invoice.line.specs}</p>
                    <p className="text-sm text-muted">
                      Quantity: {invoice.line.quantity}
                    </p>
                  </div>
                  <dl className="flex flex-col gap-2 text-sm">
                    <Row label="Subtotal" value={invoice.line.subtotal} />
                    <Row
                      label="Platform Fee"
                      value={invoice.line.platformFee}
                    />
                    <Row
                      label="Delivery Fee"
                      value={invoice.line.deliveryFee}
                    />
                    <hr className="border-[#c4bcb0]" />
                    <Row
                      label="Total Before Tax"
                      value={invoice.line.totalBeforeTax}
                      bold
                    />
                    <hr className="border-[#c4bcb0]" />
                    <Row label="VAT (15%)" value={invoice.line.vat} />
                    <Row label="NHIL (2.5%)" value={invoice.line.nhil} />
                    <Row label="GETFund (2.5%)" value={invoice.line.getfund} />
                    <hr className="border-[#c4bcb0]" />
                    <div className="flex items-center justify-between pt-2">
                      <dt className="text-base font-semibold tracking-tight text-brand">
                        Item Total
                      </dt>
                      <dd className="text-base font-semibold tracking-tight text-rust">
                        {formatGhs(invoice.line.itemTotal)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <hr className="border-[#c4bcb0]" />

              {/* Total Amount card */}
              <section className="rounded-card border border-[rgba(150,64,34,0.2)] bg-[rgba(150,64,34,0.05)] p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-semibold tracking-tight text-brand">
                    Total Amount
                  </p>
                  <p className="text-3xl font-bold tracking-tight text-rust">
                    {formatGhs(invoice.totalAmount)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Includes all applicable taxes and fees
                </p>
              </section>

              {/* E-VAT receipt info + QR */}
              <section className="rounded-card border border-[#c4bcb0] p-6">
                <h3 className="text-sm font-semibold tracking-tight text-brand">
                  E-VAT RECEIPT INFORMATION
                </h3>
                <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-xs text-muted">
                  <EvatRow label="SDC ID" value={invoice.eVat.sdcId} />
                  <EvatRow
                    label="Receipt Number"
                    value={invoice.eVat.receiptNumber}
                  />
                  <EvatRow
                    label="Internal Data"
                    value={invoice.eVat.internalData}
                  />
                  <EvatRow
                    label="Receipt Counter"
                    value={invoice.eVat.receiptCounter}
                  />
                  <EvatRow label="MRC" value={invoice.eVat.mrc} />
                  <EvatRow
                    label="Date & Time"
                    value={invoice.eVat.dateTime}
                  />
                  <EvatRow
                    label="Line Item Count"
                    value={invoice.eVat.lineItemCount}
                  />
                </dl>
                <div className="mt-6 grid place-items-center">
                  <div className="grid size-[165px] place-items-center rounded-card border border-[#c4bcb0] bg-white p-3">
                    <QrPlaceholder payload={invoice.qrPayload} />
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => printInvoice(invoice)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-button bg-brand px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <Download className="size-4" aria-hidden />
                  Download Invoice
                </button>
                <button
                  type="button"
                  onClick={sendInvoiceEmail}
                  disabled={
                    emailStatus.state === "sending" ||
                    emailStatus.state === "sent"
                  }
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-button border border-[#c4bcb0] bg-[#e8e5de] px-4 text-sm font-medium text-brand transition-colors hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailStatus.state === "sending" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Mail className="size-4" aria-hidden />
                  )}
                  {emailStatus.state === "sent"
                    ? "Invoice Sent"
                    : emailStatus.state === "sending"
                      ? "Sending…"
                      : "Email Invoice"}
                </button>
                {emailStatus.state === "sent" && (
                  <p
                    role="status"
                    className="flex items-start gap-2 rounded-button border border-[#bbe5c8] bg-[#dcfce7] px-3 py-2 text-sm text-[#166534]"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      Invoice emailed to {invoice.billTo.email}. Check your
                      inbox (and spam folder).
                    </span>
                  </p>
                )}
                {emailStatus.state === "error" && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-button border border-rust/30 bg-rust/10 px-3 py-2 text-sm text-rust"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>{emailStatus.message}</span>
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={bold ? "font-medium text-brand" : "text-brand"}>
        {formatGhs(value)}
      </dd>
    </div>
  );
}

function EvatRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className="break-all font-mono text-[11px] text-brand">{value}</dd>
    </>
  );
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Open a clean, print-friendly copy of the invoice and trigger the browser's
 * print dialog — every browser offers "Save as PDF" there, which doubles as
 * the download. Fully client-side; no PDF dependency or backend round-trip.
 */
function printInvoice(invoice: InvoiceData) {
  const w = window.open("", "_blank");
  if (!w) {
    // Popup blocked — nothing else we can do client-side.
    alert("Please allow popups for this site to download the invoice.");
    return;
  }

  const money = (n: number) => esc(formatGhs(n));
  const row = (
    label: string,
    value: number,
    opts: { bold?: boolean; rule?: boolean } = {}
  ) =>
    `<tr${opts.rule ? ' class="rule"' : ""}${opts.bold ? ' style="font-weight:600"' : ""}><td>${esc(label)}</td><td style="text-align:right">${money(value)}</td></tr>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${esc(invoice.orderNumber)} — Packaging General</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Inter, system-ui, -apple-system, sans-serif; color: #3d3428; margin: 0; padding: 32px; background: #fff; }
  .sheet { max-width: 640px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 16px; border-bottom: 2px solid #964022; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 14px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; color: #964022; }
  p { margin: 2px 0; font-size: 13px; }
  .muted { color: #7a7575; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 4px 0; }
  .items { border: 1px solid #c4bcb0; border-radius: 8px; padding: 12px 16px; }
  .rule td { border-top: 1px solid #c4bcb0; }
  .total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 16px; padding: 14px 16px; border: 1px solid #964022; border-radius: 8px; background: rgba(150,64,34,0.05); }
  .total .amount { font-size: 22px; font-weight: 700; color: #964022; }
  footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #c4bcb0; font-size: 11px; color: #7a7575; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div>
      <h1>Packaging General</h1>
      <p class="muted">Digital-first packaging platform</p>
      <p class="muted">Accra, Ghana</p>
    </div>
    <div style="text-align:right">
      <h1>Invoice</h1>
      <p>Order #: ${esc(invoice.orderNumber)}</p>
      <p>Date: ${esc(invoice.invoiceDate || "—")}</p>
    </div>
  </header>

  <h2>Bill To</h2>
  <p>${esc(invoice.billTo.name)}</p>
  <p>${esc(invoice.billTo.email)}</p>
  <p>${esc(invoice.billTo.phone)}</p>
  <p>${esc(invoice.billTo.address)}</p>

  <h2>Items</h2>
  <div class="items">
    <p style="font-weight:600">${esc(invoice.line.name)}</p>
    ${invoice.line.specs ? `<p class="muted">${esc(invoice.line.specs)}</p>` : ""}
    <p class="muted">Quantity: ${esc(invoice.line.quantity)}</p>
    <table style="margin-top:8px">
      ${row("Subtotal", invoice.line.subtotal)}
      ${row("Platform Fee", invoice.line.platformFee)}
      ${row("Delivery Fee", invoice.line.deliveryFee)}
      ${row("Total Before Tax", invoice.line.totalBeforeTax, { bold: true, rule: true })}
      ${row("VAT (15%)", invoice.line.vat)}
      ${row("NHIL (2.5%)", invoice.line.nhil)}
      ${row("GETFund (2.5%)", invoice.line.getfund)}
      ${row("Item Total", invoice.line.itemTotal, { bold: true, rule: true })}
    </table>
  </div>

  <div class="total">
    <span style="font-weight:600">Total Amount</span>
    <span class="amount">${money(invoice.totalAmount)}</span>
  </div>
  <p class="muted" style="margin-top:6px">Includes all applicable taxes and fees</p>

  <footer>
    <p>E-VAT receipt information will be issued separately once electronic invoicing is activated.</p>
    <p>Thank you for your business — Packaging General, Accra, Ghana.</p>
  </footer>
</div>
<script>window.addEventListener("load", function () { window.print(); });</script>
</body>
</html>`;

  w.document.write(html);
  w.document.close();
  w.focus();
}

/** Placeholder QR — visually evokes a QR code so the layout is correct.
 *  TODO(medusa): swap for a real QR generated from `payload` (e.g. `qrcode`
 *  lib server-side or a client lib like `qrcode.react`). */
function QrPlaceholder({ payload }: { payload: string }) {
  // Deterministic dot pattern from the payload so different orders render
  // visually distinct placeholders without pulling in a QR lib.
  const cells = React.useMemo(() => {
    const seed = Array.from(payload).reduce(
      (acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0,
      7,
    );
    const out: boolean[] = [];
    for (let i = 0, s = seed || 1; i < 13 * 13; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      out.push(s % 2 === 0);
    }
    return out;
  }, [payload]);

  return (
    <svg
      viewBox="0 0 13 13"
      className="size-full"
      aria-label="Invoice QR code"
      role="img"
    >
      {cells.map((on, i) => {
        const x = i % 13;
        const y = Math.floor(i / 13);
        // Force the three finder squares (top-left, top-right, bottom-left).
        const isFinder =
          (x < 3 && y < 3) || (x > 9 && y < 3) || (x < 3 && y > 9);
        const isFinderInner =
          (x === 1 && y === 1) || (x === 11 && y === 1) || (x === 1 && y === 11);
        if (isFinder) {
          // Outer 3x3 black, inner 1x1 black, surrounded by white — handled below.
        }
        const fill = isFinder
          ? isFinderInner || x === 0 || y === 0 || x === 12 || y === 12
            ? "#3d3428"
            : "#ffffff"
          : on
            ? "#3d3428"
            : "transparent";
        return <rect key={i} x={x} y={y} width="1" height="1" fill={fill} />;
      })}
    </svg>
  );
}
