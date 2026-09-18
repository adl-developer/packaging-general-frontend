"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { reorderOrder } from "@/lib/actions/reorder";
import { setReorderNotice } from "@/lib/reorder-notice";

/**
 * Runs the one-click reorder for a deep link (the delivered email's "Reorder"
 * button) and then does exactly what the orders-page button does: stash any
 * "capped / skipped" notice for /cart and navigate there.
 *
 * The page that mounts this has already confirmed a session, but the action
 * re-checks it and resolves the order through the customer-scoped reader, so
 * a forged or foreign order id ends here with an error, never in a cart.
 */
export function ReorderRunner({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    // Effects double-fire in dev Strict Mode; the reorder must run once.
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    (async () => {
      try {
        const result = await reorderOrder(orderId);
        if (cancelled) return;
        if (result.ok) {
          if (result.message) setReorderNotice(result.message);
          router.replace("/cart");
          return;
        }
        setError(result.error);
      } catch (err) {
        console.error("[reorder] deep link failed:", err);
        if (!cancelled) setError("Something went wrong. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, router]);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="alert"
          className="flex items-start gap-2 rounded-button border border-rust/30 bg-rust/10 px-3 py-2 text-sm text-rust"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/account/orders"
            className="inline-flex h-10 items-center rounded-button bg-brand px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
          >
            View My Orders
          </Link>
          <Link
            href="/products"
            className="inline-flex h-10 items-center rounded-button border border-line px-4 text-sm font-medium text-brand transition-colors hover:bg-line/30"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-sm text-muted"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Adding the items from this order to your cart…
    </p>
  );
}
