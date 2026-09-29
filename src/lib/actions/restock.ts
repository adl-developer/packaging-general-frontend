"use server";

import { sdk } from "@/lib/medusa";
import { currentStorefrontUrl } from "@/lib/storefront-origin";
import { validateRestockContact, type RestockContact } from "@/lib/restock";

export type RestockResult = { ok: true } | { ok: false; error: string };

/**
 * "Request restock" → POST /store/restock-request, which emails PG's admins
 * and super admins (2026-09-29). The backend re-validates everything.
 */
export async function requestRestock(input: {
  variantId: string;
  quantity: number;
  contact: RestockContact;
  /** Path of the page the request came from ("/products/everyday-box"). */
  path?: string;
}): Promise<RestockResult> {
  const checked = validateRestockContact(input.contact);
  if (!checked.ok) return { ok: false, error: checked.error };
  const quantity = Math.floor(Number(input.quantity));
  if (!input.variantId || !Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  const origin = await currentStorefrontUrl();
  const path =
    typeof input.path === "string" && input.path.startsWith("/") && !input.path.startsWith("//")
      ? input.path.slice(0, 300)
      : "";

  try {
    await sdk.client.fetch("/store/restock-request", {
      method: "POST",
      body: {
        variant_id: input.variantId,
        quantity,
        ...checked.contact,
        ...(origin ? { page_url: `${origin}${path}` } : {}),
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("[restock] request failed:", err);
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      return { ok: false, error: "You've sent a few requests already. Please try again later." };
    }
    return {
      ok: false,
      error: "We couldn't send your request right now. Please try again, or contact us directly.",
    };
  }
}
