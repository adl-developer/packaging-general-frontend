import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brand lockup: the horizontal terracotta wordmark (PG monogram + "Packaging
 * General") with the "Digital-First Packaging" tagline set beneath it. Shared
 * by the site header, the auth header and the footer so they never drift.
 *
 * `/logo-horizontal.png` is cropped tight to the artwork (505×136) so its left
 * edge lines up with the page gutter. `/logo.png` (the square monogram) is
 * still the OG / schema.org / PWA image — don't repoint those here.
 *
 * Sizes match packaginggeneral.com, whose uncropped PNG (566×152) renders at
 * 32px in the header and 38px in the footer — i.e. ~28px / ~34px of artwork.
 */
export function BrandLockup({
  priority = false,
  hideTaglineOnMobile = false,
  size = "header",
  className,
}: {
  priority?: boolean;
  /** Mobile header Figma hides the tagline for space. */
  hideTaglineOnMobile?: boolean;
  size?: "header" | "footer";
  className?: string;
}) {
  return (
    <span className={cn("flex flex-col items-start gap-2", className)}>
      <Image
        src="/logo-horizontal.png"
        alt="Packaging General"
        width={505}
        height={136}
        priority={priority}
        className={cn("w-auto", size === "footer" ? "h-[34px]" : "h-7")}
      />
      <span
        className={cn(
          "text-xs leading-4 text-muted",
          hideTaglineOnMobile && "hidden sm:inline",
        )}
      >
        Digital-First Packaging
      </span>
    </span>
  );
}
