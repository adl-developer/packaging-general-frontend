import { cn } from "@/lib/utils";

/**
 * Skeleton placeholder block. Used by route-level `loading.tsx` files so a
 * navigation paints an instant on-brand shell instead of a dead click while
 * the (server-rendered, sometimes slow-backend) page streams in.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-line/60", className)}
    />
  );
}
