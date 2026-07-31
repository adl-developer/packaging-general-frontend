"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { reorderOrder } from "@/lib/actions/reorder";
import { setReorderNotice } from "@/lib/reorder-notice";

/**
 * Order-history row actions — Figma frame 3971:1260 "Actions" cell: two
 * buttons side by side (gap 8), "View" (79×32, ghost — no fill) and
 * "Reorder" (100×32, radius 14, fill `rgba(232,229,222,1)` == the app's
 * `bg-background` token, border `rgba(196,188,176,1)` == `border-line`).
 *
 * Reorder auth + verification happen server-side in `reorderOrder` (it
 * re-checks the session and resolves the order through the customer-scoped
 * `getMyOrder` — an order id from this button can never read or reorder
 * someone else's order). This component only relays the (already-verified)
 * result:
 *  - failure (not signed in / not found / nothing available) → shown inline,
 *    right here, so the customer isn't silently left on a page that did
 *    nothing.
 *  - success → the cart already reflects what happened; if anything was
 *    capped or skipped, the message is handed to /cart via
 *    `reorder-notice.ts` and shown there as a plain banner. No toast (the
 *    design has none — see docs/superpowers/specs/2026-07-31-reorder-design.md
 *    §2.1) — a short spinner on the button itself is the only feedback while
 *    the reconciliation runs.
 */
export function ReorderActions({
  orderId,
  viewHref,
}: {
  orderId: string;
  viewHref: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onReorder = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await reorderOrder(orderId);
      if (result.ok) {
        if (result.message) setReorderNotice(result.message);
        router.push("/cart");
        return; // keep the button in its pending state through the navigation
      }
      setError(result.error);
      setPending(false);
    } catch (err) {
      console.error("[reorder] failed:", err);
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Link
          href={viewHref}
          className="inline-flex h-8 w-[79px] items-center justify-center gap-1.5 rounded-button px-2.5 text-sm font-medium text-brand transition-colors hover:bg-line/20"
        >
          View
        </Link>
        <button
          type="button"
          onClick={onReorder}
          disabled={pending}
          className="inline-flex h-8 w-[100px] items-center justify-center gap-1.5 rounded-button border border-line bg-background px-2.5 text-sm font-medium text-brand transition-colors hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          Reorder
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
