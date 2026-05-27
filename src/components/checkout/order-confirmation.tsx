"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import {
  DURATION,
  EASE_PREMIUM,
  SPRING_SOFT,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

/**
 * Order Confirmed + Create-Your-Account modal (Figma frames 424:3548 confirmed
 * page + dialog, 424:3549 "Passwords don't match" error state).
 *
 * The confirmation page shows a success state + "What's Next?" checklist. The
 * create-account dialog (open by default, dismissible) pre-fills the order's
 * company/contact/email and asks for a password + confirmation, linking the
 * order to the new account.
 *
 * TODO(medusa): take the real order number + details; wire Create Account to the
 * customer-create API and link the order.
 */
const WHATS_NEXT = [
  "You'll receive an email confirmation shortly",
  "We'll start processing your order within 24 hours",
  "Track your order status in your dashboard",
  "Estimated delivery: 5-7 business days",
];

interface OrderConfirmationProps {
  orderNumber: string;
  email?: string;
  company?: string;
  contactPerson?: string;
}

export function OrderConfirmation({
  orderNumber,
  email,
  company,
  contactPerson,
}: OrderConfirmationProps) {
  const [showModal, setShowModal] = React.useState(true);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-card border border-line bg-surface p-8 text-center">
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING_SOFT}
          className="grid size-28 place-items-center rounded-full bg-[#dcfce7]"
        >
          <CheckCircle2 className="size-14 text-[#16a34a]" aria-hidden />
        </motion.span>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold leading-9 tracking-tight text-brand">
            Order Confirmed!
          </h1>
          <p className="text-base text-muted">
            Your order has been successfully placed
          </p>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-brand">
          Order #{orderNumber}
        </p>

        <div className="w-full rounded-option bg-line/60 p-6 text-left">
          <h2 className="text-lg font-medium leading-7 tracking-tight text-brand">
            What&apos;s Next?
          </h2>
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mt-4 flex flex-col gap-2"
          >
            {WHATS_NEXT.map((item) => (
              <motion.li
                variants={staggerItem}
                key={item}
                className="flex items-start gap-2 text-sm text-muted"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-rust" aria-hidden />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/products"
            className="inline-flex h-10 items-center justify-center rounded-button border border-line bg-background px-6 text-sm font-medium text-brand transition-colors hover:bg-line/30"
          >
            Continue Shopping
          </Link>
          <Link
            href="/track-order"
            className="inline-flex h-10 items-center justify-center rounded-button bg-brand px-6 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Track Order
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <CreateAccountModal
            key="modal"
            orderNumber={orderNumber}
            email={email}
            company={company}
            contactPerson={contactPerson}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateAccountModal({
  orderNumber,
  email,
  company,
  contactPerson,
  onClose,
}: {
  orderNumber: string;
  email?: string;
  company?: string;
  contactPerson?: string;
  onClose: () => void;
}) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setError(null);
    // TODO(medusa): create the customer + link the order, then close.
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.fast }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-account-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-option border border-line bg-background p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[rgba(150,64,34,0.1)]">
              <ShieldCheck className="size-5 text-rust" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <h2
                id="create-account-title"
                className="text-xl font-semibold leading-7 tracking-tight text-brand"
              >
                Create Your Account
              </h2>
              <p className="text-sm text-muted">
                Save time on future orders and track all your orders
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full text-brand transition-colors hover:bg-line/30"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* Benefits */}
        <div className="rounded-option border border-[#e2e1e0] bg-mist p-3.5">
          <p className="text-sm font-semibold text-brand">
            Benefits of creating an account:
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {[
              "Track all your orders in one place",
              "Faster checkout with saved addresses",
              "Reorder with one click",
            ].map((b) => (
              <li key={b} className="text-xs text-muted">
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Prefilled order details (read-only) */}
        <dl className="flex flex-col gap-3">
          {company && <ReadOnlyField label="Company Name" value={company} />}
          {contactPerson && <ReadOnlyField label="Contact Name" value={contactPerson} />}
          {email && <ReadOnlyField label="Email" value={email} />}
        </dl>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <PasswordField
            id="create-password"
            label="Create Password *"
            value={password}
            onChange={setPassword}
            shown={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
          />
          <PasswordField
            id="confirm-password"
            label="Confirm Password *"
            value={confirm}
            onChange={setConfirm}
            shown={showConfirm}
            onToggle={() => setShowConfirm((s) => !s)}
            invalid={!!error}
          />

          {error && (
            <p className="rounded-button bg-[rgba(231,0,11,0.06)] px-3 py-2 text-[13px] font-medium text-[#171717]">
              {error}
            </p>
          )}

          <div className="rounded-option border border-[rgba(150,64,34,0.2)] bg-[rgba(150,64,34,0.05)] px-3 py-2.5">
            <p className="text-xs font-bold text-rust">
              Order #{orderNumber} will be linked to your account
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-button border border-line bg-background px-4 text-sm font-medium text-brand transition-colors hover:bg-line/30"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              className="inline-flex h-9 flex-1 items-center justify-center rounded-button bg-rust/90 px-4 text-sm font-medium text-white transition-colors hover:bg-rust"
            >
              Create Account
            </button>
          </div>

          <p className="text-center text-xs text-muted">
            You can track your order anytime using just your order number
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="text-sm text-brand">{value}</dd>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  shown,
  onToggle,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  shown: boolean;
  onToggle: () => void;
  invalid?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-brand">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
          className={cn(
            "h-11 w-full rounded-button border-2 bg-surface px-3 pr-11 text-sm text-brand placeholder:text-muted focus-visible:outline-none",
            invalid ? "border-[#e7000b] focus-visible:border-[#e7000b]" : "border-input focus-visible:border-brand",
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={shown ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-button text-brand transition-colors hover:bg-line/30"
        >
          {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
