import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

/**
 * Deep link target of the delivered email's "Reorder" button. Signed out →
 * the products page (where the button used to go). Signed in → the client
 * runner that performs the real reorder and lands on /cart.
 */
const getCustomer = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);

vi.mock("@/lib/actions/auth", () => ({ getCustomer }));
vi.mock("next/navigation", () => ({ redirect }));

import ReorderPage from "./page";
import { ReorderRunner } from "@/components/account/reorder-runner";

function findRunner(node: unknown): ReactElement | null {
  if (!node || typeof node !== "object") return null;
  const el = node as ReactElement<{ children?: unknown }>;
  if (el.type === ReorderRunner) return el;
  const children = el.props?.children;
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    const hit = findRunner(child);
    if (hit) return hit;
  }
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/account/orders/reorder/[id]", () => {
  it("sends a signed-out visitor to /products, exactly where the email button went before", async () => {
    getCustomer.mockResolvedValue(null);
    await expect(
      ReorderPage({ params: Promise.resolve({ id: "order_27" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/products");
  });

  it("renders the reorder runner for the order when signed in", async () => {
    getCustomer.mockResolvedValue({ id: "cus_1", email: "ama@example.com" });
    const tree = await ReorderPage({ params: Promise.resolve({ id: "order_27" }) });
    const runner = findRunner(tree);
    expect(runner).not.toBeNull();
    expect((runner as ReactElement<{ orderId: string }>).props.orderId).toBe("order_27");
    expect(redirect).not.toHaveBeenCalled();
  });
});
