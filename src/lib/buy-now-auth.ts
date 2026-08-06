/**
 * Signed-out Buy Now — pure state helpers.
 *
 * See docs/superpowers/specs/2026-08-06-buy-now-signed-out-design.md.
 *
 * Buy Now is visible to everyone; a signed-out customer who clicks it gets an
 * auth modal instead of a refusal. This module holds the shape of that
 * modal's state and the parsing of the item payload it carries, kept free of
 * cookies, Medusa and React so both the server action and the dialog can
 * import it — and so it is testable in isolation (buy-now-auth.test.ts).
 */
import type { BuyNowRoute } from "./buy-now";

/** The routes a successful Buy Now can produce ("refused" can't reach here —
 *  by the time we route, a session exists). */
export type ContinueRoute = Exclude<BuyNowRoute, "refused">;

export type BuyNowAuthState =
  /** Nothing submitted yet. */
  | { status: "idle" }
  /** Credential/validation failure — the form stays up with this message. */
  | { status: "error"; error: string }
  /** Correct credentials for an account that hasn't verified its email. No
   *  session, and deliberately nothing added to the cart. */
  | { status: "unverified"; email: string }
  /** Signup succeeded. There is no session until they click the emailed link,
   *  so the item waits in the guest cart — `itemSaved` is false if that add
   *  failed, and the panel must say so rather than promise a saved order. */
  | { status: "pending-verification"; email: string; itemSaved: boolean }
  /** Signed in and the item is in the cart — the caller navigates. */
  | { status: "continue"; route: ContinueRoute; notice?: string };

export const INITIAL_BUY_NOW_AUTH_STATE: BuyNowAuthState = { status: "idle" };

/** Which face of the modal a given state shows. "continue" is not a panel the
 *  customer sees — it means the dialog hands the route back and closes. */
export type BuyNowAuthPanel = "form" | "verify" | "continue";

export function panelFor(state: BuyNowAuthState): BuyNowAuthPanel {
  switch (state.status) {
    case "unverified":
    case "pending-verification":
      return "verify";
    case "continue":
      return "continue";
    default:
      return "form";
  }
}

export type BuyNowItem = {
  variantId: string;
  quantity: number;
  setupPrintingValue?: string;
  notes?: string;
};

export const ITEM_ERROR =
  "We couldn't read your selection. Please close this and try again.";

/**
 * Parse the item payload carried as hidden fields on the modal's form.
 *
 * Everything arrives as a string (or null) from FormData, and this is the
 * money path — a NaN quantity or a missing variant must fail loudly here
 * rather than reach `addConfiguredLineItem`.
 */
export function parseBuyNowItem(raw: {
  variantId?: string | null;
  quantity?: string | null;
  setupPrintingValue?: string | null;
  notes?: string | null;
}): { ok: true; item: BuyNowItem } | { ok: false; error: string } {
  const variantId = (raw.variantId ?? "").trim();
  if (!variantId) return { ok: false, error: ITEM_ERROR };

  const rawQuantity = (raw.quantity ?? "").trim();
  const quantity = Number(rawQuantity);
  if (!rawQuantity || !Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: ITEM_ERROR };
  }

  const setupPrintingValue = (raw.setupPrintingValue ?? "").trim();
  const notes = (raw.notes ?? "").trim();

  return {
    ok: true,
    item: {
      variantId,
      quantity,
      ...(setupPrintingValue ? { setupPrintingValue } : {}),
      ...(notes ? { notes } : {}),
    },
  };
}
