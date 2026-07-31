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
 *  4. A variant absent from the map is either DISCONTINUED or UNKNOWN, and the
 *     two must not be conflated — see `catalogResolved` on reconcileReorder.
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
  /** In the catalog, but not sellable right now (out of stock). */
  skippedLines: ReorderSkippedLine[];
  /** No longer in the catalog at all — the shop stopped selling it. */
  discontinuedLines: ReorderSkippedLine[];
}

/**
 * @param catalogResolved  Did the live catalog lookup actually succeed?
 *
 * This flag is the whole difference between "we know this variant is gone" and
 * "we couldn't ask", and it is why old orders used to 500 the reorder action.
 *
 * TRUE  — the backend answered. A variant missing from `stockByVariant` is
 *         therefore PROVEN deleted/unpublished (Medusa silently omits dead ids
 *         from /store/products rather than erroring), so the line is
 *         discontinued. Adding it would make Medusa reject the whole cart write
 *         with 400 "Variants … do not exist" — which is exactly what happened
 *         to orders placed before the catalog re-import.
 * FALSE — the lookup failed (backend blip). Absence proves nothing, so every
 *         line fails OPEN and is added, matching the rest of the
 *         out-of-stock cycle. Medusa still refuses a genuinely short order at
 *         cart.complete(), so the money path stays safe.
 */
export function reconcileReorder(
  orderLines: ReorderLine[],
  stockByVariant: Map<string, StockState>,
  existingCartLines: ExistingCartLine[] = [],
  catalogResolved = false,
): ReorderReconciliation {
  const existingByVariant = new Map(
    existingCartLines.map((l) => [l.variantId, l.quantity]),
  );

  const linesToAdd: ReorderAddLine[] = [];
  const cappedLines: ReorderCappedLine[] = [];
  const skippedLines: ReorderSkippedLine[] = [];
  const discontinuedLines: ReorderSkippedLine[] = [];

  for (const orderLine of orderLines) {
    // Rule 1 — service lines are never reordered.
    if (orderLine.isService) continue;
    if (orderLine.quantity <= 0) continue;

    const existingQuantity = existingByVariant.get(orderLine.variantId) ?? 0;
    const state = stockByVariant.get(orderLine.variantId);

    // Rule 4 — absent from a RESOLVED catalog means the variant is gone.
    if (!state && catalogResolved) {
      discontinuedLines.push({
        variantId: orderLine.variantId,
        name: orderLine.name,
      });
      continue;
    }

    // Absent from an UNRESOLVED catalog proves nothing — fail open.
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

  return { linesToAdd, cappedLines, skippedLines, discontinuedLines };
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
  const goneCount = result.discontinuedLines.length;

  if (cappedCount === 0 && skippedCount === 0 && goneCount === 0) return null;

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

  // Deliberately NOT folded into the out-of-stock sentence: "out of stock"
  // invites the customer to check back later, which would be untrue for a
  // product the shop has stopped selling.
  if (goneCount > 0) {
    const names = result.discontinuedLines.map((l) => l.name).join(", ");
    parts.push(
      `${goneCount} item${goneCount === 1 ? "" : "s"} ${
        goneCount === 1 ? "is" : "are"
      } no longer available and ${
        goneCount === 1 ? "was" : "were"
      } not added: ${names}.`,
    );
  }

  return parts.join(" ");
}
