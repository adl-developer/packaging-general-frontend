"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Box, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/products";

const STEPS = [
  "Select Size",
  "Select Material",
  "Printing & Branding",
  "Quantity",
  "Review",
] as const;

/**
 * 5-step product customizer (Figma frame 404:1371, Step 1 = Select Size).
 * Step 1 built to exact spec; steps 2-5 are functional placeholders pending
 * their Figma frames. TODO(medusa): persist selections to the cart line item.
 */
export function ProductCustomizer({ product }: { product: Product }) {
  const [step, setStep] = React.useState(0);
  const [size, setSize] = React.useState(product.sizes[0]?.id ?? "");

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Sticky progress header */}
      <div className="sticky top-[121px] z-40 border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-1.5 rounded-button px-3 text-sm font-medium text-brand transition-colors hover:text-brand/70"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </button>
            <span className="text-sm text-muted">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3f4f6]">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
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
            {step === 0 ? (
              <fieldset className="flex flex-col gap-4">
                <legend className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight text-brand">
                  1. Select Size
                  <Info className="size-4 text-muted" aria-hidden />
                </legend>
                <div className="flex flex-col gap-4">
                  {product.sizes.map((s) => {
                    const selected = size === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSize(s.id)}
                        className={cn(
                          "flex items-center gap-4 rounded-option border p-4 text-left transition-colors",
                          selected
                            ? "border-brand bg-brand/5"
                            : "border-line hover:border-brand/50",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-4 shrink-0 place-items-center rounded-full border",
                            selected ? "border-brand" : "border-line",
                          )}
                        >
                          {selected && (
                            <span className="size-2 rounded-full bg-brand" />
                          )}
                        </span>
                        <span className="flex flex-1 flex-col">
                          <span className="text-base font-medium text-brand">
                            {s.label}
                          </span>
                          <span className="text-sm text-muted">
                            {s.dimensions}
                          </span>
                        </span>
                        <Box className="size-10 text-muted/40" aria-hidden />
                        {selected && (
                          <Check className="size-5 text-brand" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              // TODO(figma+medusa): build steps 2-5 from their frames.
              <div className="rounded-option border border-dashed border-line p-8 text-center">
                <p className="text-base font-medium text-brand">
                  {step + 1}. {STEPS[step]}
                </p>
                <p className="mt-1 text-sm text-muted">
                  This step is coming next — material, printing, quantity and
                  review options.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-line pt-6">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
              ) : (
                <Link href="/cart" className="contents">
                  <Button>Add to Cart</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
