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
import QRCode from "qrcode";
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
 *
 * ⚠ The emailed invoice (backend `modules/email/templates/order-invoice.ts`)
 * mirrors this layout section for section. Change one, change the other.
 */

/** One invoiced line — every charged line, fee/service lines included, so the
 *  line amounts always sum to the Subtotal below. */
export interface InvoiceLine {
  name: string;
  specs: string; // e.g. "Standard • Kraft • No Printing"
  quantity: string;
  unitPrice: number;
  amount: number;
}

/** The charge column under the lines — mirrors the backend's
 *  `utils/invoice-breakdown.ts`; keep the two in step. */
export interface InvoiceCharges {
  subtotal: number;
  platformFee: number;
  deliveryFee: number;
  discount: number;
  totalBeforeTax: number;
  vat: number;
  nhil: number;
  getfund: number;
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
  lines: InvoiceLine[];
  charges: InvoiceCharges;
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
  /** Payload encoded inside the QR — the signed `?t=…&invoice=1` link, so a
   *  scan reopens this invoice. Empty until the backend supplies it. */
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
                  className="flex items-center gap-2 text-2xl font-semibold text-brand"
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
                  <h3 className="text-lg font-semibold text-brand">
                    Packaging General
                  </h3>
                  <p className="text-sm text-muted">
                    Digital-first packaging platform
                  </p>
                  <p className="text-sm text-muted">Accra, Ghana</p>
                </div>
                <div className="mt-6 flex flex-col gap-1 text-right">
                  <h3 className="text-lg font-semibold text-brand">
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
                <h3 className="text-base font-semibold text-brand">
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

              {/* Items — every charged line, so the amounts sum to Subtotal. */}
              <section className="flex flex-col gap-4">
                <h3 className="text-base font-semibold text-brand">
                  Items
                </h3>
                <div className="flex flex-col gap-3 rounded-card border border-[#c4bcb0] p-4">
                  <ul className="flex flex-col gap-3">
                    {invoice.lines.map((line, i) => (
                      <li
                        key={`${line.name}-${i}`}
                        className={
                          i > 0 ? "border-t border-[#c4bcb0] pt-3" : undefined
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-base font-medium text-brand">
                            {line.name}
                          </p>
                          <p className="shrink-0 text-base font-medium text-brand">
                            {formatGhs(line.amount)}
                          </p>
                        </div>
                        {line.specs && (
                          <p className="text-sm text-muted">{line.specs}</p>
                        )}
                        <p className="text-sm text-muted">
                          Quantity: {line.quantity} × {formatGhs(line.unitPrice)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <hr className="border-[#c4bcb0]" />
                  <dl className="flex flex-col gap-2 text-sm">
                    <Row label="Subtotal" value={invoice.charges.subtotal} />
                    <Row
                      label="Platform Fee"
                      value={invoice.charges.platformFee}
                    />
                    <Row
                      label="Delivery Fee"
                      value={invoice.charges.deliveryFee}
                    />
                    {invoice.charges.discount > 0 && (
                      <Row
                        label="Discount"
                        value={-invoice.charges.discount}
                      />
                    )}
                    <hr className="border-[#c4bcb0]" />
                    <Row
                      label="Total Before Tax"
                      value={invoice.charges.totalBeforeTax}
                      bold
                    />
                    <hr className="border-[#c4bcb0]" />
                    <Row label="VAT (15%)" value={invoice.charges.vat} />
                    <Row label="NHIL (2.5%)" value={invoice.charges.nhil} />
                    <Row
                      label="GETFund (2.5%)"
                      value={invoice.charges.getfund}
                    />
                    <hr className="border-[#c4bcb0]" />
                    <div className="flex items-center justify-between pt-2">
                      <dt className="text-base font-semibold text-brand">
                        Total
                      </dt>
                      <dd className="text-base font-semibold text-rust">
                        {formatGhs(invoice.totalAmount)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <hr className="border-[#c4bcb0]" />

              {/* Total Amount card */}
              <section className="rounded-card border border-[rgba(150,64,34,0.2)] bg-[rgba(150,64,34,0.05)] p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-semibold text-brand">
                    Total Amount
                  </p>
                  <p className="text-3xl font-bold text-rust">
                    {formatGhs(invoice.totalAmount)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Includes all applicable taxes and fees
                </p>
              </section>

              {/* E-VAT receipt info + QR */}
              <section className="rounded-card border border-[#c4bcb0] p-6">
                <h3 className="text-sm font-semibold text-brand">
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
                {invoice.qrPayload && (
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <div className="grid size-[165px] place-items-center rounded-card border border-[#c4bcb0] bg-white p-3">
                      <InvoiceQr payload={invoice.qrPayload} />
                    </div>
                    <p className="text-xs text-muted">
                      Scan to open this invoice on your phone
                    </p>
                  </div>
                )}
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
    ${invoice.lines
      .map(
        (line, i) => `
    <div${i > 0 ? ' style="margin-top:10px;padding-top:10px;border-top:1px solid #c4bcb0"' : ""}>
      <table><tr>
        <td style="font-weight:600">${esc(line.name)}</td>
        <td style="text-align:right;font-weight:600">${money(line.amount)}</td>
      </tr></table>
      ${line.specs ? `<p class="muted">${esc(line.specs)}</p>` : ""}
      <p class="muted">Quantity: ${esc(line.quantity)} × ${money(line.unitPrice)}</p>
    </div>`
      )
      .join("")}
    <table style="margin-top:12px">
      ${row("Subtotal", invoice.charges.subtotal, { rule: true })}
      ${row("Platform Fee", invoice.charges.platformFee)}
      ${row("Delivery Fee", invoice.charges.deliveryFee)}
      ${invoice.charges.discount > 0 ? row("Discount", -invoice.charges.discount) : ""}
      ${row("Total Before Tax", invoice.charges.totalBeforeTax, { bold: true, rule: true })}
      ${row("VAT (15%)", invoice.charges.vat)}
      ${row("NHIL (2.5%)", invoice.charges.nhil)}
      ${row("GETFund (2.5%)", invoice.charges.getfund)}
      ${row("Total", invoice.totalAmount, { bold: true, rule: true })}
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

/**
 * The invoice QR, encoding the signed `?t=…&invoice=1` link — scanning it on a
 * phone reopens this invoice. Rendered as inline SVG from `QRCode.create()`,
 * which is synchronous, so there's no async state or layout shift.
 *
 * One `<path>` of module rectangles rather than N `<rect>` elements: a v5 QR
 * is 37×37, so that's up to ~700 filled modules — as separate nodes it bloats
 * the DOM and shows hairline seams between adjacent modules at some zoom
 * levels, which can break a scan.
 */
function InvoiceQr({ payload }: { payload: string }) {
  const qr = React.useMemo(() => {
    try {
      const { modules } = QRCode.create(payload, { errorCorrectionLevel: "M" });
      const size = modules.size;
      let d = "";
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (modules.data[y * size + x]) d += `M${x} ${y}h1v1h-1z`;
        }
      }
      return { size, d };
    } catch {
      return null;
    }
  }, [payload]);

  if (!qr) return null;

  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      className="size-full"
      shapeRendering="crispEdges"
      aria-label="QR code — scan to open this invoice"
      role="img"
    >
      <path d={qr.d} fill="#3d3428" />
    </svg>
  );
}
