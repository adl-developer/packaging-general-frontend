// Typed parser for product.metadata.pg_attributes — the new N-axis attribute
// model (admin "Product Variants" UI). Storefront rendering stays additive:
// legacy sizes/materials/printing/combos keep building unconditionally;
// `attributes`/`combosV2` are only consulted when `attributes.length > 0`.

export type StorefrontSection =
  | "size"
  | "material"
  | "printing_colour"
  | "type"
  | "custom";

export const SECTION_LABELS: Record<StorefrontSection, string> = {
  size: "Size",
  material: "Material",
  printing_colour: "Printing & Colour",
  type: "Type",
  custom: "Custom",
};

const SECTIONS = new Set(Object.keys(SECTION_LABELS));

export type ParsedAttributeValue = {
  id: string;
  label: string;
  description?: string;
  setupFee: number;
  perUnit: number;
};

export type ParsedAttribute = {
  section: StorefrontSection;
  name: string;
  kind: string;
  values: ParsedAttributeValue[];
};

/** Typed attribute defs from product.metadata.pg_attributes. [] on anything malformed. */
export function parseAttributes(meta: unknown): ParsedAttribute[] {
  if (!Array.isArray(meta)) return [];
  const out: ParsedAttribute[] = [];
  for (const raw of meta) {
    if (typeof raw !== "object" || raw === null) return [];
    const a = raw as Record<string, unknown>;
    if (typeof a.name !== "string" || !a.name.trim()) return [];
    if (typeof a.section !== "string" || !SECTIONS.has(a.section)) return [];
    if (!Array.isArray(a.values)) return [];
    const values: ParsedAttributeValue[] = [];
    for (const v of a.values as Record<string, unknown>[]) {
      const label = typeof v?.value === "string" ? v.value.trim() : "";
      if (!label) continue;
      values.push({
        id: label,
        label,
        description:
          typeof v.description === "string" && v.description
            ? v.description
            : undefined,
        setupFee: typeof v.setupFee === "number" ? v.setupFee : 0,
        perUnit: typeof v.perUnit === "number" ? v.perUnit : 0,
      });
    }
    out.push({
      section: a.section as StorefrontSection,
      name: a.name.trim(),
      kind: typeof a.kind === "string" ? a.kind : "text",
      values,
    });
  }
  return out;
}

export type ComboV2 = {
  options: Record<string, string>;
  variantId: string;
  unitPrice: number;
};

/** A combo matches when every attribute named on either side agrees ("" = absent). */
export function resolveOptionsMatch(
  combos: ComboV2[],
  selection: Record<string, string>,
): ComboV2 | undefined {
  return combos.find((c) => {
    const names = new Set([...Object.keys(c.options), ...Object.keys(selection)]);
    for (const n of names) {
      if ((c.options[n] ?? "") !== (selection[n] ?? "")) return false;
    }
    return true;
  });
}
