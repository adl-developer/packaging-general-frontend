import { shortfall, type StockState } from "@/lib/stock-rules";

/**
 * Reorder line-reconciliation — pure, no I/O.
 *
 * Given a past order's lines, the live stock map (keyed by VARIANT id, from
 * `getStockMap`), and the variants already sitting in the customer's current
 * cart, decide what actually gets added.
 *
 * Rules (see docs/superpowers/specs/2026-07-31-reorder-design.md §4):
 *  1. Service lines (Printing Setup Fee) are NEVER copied forward — the fee is
 *     re-derived from the printing option by the normal add path. Copying it
 *     would double-charge a fee the customer already paid.
 *  2. If the same variant is already in the cart, the order's quantity is
 *     added ON TOP of what's there (increment), not duplicated as a new line.
 *  3. The total (existing + requested) is capped at what's actually available.
 *     A line that cannot fit at all — because it is fully out of stock, or
 *     because the cart already holds everything sellable — is skipped
 *     entirely rather than silently truncated to a diff of 0.
 *  4. Unknown stock (absent from the map) fails OPEN — treated as fully
 *     available, matching the rest of the out-of-stock cycle.
 */
export interface ReorderLine {
  variantId: string;
  productId: string;
  name: string;
  /** Quantity from the original order. */
  quantity: number;
  /** Service lines (one-time fees) are excluded before any stock check. */
  isService: boolean;
}

export interface ExistingCartLine {
  variantId: string;
  quantity: number;
}

/** A line that will actually be written to the cart. */
export interface ReorderAddLine {
  variantId: string;
  name: string;
  /** Quantity to ADD on top of `existingQuantity` — a delta, not a total. */
  addQuantity: number;
  /** The variant's current quantity in the cart, if any (0 if not present). */
  existingQuantity: number;
}

export interface ReorderCappedLine {
  variantId: string;
  name: string;
  requestedQuantity: number;
  addedQuantity: number;
}

export interface ReorderSkippedLine {
  variantId: string;
  name: string;
}

export interface ReorderReconciliation {
  linesToAdd: ReorderAddLine[];
  cappedLines: ReorderCappedLine[];
  skippedLines: ReorderSkippedLine[];
}

export function reconcileReorder(
  orderLines: ReorderLine[],
  stockByVariant: Map<string, StockState>,
  existingCartLines: ExistingCartLine[] = [],
): ReorderReconciliation {
  const existingByVariant = new Map(
    existingCartLines.map((l) => [l.variantId, l.quantity]),
  );

  const linesToAdd: ReorderAddLine[] = [];
  const cappedLines: ReorderCappedLine[] = [];
  const skippedLines: ReorderSkippedLine[] = [];

  for (const orderLine of orderLines) {
    // Rule 1 — service lines are never reordered.
    if (orderLine.isService) continue;
    if (orderLine.quantity <= 0) continue;

    const existingQuantity = existingByVariant.get(orderLine.variantId) ?? 0;
    const state = stockByVariant.get(orderLine.variantId);

    // Rule 4 — unknown stock state fails open.
    if (!state) {
      linesToAdd.push({
        variantId: orderLine.variantId,
        name: orderLine.name,
        addQuantity: orderLine.quantity,
        existingQuantity,
      });
      continue;
    }

    const desiredTotal = existingQuantity + orderLine.quantity;
    const cap = shortfall(desiredTotal, state);

    if (cap === null) {
      // Fits entirely — no cap needed.
      linesToAdd.push({
        variantId: orderLine.variantId,
        name: orderLine.name,
        addQuantity: orderLine.quantity,
        existingQuantity,
      });
      continue;
    }

    const addQuantity = Math.max(cap.reduceTo - existingQuantity, 0);

    if (addQuantity <= 0) {
      // Nothing can be added — fully out of stock, or the cart already
      // holds everything that's sellable. Either way, skip and report.
      skippedLines.push({ variantId: orderLine.variantId, name: orderLine.name });
      continue;
    }

    linesToAdd.push({
      variantId: orderLine.variantId,
      name: orderLine.name,
      addQuantity,
      existingQuantity,
    });
    cappedLines.push({
      variantId: orderLine.variantId,
      name: orderLine.name,
      requestedQuantity: orderLine.quantity,
      addedQuantity: addQuantity,
    });
  }

  return { linesToAdd, cappedLines, skippedLines };
}

/**
 * Plain-language summary of what happened, for the cart to display. Returns
 * null for a clean reorder (nothing capped or skipped) — matching the Figma
 * "when reorder is clicked" frame, which shows no banner at all in that case.
 *
 * Never silently changes a quantity: a capped or skipped line is always named
 * in the message (see the design's §4.1 examples).
 */
export function buildReorderMessage(result: ReorderReconciliation): string | null {
  const addedCount = result.linesToAdd.length;
  const cappedCount = result.cappedLines.length;
  const skippedCount = result.skippedLines.length;

  if (cappedCount === 0 && skippedCount === 0) return null;

  const parts: string[] = [];

  if (addedCount > 0) {
    parts.push(`${addedCount} item${addedCount === 1 ? "" : "s"} added.`);
  }

  if (cappedCount > 0) {
    parts.push(
      `${cappedCount} item${cappedCount === 1 ? "" : "s"} ${
        cappedCount === 1 ? "was" : "were"
      } reduced to the quantity we have available.`,
    );
  }

  if (skippedCount > 0) {
    const names = result.skippedLines.map((l) => l.name).join(", ");
    parts.push(
      `${skippedCount} item${skippedCount === 1 ? "" : "s"} ${
        skippedCount === 1 ? "is" : "are"
      } out of stock and ${skippedCount === 1 ? "was" : "were"} not added: ${names}.`,
    );
  }

  return parts.join(" ");
}
