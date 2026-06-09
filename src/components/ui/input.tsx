import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders the error border treatment (Figma: 2px destructive border). */
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-9 w-full rounded-button border-2 bg-surface px-3 text-sm text-brand",
        "placeholder:text-muted focus-visible:outline-none focus-visible:border-accent",
        invalid ? "border-destructive-border" : "border-input",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium tracking-tight text-brand", className)}
      {...props}
    />
  );
}

/** Inline form error message (Figma: destructive text under the field). */
export function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      role="alert"
      className={cn("text-sm text-destructive", className)}
      {...props}
    />
  );
}
