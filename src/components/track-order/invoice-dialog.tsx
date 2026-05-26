"use client";

import * as React from "react";
import { Download, FileText, Mail, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatGhs } from "@/lib/format";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";

/**
 * Invoice dialog — Figma frame 452:12223 (mobile). Centered scrollable modal
 * with company header, Bill To, itemized breakdown, total card, E-VAT receipt
 * info + QR code, and Download / Email Invoice actions.
 *
 * TODO(medusa): replace `invoice` props with the live invoice payload; wire
 * Download Invoice to a server-rendered PDF and Email Invoice to the order API.
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

export function InvoiceDialog({
  open,
  invoice,
  onClose,
}: {
  open: boolean;
  invoice: InvoiceData | null;
  onClose: () => void;
}) {
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
                  onClick={() => {
                    // TODO(medusa): trigger server-rendered PDF download.
                  }}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-button bg-brand px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <Download className="size-4" aria-hidden />
                  Download Invoice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // TODO(medusa): trigger order email-invoice endpoint.
                  }}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-button border border-[#c4bcb0] bg-[#e8e5de] px-4 text-sm font-medium text-brand transition-colors hover:bg-line/30"
                >
                  <Mail className="size-4" aria-hidden />
                  Email Invoice
                </button>
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
    let s = seed || 1;
    const next = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s;
    };
    return Array.from({ length: 13 * 13 }, () => next() % 2 === 0);
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
