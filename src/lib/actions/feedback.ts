"use server";

import { headers } from "next/headers";
import { sdk } from "@/lib/medusa";
import { getCustomer } from "@/lib/actions/auth";
import { getCart } from "@/lib/actions/cart";
import type { FeedbackContext } from "@/lib/feedback-context";

/**
 * The floating feedback button's submit path.
 *
 * Runs on the server so the browser never talks to the backend's feedback
 * route directly, and so the report can carry what only the server knows:
 * the customer behind the httpOnly auth cookie, the cart behind the cart
 * cookie, and the request's IP / country headers. Everything else was
 * captured in the browser (`lib/feedback-context.ts`).
 *
 * `getCart({ sync: false })` — a feedback submit must not trigger the charge
 * syncs; we only want to describe the cart, not touch it.
 */

export type FeedbackResult = { ok: true } | { ok: false; error: string };

const TITLE_MAX = 120;
const MESSAGE_MAX = 5000;

export async function sendFeedback(input: {
  title: string;
  message: string;
  context: FeedbackContext;
}): Promise<FeedbackResult> {
  const title = (input.title ?? "").trim().slice(0, TITLE_MAX);
  const message = (input.message ?? "").trim().slice(0, MESSAGE_MAX);
  if (!title || !message) {
    return { ok: false, error: "Please add a title and a message." };
  }

  const [customer, cart, h] = await Promise.all([
    getCustomer().catch(() => null),
    getCart({ sync: false }).catch(() => null),
    headers(),
  ]);

  const forwarded = h.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  const context = {
    ...input.context,
    session: {
      signedIn: !!customer,
      cartId: cart?.id ?? null,
      cartLines: cart?.items?.length ?? 0,
      cartTotal: cart?.total ?? null,
      cartCurrency: cart?.currency_code ?? null,
      cartEmail: cart?.email ?? null,
    },
    request: {
      ip,
      country: h.get("x-vercel-ip-country") ?? null,
      city: h.get("x-vercel-ip-city") ?? null,
      serverUserAgent: h.get("user-agent") ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      vercelCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
  };

  try {
    await sdk.client.fetch<{ sent: boolean }>("/store/feedback", {
      method: "POST",
      body: {
        title,
        message,
        context,
        reporter: customer
          ? { email: customer.email ?? undefined, customerId: customer.id }
          : undefined,
      },
    });
    return { ok: true };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    console.error("[feedback] send failed:", err);
    return {
      ok: false,
      error:
        status === 429
          ? "You've sent a lot of feedback just now. Please try again in a few minutes."
          : "We couldn't send your feedback right now. Please try again later.",
    };
  }
}
