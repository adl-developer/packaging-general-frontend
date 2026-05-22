"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CARTON_MATERIALS,
  CARTON_PRINTING,
  quantityTier,
  type Product,
} from "@/lib/products";

/**
 * Product customizer — Figma frame 404:1371. A single scrollable "Customize
 * Product" card with four sections (Select Size, Choose Material, Printing
 * Options, Order Quantity + notes) and Keep Shopping / Buy Now actions.
 * Selected option cards use a taupe tint (rgba(196,188,176,0.3)) + line border.
 * The sticky header shows a progress bar that fills as selections are made.
 *
 * TODO(medusa): persist the configured line item to the cart; pull options
 * from product variants; compute live pricing.
 */
export function ProductCustomizer({ product }: { product: Product }) {
  const router = useRouter();
  const [size, setSize] = React.useState(product.sizes[0]?.id ?? "");
  const [material, setMaterial] = React.useState(CARTON_MATERIALS[0]?.id ?? "");
  const [printing, setPrinting] = React.useState(CARTON_PRINTING[0]?.id ?? "");
  const [quantity, setQuantity] = React.useState(product.moq);

  // Progress: 4 selectable sections complete → step 5 (review/buy).
  const completed =
    (size ? 1 : 0) +
    (material ? 1 : 0) +
    (printing ? 1 : 0) +
    (quantity >= product.moq ? 1 : 0);
  const step = Math.min(completed + 1, 5);

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Sticky progress header */}
      <div className="sticky top-[121px] z-40 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link
              href={`/products/${product.slug}`}
              className="inline-flex items-center gap-1.5 rounded-button px-3 text-sm font-medium text-brand transition-colors hover:text-brand/70"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Link>
            <span className="text-sm text-muted">Step {step} of 5</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3f4f6]">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-medium leading-9 tracking-tight text-brand">
            {product.name}
          </h1>
          <p className="text-lg leading-7 tracking-tight text-muted">
            {product.description}
          </p>
        </div>

        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="border-b border-line p-6">
            <h2 className="text-2xl font-medium tracking-tight text-brand">
              Customize Product
            </h2>
            <p className="text-base text-muted">
              Configure your packaging requirements
            </p>
          </div>

          <div className="flex flex-col gap-10 p-6">
            {/* 1. Select Size */}
            <Section title="1. Select Size">
              {product.sizes.map((s) => (
                <OptionCard
                  key={s.id}
                  selected={size === s.id}
                  onSelect={() => setSize(s.id)}
                  title={s.label}
                  description={s.dimensions}
                  trailing={<BoxDiagram dimensions={s.dimensions} />}
                />
              ))}
            </Section>

            {/* 2. Choose Material */}
            <Section title="2. Choose Material">
              {CARTON_MATERIALS.map((m) => (
                <OptionCard
                  key={m.id}
                  selected={material === m.id}
                  onSelect={() => setMaterial(m.id)}
                  title={m.label}
                  description={m.description}
                />
              ))}
            </Section>

            {/* 3. Printing Options */}
            <Section title="3. Printing Options">
              {CARTON_PRINTING.map((p) => (
                <OptionCard
                  key={p.id}
                  selected={printing === p.id}
                  onSelect={() => setPrinting(p.id)}
                  title={p.label}
                  description={p.description}
                  meta={p.setupFee}
                />
              ))}
            </Section>

            {/* 4. Order Quantity */}
            <Section title="4. Order Quantity">
              <div className="flex flex-col gap-3">
                <input
                  type="number"
                  min={product.moq}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  className="h-9 w-full rounded-button border-2 border-input bg-surface px-3 text-sm text-brand focus-visible:border-brand focus-visible:outline-none"
                />
                <div className="rounded-option border border-line bg-[rgba(196,188,176,0.3)] px-3.5 py-3">
                  <p className="text-sm font-medium text-brand">
                    {quantityTier(quantity)}
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  <label
                    htmlFor="notes"
                    className="text-sm font-medium leading-none text-brand"
                  >
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    placeholder="Any special requirements or instructions..."
                    className="w-full resize-none rounded-button border-2 border-input bg-surface px-3 py-2 text-sm text-brand placeholder:text-muted focus-visible:border-brand focus-visible:outline-none"
                  />
                </div>
              </div>
            </Section>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/products"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-button border border-line bg-background px-6 text-sm font-medium text-brand transition-colors hover:bg-line/30"
              >
                Keep Shopping
              </Link>
              <button
                type="button"
                onClick={() => router.push("/cart")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-brand px-6 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 text-base font-semibold leading-6 tracking-tight text-brand">
        {title}
      </legend>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

function OptionCard({
  selected,
  onSelect,
  title,
  description,
  meta,
  trailing,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  meta?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-4 rounded-option border p-4 text-left transition-colors",
        selected
          ? "border-line bg-[rgba(196,188,176,0.3)]"
          : "border-input hover:border-brand/40",
      )}
    >
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border-2",
          selected ? "border-brand" : "border-input",
        )}
      >
        {selected && <span className="size-2 rounded-full bg-brand" />}
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-brand">{title}</span>
        <span className="text-sm text-muted">{description}</span>
        {meta && <span className="text-sm text-muted">{meta}</span>}
      </span>
      {trailing}
      {selected && <Check className="size-5 shrink-0 text-brand" aria-hidden />}
    </button>
  );
}

/**
 * Simplified isometric box diagram with L/W/H labels (Figma shows a wireframe
 * box). Parses "300 × 200 × 150 mm" into the three edge labels.
 */
function BoxDiagram({ dimensions }: { dimensions: string }) {
  const [l, w, h] = dimensions
    .replace(/mm/i, "")
    .split("×")
    .map((s) => s.trim());
  return (
    <span className="relative hidden h-12 w-16 shrink-0 sm:block" aria-hidden>
      <svg viewBox="0 0 64 48" className="size-full" fill="none">
        <path d="M12 14 L32 6 L52 14 L32 22 Z" stroke="#964022" strokeWidth="1.2" />
        <path d="M12 14 L12 36 L32 44 L32 22 Z" stroke="#964022" strokeWidth="1.2" />
        <path d="M52 14 L52 36 L32 44 L32 22 Z" stroke="#964022" strokeWidth="1.2" />
      </svg>
      <span className="absolute -left-1 top-1 text-[8px] font-bold text-rust">{l}</span>
      <span className="absolute -bottom-1 right-3 text-[8px] font-bold text-rust">{w}</span>
      <span className="absolute -right-1 top-3 text-[8px] font-bold text-rust">{h}</span>
    </span>
  );
}
