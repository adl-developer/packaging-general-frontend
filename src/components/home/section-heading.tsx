import { cn } from "@/lib/utils";

/**
 * Standard landing section heading — Figma: Inter Medium, 30px/36px on mobile
 * scaling to 36px/40px at sm+ (matches the mobile + desktop Figma frames).
 * Letter-spacing comes from the size tokens (+0.396px @30, +0.369px @36). Pass
 * a color via className (brand on light sections, dark-foreground on dark).
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
        "text-3xl font-semibold sm:text-4xl",
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
    <p className={cn("text-lg leading-7", className)}>
      {children}
    </p>
  );
}
