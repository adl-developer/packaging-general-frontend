"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sdk, authHeaders } from "@/lib/medusa";
import { getAuthToken } from "@/lib/auth-token";
import { safeNextPath } from "@/lib/google-sign-in";
import { PHONE_ERROR, normalizeGhanaPhone } from "@/lib/validation";

export type AddPhoneState = { error: string | null };

/**
 * The "Add your phone number" step after a Google sign-in (client,
 * 2026-10-12): Google gives us a name and email but never a phone, and every
 * account needs one (deliveries, SMS updates). Saves it as the customer's
 * phone, normalised to E.164 like every other phone we store, then continues
 * to where the sign-in was heading.
 */
export async function saveAccountPhone(
  _prev: AddPhoneState,
  formData: FormData,
): Promise<AddPhoneState> {
  const next = safeNextPath(formData.get("next"));
  const phone = normalizeGhanaPhone(String(formData.get("phone") || ""));
  if (!phone) return { error: PHONE_ERROR };

  const token = await getAuthToken();
  if (!token) redirect("/sign-in");

  try {
    await sdk.store.customer.update({ phone }, {}, authHeaders(token));
  } catch (err) {
    console.error("[account-phone] save failed:", err);
    return { error: "We couldn't save your phone number. Please try again." };
  }

  revalidatePath("/", "layout");
  // redirect() throws NEXT_REDIRECT, so it must live outside any try/catch.
  redirect(next);
}
