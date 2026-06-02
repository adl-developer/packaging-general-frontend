"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Box,
  Check,
  Loader2,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatGhs } from "@/lib/format";
import { motion, AnimatePresence } from "motion/react";
import { DURATION, EASE_PREMIUM, SPRING_TAP } from "@/lib/motion";
import { notifyCartAdd, notifyCartCount } from "@/lib/cart-events";
import {
  emptyCart as emptyCartAction,
  removeLineItem,
  updateLineItemQuantity,
} from "@/lib/actions/cart";

export interface CartItem {
  id: string;
  name: string;
  specs: string[];
  unitPrice: number;
  /** Effective tax rate applied to the line subtotal for the displayed total..
   *  (Ghana VAT+NHIL+GETFund+COVID ≈ 21.9% — matches the backend tax region). */
  taxRate: number;
  quantity: number;
  productSlug?: string;
}

// Cross-sell (Figma 404:1984 + mobile 452:9255). Visual-only for now —
// these items aren't seeded in Medusa, so the Add button only updates local
// state. Wire to live cart once these are added to the catalog.
interface CrossSellItem {
  id: string;
  name: string;
  description: string;
  pricePerUnit: number;
  unitLabel: string;
}

const CROSSSELL: CrossSellItem[] = [
  {
    id: "tape-brown",
    name: "Packaging Tape - Brown",
    description: "Heavy-duty 48mm × 66m brown packaging tape",
    pricePerUnit: 12.5,
    unitLabel: "per roll",
  },
  {
    id: "tape-clear",
    name: "Packaging Tape - Clear",
    description: "Heavy-duty 48mm × 66m clear packaging tape",
    pricePerUnit: 15.0,
    unitLabel: "per roll",
  },
  {
    id: "bubble-wrap",
    name: "Bubble Wrap",
    description: "Protective bubble wrap, 50cm × 10m roll",
    pricePerUnit: 22.0,
    unitLabel: "per roll",
  },
];

const lineSubtotal = (item: CartItem) => item.unitPrice * item.quantity;
const lineTotal = (item: CartItem) =>
  lineSubtotal(item) * (1 + item.taxRate);

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

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_PREMIUM }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: DURATION.base, ease: EASE_PREMIUM }}
            className="flex w-full max-w-sm flex-col gap-5 rounded-card border border-line bg-surface p-6 text-center shadow-xl"
          >
            <div className="flex flex-col gap-2">
              <h2
                id="confirm-title"
                className="text-lg font-semibold tracking-tight text-brand"
              >
                {title}
              </h2>
              <p className="text-sm text-muted">{description}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex h-11 w-full items-center justify-center rounded-button bg-plum px-4 text-sm font-semibold text-white transition-colors hover:bg-plum/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
              >
                {confirmLabel}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="text-sm font-medium text-muted transition-colors hover:text-brand"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function QtyStepper({
  qty,
  min = 1,
  onChange,
  disabled,
  label,
}: {
  qty: number;
  min?: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-3">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(min, qty - 1))}
        disabled={disabled || qty <= min}
        className="grid size-9 place-items-center rounded-button border border-line bg-background text-brand transition-[color,background-color,transform] duration-200 hover:bg-line/30 active:scale-[0.92] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span
        className="min-w-[2ch] overflow-hidden text-center text-base font-medium tabular-nums text-brand"
        aria-live="polite"
        aria-label={`${label} quantity`}
      >
        <motion.span
          key={qty}
          initial={{ scale: 0.7, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING_TAP}
          className="inline-block"
        >
          {qty}
        </motion.span>
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(qty + 1)}
        disabled={disabled}
        className="grid size-9 place-items-center rounded-button border border-line bg-background text-brand transition-[color,background-color,transform] duration-200 hover:bg-line/30 active:scale-[0.92] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function CartLine({
  item,
  pending,
  onRemove,
  onQty,
}: {
  item: CartItem;
  pending: boolean;
  onRemove: (id: string) => void;
  onQty: (id: string, n: number) => void;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="grid h-44 w-full shrink-0 place-items-center rounded-2xl bg-[#c4bcb0] sm:h-28 sm:w-28">
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
              {item.productSlug && (
                <Link
                  href={`/products/${item.productSlug}`}
                  aria-label={`Edit ${item.name} — change size, material, printing or quantity`}
                  className="grid size-8 place-items-center rounded-button text-muted transition-[color,background-color,transform] duration-200 hover:bg-line/30 hover:text-brand active:scale-[0.92]"
                >
                  <Pencil className="size-4" aria-hidden />
                </Link>
              )}
              <button
                type="button"
                aria-label="Remove item"
                onClick={() => onRemove(item.id)}
                disabled={pending}
                className="grid size-8 place-items-center rounded-button text-plum transition-[color,background-color,transform] duration-200 hover:bg-plum/10 active:scale-[0.92] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Quantity
              </span>
              <QtyStepper
                qty={item.quantity}
                onChange={(n) => onQty(item.id, n)}
                disabled={pending}
                label={item.name}
              />
              <div className="flex flex-col text-sm text-muted">
                <span>Unit Price: {formatGhs(item.unitPrice)}</span>
                <span>
                  Subtotal (before tax): {formatGhs(lineSubtotal(item))}
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold text-brand">
                {formatGhs(lineTotal(item))}
              </p>
              <p className="text-xs text-muted">Total incl. tax</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrossSellCard({
  item,
  added,
  onAdd,
}: {
  item: CrossSellItem;
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex h-full w-60 shrink-0 flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:w-auto sm:shrink sm:flex-row sm:items-start sm:gap-4">
      <div className="grid h-32 w-full shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] sm:size-24">
        <Box className="size-10 text-muted" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="text-base font-semibold leading-tight text-brand">
          {item.name}
        </h3>
        <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="text-lg font-bold tracking-tight text-brand">
              {formatGhs(item.pricePerUnit)}
            </p>
            <p className="text-xs text-muted">{item.unitLabel}</p>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {added ? (
              <motion.span
                key="added"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={SPRING_TAP}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-button bg-green-100 px-3 text-xs font-medium text-green-700 sm:w-auto sm:px-4"
              >
                <Check className="size-4" aria-hidden />
                Added
              </motion.span>
            ) : (
              <motion.button
                key="add"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={SPRING_TAP}
                type="button"
                onClick={onAdd}
                aria-label={`Add ${item.name} to cart`}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-button bg-brand px-3 text-xs font-medium text-brand-foreground transition-[color,background-color,transform] duration-200 hover:bg-brand/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:w-auto sm:px-4"
              >
                <ShoppingCart className="size-4" aria-hidden />
                Add to Cart
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function CartClient({ initialItems }: { initialItems: CartItem[] }) {
  const [items, setItems] = React.useState<CartItem[]>(initialItems);
  const [addedCrossSell, setAddedCrossSell] = React.useState<Set<string>>(
    new Set(),
  );
  const [confirmEmpty, setConfirmEmpty] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  // Keep the header cart badge in sync with the cart's line-item count.
  // Fires on mount (real total from server) and whenever the count changes —
  // i.e. on remove, on empty, on cross-sell add, and on quantity drops to 0.
  React.useEffect(() => {
    notifyCartCount(items.length);
  }, [items.length]);

  // Optimistic remove → server action → on error, restore.
  const remove = (id: string) => {
    const snapshot = items;
    setItems((xs) => xs.filter((x) => x.id !== id));
    startTransition(async () => {
      const cart = await removeLineItem(id);
      if (!cart && id.startsWith("li_")) {
        // Server lost it — revert
        setItems(snapshot);
      }
    });
  };

  const setQty = (id: string, n: number) => {
    const snapshot = items;
    setItems((xs) =>
      xs.map((x) => (x.id === id ? { ...x, quantity: n } : x)),
    );
    startTransition(async () => {
      const cart = await updateLineItemQuantity(id, n);
      if (!cart && id.startsWith("li_")) {
        setItems(snapshot);
      }
    });
  };

  const addCrossSell = (c: CrossSellItem) => {
    // Visual-only for now — these aren't in the catalog yet. Local state +
    // header badge sync via the items.length effect above, but not persisted
    // to the Medusa cart.
    let inserted = false;
    setItems((xs) => {
      if (xs.some((x) => x.id === `cs-${c.id}`)) return xs;
      inserted = true;
      return [
        ...xs,
        {
          id: `cs-${c.id}`,
          name: c.name,
          specs: [c.description],
          unitPrice: c.pricePerUnit,
          taxRate: 0.219,
          quantity: 1,
        },
      ];
    });
    setAddedCrossSell((prev) => new Set(prev).add(c.id));
    if (inserted) notifyCartAdd({ qty: 1 });
  };

  const doEmptyCart = () => {
    setItems([]);
    setAddedCrossSell(new Set());
    setConfirmEmpty(false);
    startTransition(async () => {
      await emptyCartAction();
    });
  };

  const total = items.reduce((sum, x) => sum + lineTotal(x), 0);

  if (items.length === 0)
    return (
      <>
        <EmptyCart />
        <ConfirmDialog
          open={confirmEmpty}
          title="Empty your cart?"
          description="This will remove all items from your cart. This action cannot be undone."
          confirmLabel="Empty Cart"
          onConfirm={doEmptyCart}
          onCancel={() => setConfirmEmpty(false)}
        />
      </>
    );

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
            onClick={() => setConfirmEmpty(true)}
            disabled={isPending}
            className="inline-flex h-9 items-center gap-2 rounded-button bg-rust px-3 text-sm font-medium text-white transition-colors hover:bg-rust/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            Empty Cart
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold leading-9 tracking-tight text-brand">
            Shopping Cart
          </h1>
          <p className="text-base text-muted">
            {items.length} item{items.length === 1 ? "" : "s"} in your cart
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
              <CartLine
                item={item}
                pending={isPending}
                onRemove={remove}
                onQty={setQty}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="rounded-card border border-line bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-medium tracking-tight text-brand">
          People who usually order your order also order...
        </h2>
        <p className="mt-1 text-sm text-muted">
          Add these items to your order and save on delivery fees
        </p>
        <div
          className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0"
          role="list"
        >
          {CROSSSELL.map((c) => (
            <div
              key={c.id}
              role="listitem"
              className="snap-start sm:snap-align-none"
            >
              <CrossSellCard
                item={c}
                added={addedCrossSell.has(c.id)}
                onAdd={() => addCrossSell(c)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary — narrower card centered on desktop per Figma; on
          mobile spans the full width like the other cart sections. Includes
          per-line breakdown, total, both checkout actions, and the promo
          code box. */}
      <div className="mx-auto flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:max-w-xl sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium tracking-tight text-brand">
            Order Summary
          </h2>
          <p className="text-sm text-muted">
            {items.length} item{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="truncate text-muted">{item.name}</span>
              <span className="shrink-0 font-medium text-brand tabular-nums">
                {formatGhs(lineTotal(item))}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold tracking-tight text-brand">
              Total
            </span>
            <span className="text-base font-semibold tracking-tight text-brand tabular-nums">
              {formatGhs(total)}
            </span>
          </div>
          <p className="text-xs text-muted">
            Includes VAT, NHIL, and all applicable fees
          </p>
        </div>
        <Link
          href="/checkout"
          className={buttonVariants({
            variant: "primary",
            size: "lg",
            fullWidth: true,
            className: "mt-1",
          })}
        >
          Proceed to Checkout
        </Link>
        <Link
          href="/products"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            fullWidth: true,
          })}
        >
          Keep Shopping
        </Link>
        {/* Promo / discount-code prompt — surfaces the active campaign code so
            users notice it before checkout. TODO(medusa): pull active promo
            from a `promotions` query instead of hard-coding. */}
        <div className="mt-1 rounded-option border border-line bg-surface px-4 py-3">
          <p className="text-xs text-muted">Use code</p>
          <p className="text-base font-bold tracking-wider text-brand">
            PGEASTER10
          </p>
          <p className="text-xs text-muted">at checkout for 10% off!</p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmEmpty}
        title="Empty your cart?"
        description={`You will remove all ${items.length} item${items.length === 1 ? "" : "s"} from your cart. This action cannot be undone.`}
        confirmLabel="Empty Cart"
        onConfirm={doEmptyCart}
        onCancel={() => setConfirmEmpty(false)}
      />
    </div>
  );
}
