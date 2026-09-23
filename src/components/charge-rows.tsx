import { formatGhs } from "@/lib/format";
import type { ChargeRow } from "@/lib/charge-breakdown";
import { cn } from "@/lib/utils";

/**
 * The charge ladder, rendered (client, 2026-09-23): Subtotal → Discount →
 * Delivery → Platform Fee → VAT → NHIL → GETFund → Total — every surface that
 * shows what a cart or order costs renders through this, so they can't drift
 * apart. Rows come from `lib/charge-breakdown.ts` (live cart) or straight
 * from the order lookup's `breakdown.rows` (placed orders); zero lines are
 * already hidden there.
 *
 * No hooks — safe in server and client components alike.
 */
export function ChargeRows({
  rows,
  hideTotal = false,
  totalLabel = "Total",
  className,
}: {
  rows: readonly ChargeRow[];
  /** For surfaces that show the total in their own card (receipt dialog). */
  hideTotal?: boolean;
  totalLabel?: string;
  className?: string;
}) {
  const lines = rows.filter((r) => r.key !== "total");
  const total = rows.find((r) => r.key === "total");
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {lines.map((r) => (
        <div
          key={r.key}
          className="flex items-center justify-between gap-4 text-sm"
        >
          <span className="text-muted">{r.label}</span>
          <span
            className={cn(
              "tabular-nums",
              r.negative ? "font-medium text-plum" : "text-brand",
            )}
          >
            {r.free ? "Free" : r.negative ? `−${formatGhs(r.amount)}` : formatGhs(r.amount)}
          </span>
        </div>
      ))}
      {!hideTotal && total && (
        <>
          <div className="h-px w-full bg-line" />
          <div className="flex items-center justify-between gap-4">
            <span className="text-lg font-semibold">{totalLabel}</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatGhs(total.amount)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
