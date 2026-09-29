import { describe, expect, it } from "vitest";
import {
  contactFromCustomer,
  mergeContactPrefill,
  normalizeFeedbackContact,
} from "./feedback-contact";

describe("normalizeFeedbackContact", () => {
  it("all blank → ok with no contact (anonymous report)", () => {
    expect(normalizeFeedbackContact({ name: " ", phone: "", email: undefined })).toEqual({
      ok: true,
      contact: undefined,
    });
    expect(normalizeFeedbackContact(null)).toEqual({ ok: true, contact: undefined });
  });

  it("keeps only what was typed, trimmed", () => {
    expect(normalizeFeedbackContact({ name: "  Ama Mensah ", phone: "", email: "ama@shop.gh " })).toEqual({
      ok: true,
      contact: { name: "Ama Mensah", email: "ama@shop.gh" },
    });
  });

  it("accepts the usual Ghana phone spellings", () => {
    for (const phone of ["0241234567", "+233 24 123 4567", "233-24-123-4567", "(024) 123 4567"]) {
      expect(normalizeFeedbackContact({ phone }).ok).toBe(true);
    }
  });

  it("rejects a malformed phone or email with a readable message", () => {
    const p = normalizeFeedbackContact({ phone: "call me" });
    expect(p.ok).toBe(false);
    expect(!p.ok && p.error).toMatch(/phone/);
    const e = normalizeFeedbackContact({ email: "ama@" });
    expect(e.ok).toBe(false);
    expect(!e.ok && e.error).toMatch(/email/);
  });
});

describe("contactFromCustomer", () => {
  it("joins first + last name and carries phone and email", () => {
    expect(
      contactFromCustomer({ first_name: "Ama", last_name: "Mensah", phone: "0241234567", email: "a@b.co" }),
    ).toEqual({ name: "Ama Mensah", phone: "0241234567", email: "a@b.co" });
  });

  it("signed out → all empty", () => {
    expect(contactFromCustomer(null)).toEqual({ name: "", phone: "", email: "" });
  });
});

describe("mergeContactPrefill", () => {
  const empty = { name: "", phone: "", email: "" };
  const ama = { name: "Ama Mensah", phone: "0241234567", email: "ama@shop.gh" };

  it("fills an untouched form from the account", () => {
    expect(mergeContactPrefill(empty, empty, ama)).toEqual(ama);
  });

  it("keeps what the reporter typed before the prefill arrived", () => {
    expect(mergeContactPrefill({ ...empty, name: "Kofi" }, empty, ama)).toEqual({ ...ama, name: "Kofi" });
  });

  it("keeps an edit or a deliberate clear on the next open", () => {
    expect(mergeContactPrefill({ ...ama, phone: "", email: "work@co.gh" }, ama, ama)).toEqual({
      ...ama,
      phone: "",
      email: "work@co.gh",
    });
  });

  it("signing out clears only the fields the old account filled", () => {
    expect(mergeContactPrefill({ ...ama, email: "work@co.gh" }, ama, empty)).toEqual({
      ...empty,
      email: "work@co.gh",
    });
  });
});
