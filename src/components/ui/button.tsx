import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  // Kraft-brown primary CTA (e.g. "Pay GH₵ …", "Join our community")
  primary:
    "bg-brand text-brand-foreground hover:bg-brand/90 active:bg-brand/80",
  // Cream outline buttons (e.g. "Apply", "Cart", "Account")
  outline:
    "bg-background text-brand border border-line hover:bg-line/30 active:bg-line/40",
  ghost: "bg-transparent text-brand hover:bg-line/30",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-4 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-10 px-5 text-sm gap-2",
};

/** Shared class string so both <button> and <Link> can be styled identically. */
export function buttonVariants({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-button font-medium",
    "transition-[color,background-color,transform] duration-200 ease-out",
    "hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
    "disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && "w-full",
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", fullWidth, type, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={buttonVariants({ variant, size, fullWidth, className })}
      {...props}
    />
  ),
);
Button.displayName = "Button";
