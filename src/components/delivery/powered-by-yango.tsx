import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * "Powered by Yango Delivery" badge (user request, 2026-09-29), shown
 * wherever home DELIVERY is presented to the customer: the checkout's
 * "Deliver to me" note, the order confirmation and the order page's Delivery
 * Information. Never on pickup orders: Yango carries nothing there.
 *
 * The artwork is Yango's own badge PNG (`public/brand/powered-by-yango.png`,
 * 312×72 = 2× of the 156×36 badge, border and text baked in), so it renders
 * exactly as supplied. `unoptimized` serves those pixels as-is; the
 * optimizer's nearest width buckets would soften the 2× copy.
 */
export function PoweredByYango({ className }: { className?: string }) {
  return (
    <a
      href="https://yango.com"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex shrink-0 rounded-[8px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF0000]",
        className,
      )}
    >
      <Image
        src="/brand/powered-by-yango.png"
        alt="Powered by Yango Delivery"
        width={156}
        height={36}
        unoptimized
      />
    </a>
  );
}
