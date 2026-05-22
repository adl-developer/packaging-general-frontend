import { cn } from "@/lib/utils";

/**
 * Standard landing section heading — Figma: Inter Medium 36px / 40px,
 * letter-spacing +0.37px. Pass a color via className (brand on light
 * sections, dark-foreground on dark sections).
 */
export function SectionHeading({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      className={cn(
        "text-4xl font-medium leading-10 tracking-[0.37px]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Section subtitle — Figma: Inter Regular 18px / 28px, tracking -0.44px. */
export function SectionSubtitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-lg leading-7 tracking-tight", className)}>
      {children}
    </p>
  );
}
