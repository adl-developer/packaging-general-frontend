import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartToast } from "@/components/ui/cart-toast";

// Storefront chrome (header + promo bar + footer). Wraps every shopping route.
// Auth pages live in the (auth) group with their own minimal chrome.
export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartToast />
    </div>
  );
}
