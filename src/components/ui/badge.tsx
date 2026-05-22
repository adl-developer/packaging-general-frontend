import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "plum" | "brand" | "accent";

const variantStyles: Record<BadgeVariant, string> = {
  plum: "bg-plum text-brand-foreground", // cart count
  brand: "bg-brand text-brand-foreground",
  accent: "bg-accent text-accent-foreground",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/** Small pill/count badge (Figma: cart count badge on the header). */
export function Badge({ className, variant = "plum", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5",
        "text-xs font-semibold leading-4",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
