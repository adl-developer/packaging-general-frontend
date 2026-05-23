"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Box,
  Pencil,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatGhs } from "@/lib/format";
import { motion, AnimatePresence } from "motion/react";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";

// TODO(medusa): replace with the live Medusa cart.
interface CartItem {
  id: string;
  name: string;
  specs: string[];
  unitPrice: number;
  subtotalBeforeTax: number;
  total: number;
}

const INITIAL_ITEMS: CartItem[] = [
  {
    id: "1",
    name: "Standard Shipping Carton",
    specs: [
      "Size: Small (30×20×15cm) • Material: Kraft Single Wall",
      "Print: No Printing",
      "Quantity: 50 units",
    ],
    unitPrice: 5.27,
    subtotalBeforeTax: 219.68,
    total: 263.62,
  },
  {
    id: "2",
    name: "Packaging Tape - Brown",
    specs: ["Size: Standard • Material: Standard", "Print: No Printing", "Quantity: 1 units"],
    unitPrice: 12.5,
    subtotalBeforeTax: 13.13,
    total: 15.75,
  },
];

function EmptyCart() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
        className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-card border border-line bg-surface px-6 py-16 text-center"
      >
        <span className="grid size-16 place-items-center rounded-full bg-[#c4bcb0]">
          <ShoppingBag className="size-7 text-[#5b554c]" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-brand">
          Your cart is empty
        </h1>
        <p className="text-base text-muted">
          Start adding packaging solutions to your cart
        </p>
        <Link
          href="/products"
          className={buttonVariants({ variant: "primary", size: "lg" })}
        >
          Browse Products
        </Link>
      </motion.div>
    </div>
  );
}

function CartLine({
  item,
  onRemove,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <div className="flex gap-4">
        <div className="grid size-28 shrink-0 place-items-center rounded-2xl bg-[#c4bcb0]">
          <Box className="size-12 text-muted" aria-hidden />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold leading-7 tracking-tight text-brand">
                {item.name}
              </h3>
              <div className="flex flex-col gap-1">
                {item.specs.map((s) => (
                  <p key={s} className="text-sm text-muted">
                    {s}
                  </p>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Edit item"
                className="grid size-8 place-items-center rounded-button text-muted transition-colors hover:bg-line/30"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Remove item"
                onClick={() => onRemove(item.id)}
                className="grid size-8 place-items-center rounded-button text-plum transition-colors hover:bg-plum/10"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between border-t border-line pt-3">
            <div className="flex flex-col gap-1 text-sm text-muted">
              <span>Unit Price: {formatGhs(item.unitPrice)}</span>
              <span>Subtotal (before tax): {formatGhs(item.subtotalBeforeTax)}</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-brand">
                {formatGhs(item.total)}
              </p>
              <p className="text-xs text-muted">Total incl. tax</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const [items, setItems] = React.useState<CartItem[]>(INITIAL_ITEMS);
  const remove = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  const total = items.reduce((sum, x) => sum + x.total, 0);

  if (items.length === 0) return <EmptyCart />;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand/70"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Continue Shopping
          </Link>
          <button
            type="button"
            onClick={() => setItems([])}
            className="inline-flex h-9 items-center gap-2 rounded-button bg-rust px-3 text-sm font-medium text-white transition-colors hover:bg-rust/90"
          >
            <Trash2 className="size-4" aria-hidden />
            Empty Cart
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold leading-9 tracking-tight text-brand">
            Shopping Cart
          </h1>
          <p className="text-base text-muted">
            {items.length} items in your cart
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
            >
              <CartLine item={item} onRemove={remove} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cross-sell. TODO(medusa): recommended products. */}
      <div className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-lg font-medium tracking-tight text-brand">
          People who usually order your order also order...
        </h2>
        <p className="mt-1 text-sm text-muted">
          Add these items to your order and save on delivery fees
        </p>
      </div>

      {/* Order summary */}
      <div className="rounded-card border border-line bg-surface p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium tracking-tight text-brand">
            Order Summary
          </h2>
          <p className="text-base text-muted">{items.length} items</p>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="text-base font-semibold tracking-tight text-brand">
            Total
          </span>
          <span className="text-base font-semibold tracking-tight text-brand">
            {formatGhs(total)}
          </span>
        </div>
        <Link
          href="/checkout"
          className={buttonVariants({
            variant: "primary",
            size: "lg",
            fullWidth: true,
            className: "mt-4",
          })}
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
