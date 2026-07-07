import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Package, ShoppingBag } from "lucide-react";
import { getCustomer } from "@/lib/actions/auth";
import { listMyOrders } from "@/lib/actions/orders";
import { formatGhs } from "@/lib/format";
import { formatOrderNumber } from "@/lib/order-number";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "My Orders",
  robots: { index: false, follow: false },
};

// Customer-specific data — never cache.
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function statusLabel(order: {
  fulfillment_status?: string | null;
  payment_status?: string | null;
}): { label: string; tone: string } {
  const f = order.fulfillment_status ?? "";
  if (f === "delivered") return { label: "Delivered", tone: "bg-[#dcfce7] text-[#166534]" };
  if (f === "shipped" || f === "partially_shipped")
    return { label: "Shipped", tone: "bg-accent/20 text-brand" };
  if (f === "fulfilled" || f === "partially_fulfilled")
    return { label: "Processing", tone: "bg-accent/20 text-brand" };
  if (order.payment_status === "captured" || order.payment_status === "authorized")
    return { label: "Confirmed", tone: "bg-rust/10 text-rust" };
  return { label: "Pending", tone: "bg-line/60 text-muted" };
}

export default async function AccountOrdersPage() {
  const customer = await getCustomer();
  if (!customer) {
    redirect("/sign-in");
  }

  const orders = await listMyOrders();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand/70"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Continue Shopping
        </Link>
      </div>

      <Reveal className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold leading-9 text-brand">
          My Orders
        </h1>
        <p className="text-base leading-6 text-muted">
          Signed in as {customer.email}
        </p>
      </Reveal>

      {orders.length === 0 ? (
        <Reveal className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface px-6 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-line/60">
            <ShoppingBag className="size-7 text-muted" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold text-brand">No orders yet</p>
            <p className="text-sm text-muted">
              When you place an order, it will show up here.
            </p>
          </div>
          <Link
            href="/products"
            className="mt-2 inline-flex h-11 items-center rounded-button bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Browse Products
          </Link>
        </Reveal>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => {
            const status = statusLabel(order);
            const itemCount = (order.items ?? []).reduce(
              (n, i) => n + (i.quantity ?? 0),
              0
            );
            return (
              <li key={order.id}>
                <Reveal className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-muted" aria-hidden />
                        <span className="text-base font-semibold text-brand">
                          Order {formatOrderNumber(order.display_id, order.created_at, order.id)}
                        </span>
                      </div>
                      <span className="text-sm text-muted">
                        {order.created_at
                          ? dateFmt.format(new Date(order.created_at))
                          : ""}{" "}
                        · {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <span
                      className={`inline-flex h-7 w-fit items-center rounded-full px-3 text-xs font-medium ${status.tone}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <ul className="flex flex-col gap-1 border-t border-line pt-3">
                    {(order.items ?? []).map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                      >
                        <span className="text-brand">
                          {item.quantity}× {item.product_title ?? item.title}
                        </span>
                        <span className="text-muted">
                          {formatGhs(Number(item.total ?? 0))}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="text-sm text-muted">
                      Total{" "}
                      <span className="text-lg font-semibold text-brand">
                        {formatGhs(Number(order.total ?? 0))}
                      </span>
                    </span>
                    <Link
                      href={`/track-order?order=${formatOrderNumber(order.display_id, order.created_at, order.id)}&email=${encodeURIComponent(order.email ?? customer.email)}`}
                      className="inline-flex h-9 items-center rounded-button border border-line bg-background px-4 text-sm font-medium text-brand transition-colors hover:bg-line/30"
                    >
                      Track Order
                    </Link>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
