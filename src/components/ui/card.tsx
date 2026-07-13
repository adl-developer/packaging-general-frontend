import * as React from "react";
import { cn } from "@/lib/utils";

/** Opt-in hover affordance for interactive cards (e.g. clickable grid cards). */
export const cardHoverClass =
  "transition-shadow duration-200 ease-out hover:shadow-header";

/** Surface card — bg-surface, 1px line border, 20px radius (Figma "Card"). */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1 p-6 pb-0", className)} {...props} />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-base font-medium text-brand", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  // Figma: Inter Regular 16px / 24px (inherited from the card-header wrapper).
  return (
    <p className={cn("text-base leading-6 text-muted", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}
