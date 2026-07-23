"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Box,
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
  addLineItem,
  emptyCart as emptyCartAction,
  removeLineItem,
  updateLineItemQuantity,
} from "@/lib/actions/cart";
import { mapLineItem, TAX_RATE, type CartItem } from "./map-cart";
import { CartSkeleton } from "./cart-skeleton";
import {
  isOptimisticLine,
  onAddSettled,
  takeOptimisticAdd,
} from "@/lib/cart-handoff";
import type { CrossSellProduct } from "@/lib/products";
import type { ActivePromotion } from "@/lib/promotions";

export type { CartItem } from "./map-cart";

// Idle window before a line's quantity change is written to the (slow) backend.
// Rapid +/− clicks within this window collapse into a single write.
const QTY_DEBOUNCE_MS = 450;

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
        <h1 className="text-2xl font-semibold text-brand">
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
                className="text-lg font-semibold text-brand"
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

/** Shown when a background add commit failed and its lines were rolled back. */
function AddFailedBanner() {
  return (
    <div
      role="alert"
      className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
    >
      We couldn&apos;t add your item to the cart. Please go back to the product
      and try again.
    </div>
  );
}

function QtyStepper({
  qty,
  min = 1,
  onStep,
  label,
}: {
  qty: number;
  min?: number;
  /** Emits a delta (+1 / −1). The parent updates instantly and syncs the
   *  backend on its own debounced, serialized schedule — the buttons never
   *  block on the network, so there's no "stop" cursor / dead-click delay. */
  onStep: (delta: number) => void;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-3">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onStep(-1)}
        disabled={qty <= min}
        className="grid size-9 place-items-center rounded-button border border-line bg-background text-brand transition-[color,background-color] duration-200 hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span
        className="min-w-[2ch] overflow-hidden text-center text-base font-medium tabular-nums text-brand"
        aria-live="polite"
        aria-label={`${label} quantity`}
      >
        {qty}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onStep(1)}
        className="grid size-9 place-items-center rounded-button border border-line bg-background text-brand transition-[color,background-color] duration-200 hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-40"
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
  onStep,
}: {
  item: CartItem;
  pending: boolean;
  onRemove: (id: string) => void;
  onStep: (id: string, delta: number) => void;
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
              <h3 className="text-lg font-semibold leading-7 text-brand">
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
                  className="grid size-8 place-items-center rounded-button text-muted transition-[color,background-color] duration-200 hover:bg-line/30 hover:text-brand"
                >
                  <Pencil className="size-4" aria-hidden />
                </Link>
              )}
              <button
                type="button"
                aria-label="Remove item"
                onClick={() => onRemove(item.id)}
                disabled={pending}
                className="grid size-8 place-items-center rounded-button text-plum transition-[color,background-color] duration-200 hover:bg-plum/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              {item.isService ? (
                // One-time service charge (printing setup) — fixed quantity.
                <span className="text-sm text-muted">
                  One-time fee — charged once per print type
                </span>
              ) : (
                <>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted">
                    Quantity
                  </span>
                  <QtyStepper
                    qty={item.quantity}
                    onStep={(delta) => onStep(item.id, delta)}
                    label={item.name}
                  />
                </>
              )}
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
  onAdd,
}: {
  item: CrossSellProduct;
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
            <p className="text-lg font-bold text-brand">
              {formatGhs(item.pricePerUnit)}
            </p>
            <p className="text-xs text-muted">{item.unitLabel}</p>
          </div>
          <motion.button
            type="button"
            onClick={onAdd}
            whileTap={{ scale: 0.97 }}
            transition={SPRING_TAP}
            aria-label={`Add ${item.name} to cart`}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-button bg-brand px-3 text-xs font-medium text-brand-foreground transition-[color,background-color] duration-200 hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:w-auto sm:px-4"
          >
            <ShoppingCart className="size-4" aria-hidden />
            Add to Cart
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export function CartClient({
  itemsPromise,
  crossSell,
  promo,
}: {
  /** The live cart's mapped items, streamed from the server render — NOT
   *  awaited there, so the page shell paints without waiting on the backend. */
  itemsPromise: Promise<CartItem[]>;
  crossSell: CrossSellProduct[];
  promo: ActivePromotion | null;
}) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  // False until the first real cart snapshot is adopted (handoff or promise);
  // the skeleton renders meanwhile so the pre-adoption [] never flashes as an
  // empty cart. See the adoption effect below the qty refs.
  const [hydrated, setHydrated] = React.useState(false);
  const adoptedRef = React.useRef(false);
  // An optimistic add's commit failed → its lines were rolled back; tell the
  // shopper instead of silently losing the item.
  const [addFailed, setAddFailed] = React.useState(false);
  // True once committed server truth has been adopted — the (possibly slower)
  // base-items fetch must not overwrite it with a pre-commit snapshot.
  const addSettledRef = React.useRef(false);
  const [confirmEmpty, setConfirmEmpty] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  // Keep the header cart badge in sync with the cart's line-item count.
  // Fires once hydrated (real total from server) and whenever the count
  // changes — i.e. on remove, on empty, on cross-sell add, and on quantity
  // drops to 0. Gated on hydrated so the pre-adoption [] can't zero the badge.
  React.useEffect(() => {
    if (hydrated) notifyCartCount(items.length);
  }, [items.length, hydrated]);

  // Optimistic remove → server action → on error, restore.
  const remove = (id: string) => {
    if (isOptimisticLine(id)) return; // no server id yet; button is disabled
    const snapshot = items;
    forgetQty(id); // cancel any in-flight/pending qty sync for this line
    setItems((xs) => xs.filter((x) => x.id !== id));
    startTransition(async () => {
      const cart = await removeLineItem(id);
      if (!cart && id.startsWith("li_")) {
        // Server lost it — revert
        setItems(snapshot);
        qtyTarget.current.set(id, snapshot.find((x) => x.id === id)!.quantity);
        qtyConfirmed.current.set(id, snapshot.find((x) => x.id === id)!.quantity);
      }
    });
  };

  // --- Seamless quantity changes -------------------------------------------
  // The backend is slow (~3–4s per cart mutation) and Medusa locks the cart
  // per mutation — concurrent writes 409 / can drop the cart (see
  // actions/cart.ts). So quantity edits must feel instant WITHOUT blocking the
  // buttons or firing a request per click:
  //   • optimistic — the displayed qty + totals update on click, no spinner;
  //   • debounced — rapid +/− collapse into ONE write of the final value;
  //   • serialized — a single global drain sends writes one-at-a-time, never
  //     in parallel, even across different lines.
  // Latest intended qty per line (source of truth for clicks — read/written
  // synchronously so back-to-back clicks accumulate regardless of render).
  // Seeded by the adoption effect below once the first cart snapshot lands.
  const qtyTarget = React.useRef<Map<string, number>>(new Map());
  // Last qty the server confirmed — used to skip no-op writes and to revert.
  const qtyConfirmed = React.useRef<Map<string, number>>(new Map());
  // Lines whose target differs from what the server has → pending a write.
  const qtyDirty = React.useRef<Map<string, number>>(new Map());
  const draining = React.useRef(false);
  const drainTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // First cart snapshot + optimistic-add handling. Adopt-once (a later RSC
  // re-render swaps itemsPromise but must not clobber local state). Modes:
  //  1. Arrived from Add to Cart, commit in flight → paint the staged
  //     optimistic line(s) INSTANTLY; when the streamed fetch lands, merge
  //     the pre-existing server items underneath. The settle subscription
  //     below swaps in the committed truth (or rolls back on failure).
  //  2. Arrived from Add to Cart, commit already settled → adopt its result.
  //  3. Deep link / reload / back → adopt the streamed server fetch.
  React.useEffect(() => {
    if (adoptedRef.current) return;
    adoptedRef.current = true;
    // The synchronous setStates below are deliberate: this adopts a one-shot
    // external snapshot (the optimistic handoff) on mount, and the extra
    // render happens before paint — that's what makes the arrival instant.
    /* eslint-disable react-hooks/set-state-in-effect */

    const seedQty = (list: CartItem[]) => {
      for (const it of list) {
        if (isOptimisticLine(it.id)) continue; // temp ids never sync qty
        if (!qtyDirty.current.has(it.id)) {
          qtyTarget.current.set(it.id, it.quantity);
        }
        qtyConfirmed.current.set(it.id, it.quantity);
      }
    };

    let alive = true;
    const adoptServerFetch = () => {
      // Promise.resolve is REQUIRED: React streams the server promise as a
      // bare thenable whose .then() returns undefined — chaining .catch
      // straight off it throws. Wrapping normalizes it into a real Promise.
      Promise.resolve(itemsPromise)
        .then((server) => {
          if (!alive || addSettledRef.current) return;
          seedQty(server);
          // Keep any still-pending optimistic lines on top of the fetched base.
          setItems((xs) => [
            ...server,
            ...xs.filter((x) => isOptimisticLine(x.id)),
          ]);
          setHydrated(true);
        })
        .catch(() => {
          // getCart() already degrades to null internally; this only guards a
          // streaming hiccup. Show the cart rather than a stuck skeleton.
          if (alive && !addSettledRef.current) setHydrated(true);
        });
    };

    const pending = takeOptimisticAdd();
    if (!pending) {
      adoptServerFetch(); // mode 3
    } else if (pending.result?.ok) {
      // Mode 2 — commit finished during the navigation hop.
      addSettledRef.current = true;
      seedQty(pending.result.items);
      setItems(pending.result.items);
      setHydrated(true);
    } else if (pending.result) {
      // Mode 2, failed — nothing to show optimistically; explain + fetch base.
      setAddFailed(true);
      adoptServerFetch();
    } else {
      // Mode 1 — instant paint, base merge behind it.
      setItems(pending.optimisticItems);
      setHydrated(true);
      adoptServerFetch();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      alive = false;
    };
  }, [itemsPromise]);

  // The in-flight commit settling while we're mounted (the normal case).
  React.useEffect(
    () =>
      onAddSettled((result) => {
        if (result.ok) {
          addSettledRef.current = true;
          for (const it of result.items) {
            if (!qtyDirty.current.has(it.id)) {
              qtyTarget.current.set(it.id, it.quantity);
            }
            qtyConfirmed.current.set(it.id, it.quantity);
          }
          // Server truth, re-applying any qty edits made during the commit.
          setItems(
            result.items.map((it) => {
              const dirty = qtyDirty.current.get(it.id);
              return dirty != null ? { ...it, quantity: dirty } : it;
            })
          );
          setHydrated(true);
          setAddFailed(false);
        } else {
          // Roll the optimistic lines back; the base fetch (if still pending)
          // may continue and fill in the real cart.
          setItems((xs) => xs.filter((x) => !isOptimisticLine(x.id)));
          setHydrated(true);
          setAddFailed(true);
        }
      }),
    []
  );

  // Send pending quantity writes one at a time until the queue is empty.
  const drainQty = React.useCallback(async () => {
    if (draining.current) return; // a drain is already running
    draining.current = true;
    try {
      while (qtyDirty.current.size > 0) {
        const next = qtyDirty.current.entries().next().value as
          | [string, number]
          | undefined;
        if (!next) break;
        const [id, target] = next;
        qtyDirty.current.delete(id); // re-added below if it changes mid-flight
        if (qtyConfirmed.current.get(id) === target) continue; // nothing to do
        const cart = await updateLineItemQuantity(id, target);
        if (!cart && id.startsWith("li_")) {
          // Server lost the cart/line — revert this line to last good value,
          // unless the user has since queued another change for it.
          const good = qtyConfirmed.current.get(id);
          if (good != null && !qtyDirty.current.has(id)) {
            qtyTarget.current.set(id, good);
            setItems((xs) =>
              xs.map((x) => (x.id === id ? { ...x, quantity: good } : x)),
            );
          }
        } else if (cart) {
          qtyConfirmed.current.set(id, target);
        }
      }
    } finally {
      draining.current = false;
      // A click may have landed after the loop's last size-check. Those items
      // are already past their debounce, so drain again immediately (with the
      // request channel now free) rather than waiting another debounce window.
      if (qtyDirty.current.size > 0) void drainQty();
    }
  }, []);

  const scheduleDrainQty = React.useCallback(() => {
    if (drainTimer.current) clearTimeout(drainTimer.current);
    drainTimer.current = setTimeout(() => {
      drainTimer.current = null;
      void drainQty();
    }, QTY_DEBOUNCE_MS);
  }, [drainQty]);

  const stepQty = React.useCallback(
    (id: string, delta: number) => {
      // A line whose commit is still in flight has no server id to write to —
      // its controls are disabled, but guard the callback path too.
      if (isOptimisticLine(id)) return;
      const current = qtyTarget.current.get(id) ?? 1;
      const nextQty = Math.max(1, current + delta);
      if (nextQty === current) return;
      qtyTarget.current.set(id, nextQty);
      qtyDirty.current.set(id, nextQty);
      setItems((xs) =>
        xs.map((x) => (x.id === id ? { ...x, quantity: nextQty } : x)),
      );
      scheduleDrainQty();
    },
    [scheduleDrainQty],
  );

  // Drop any pending quantity sync for a line (e.g. it's being removed).
  const forgetQty = React.useCallback((id: string) => {
    qtyDirty.current.delete(id);
    qtyTarget.current.delete(id);
    qtyConfirmed.current.delete(id);
  }, []);

  React.useEffect(() => {
    return () => {
      if (drainTimer.current) clearTimeout(drainTimer.current);
    };
  }, []);

  // A cross-sell product whose variant is already a cart line is hidden from
  // the recommended section — derived from the live cart, so it stays hidden
  // across reloads and reappears if the line is removed.
  const inCart = (c: CrossSellProduct) =>
    items.some((x) => x.variantId === c.variantId);
  const visibleCrossSell = crossSell.filter((c) => !inCart(c));

  // Optimistic insert → real Medusa line via addLineItem → replace local
  // state with the server cart (temp id becomes the real li_… id, so the
  // line's remove/qty controls work immediately). Revert on failure.
  const addCrossSell = (c: CrossSellProduct) => {
    if (inCart(c)) return;
    const tempId = `cs-${c.id}`;
    setItems((xs) => [
      ...xs,
      {
        id: tempId,
        variantId: c.variantId,
        name: c.name,
        specs: [],
        unitPrice: c.pricePerUnit,
        taxRate: TAX_RATE,
        quantity: 1,
        productSlug: c.slug,
        isService: false,
      },
    ]);
    notifyCartAdd({ lines: 1 });
    startTransition(async () => {
      const cart = await addLineItem(c.variantId, 1);
      if (cart) {
        const mapped = (cart.items ?? []).map(mapLineItem);
        setItems(mapped);
        // The real li_… ids arrive here — seed the qty maps so their steppers
        // sync correctly and don't false-revert.
        for (const it of mapped) {
          if (!qtyTarget.current.has(it.id))
            qtyTarget.current.set(it.id, it.quantity);
          qtyConfirmed.current.set(it.id, it.quantity);
        }
      } else {
        // Server rejected the add — drop the optimistic line (the
        // items.length effect re-syncs the badge).
        setItems((xs) => xs.filter((x) => x.id !== tempId));
      }
    });
  };

  const doEmptyCart = () => {
    // Cancel any pending quantity writes so a debounced sync doesn't fire
    // against lines we're about to delete.
    if (drainTimer.current) clearTimeout(drainTimer.current);
    qtyDirty.current.clear();
    qtyTarget.current.clear();
    qtyConfirmed.current.clear();
    setItems([]);
    setConfirmEmpty(false);
    startTransition(async () => {
      await emptyCartAction();
    });
  };

  const total = items.reduce((sum, x) => sum + lineTotal(x), 0);

  // Still waiting on the first cart snapshot (direct visit, promise pending).
  // The add→cart path adopts its handoff in the mount effect, so this shows
  // for at most one frame there.
  if (!hydrated) return <CartSkeleton />;

  if (items.length === 0)
    return (
      <>
        {addFailed && (
          <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
            <AddFailedBanner />
          </div>
        )}
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
            // Also frozen while an add commit is in flight — emptying then
            // would race the commit and resurrect the new line afterwards.
            disabled={isPending || items.some((x) => isOptimisticLine(x.id))}
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
          <h1 className="text-3xl font-semibold leading-9 text-brand">
            Shopping Cart
          </h1>
          <p className="text-base text-muted">
            {items.length} item{items.length === 1 ? "" : "s"} in your cart
          </p>
        </div>
      </div>

      {addFailed && <AddFailedBanner />}

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <CartLine
            key={item.id}
            item={item}
            // Optimistic lines have no server id yet — freeze their controls
            // for the ~1s until the commit settles and swaps in the real id.
            pending={isPending || isOptimisticLine(item.id)}
            onRemove={remove}
            onStep={stepQty}
          />
        ))}
      </div>

      {visibleCrossSell.length > 0 && (
        <div className="rounded-card border border-line bg-surface p-4 sm:p-6">
          <h2 className="text-lg font-medium text-brand">
            People who usually order your order also order...
          </h2>
          <p className="mt-1 text-sm text-muted">
            Add these items to your order and save on delivery fees
          </p>
          <div
            className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0"
            role="list"
          >
            {visibleCrossSell.map((c) => (
              <div
                key={c.id}
                role="listitem"
                className="snap-start sm:snap-align-none"
              >
                <CrossSellCard item={c} onAdd={() => addCrossSell(c)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Summary — narrower card centered on desktop per Figma; on
          mobile spans the full width like the other cart sections. Includes
          per-line breakdown, total, both checkout actions, and the promo
          code box. */}
      <div className="mx-auto flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:max-w-xl sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium text-brand">
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
            <span className="text-base font-semibold text-brand">
              Total
            </span>
            <span className="text-base font-semibold text-brand tabular-nums">
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
        {/* Promo / discount-code prompt — the live active promotion from
            Medusa (GET /store/active-promotion). Hidden when none is active. */}
        {promo && (
          <div className="mt-1 rounded-option border border-line bg-surface px-4 py-3">
            <p className="text-xs text-muted">Use code</p>
            <p className="text-base font-bold tracking-wider text-brand">
              {promo.code}
            </p>
            <p className="text-xs text-muted">
              at checkout for{" "}
              {promo.valueType === "percentage"
                ? `${promo.value}% off!`
                : `${formatGhs(promo.value)} off!`}
            </p>
          </div>
        )}
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
