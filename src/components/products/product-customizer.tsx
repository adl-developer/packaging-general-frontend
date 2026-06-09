"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Info, Loader2, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CARTON_MATERIALS,
  CARTON_PRINTING,
  quantityTier,
  type Product,
} from "@/lib/products";
import { addLineItem } from "@/lib/actions/cart";
import { motion } from "motion/react";
import { SPRING_TAP } from "@/lib/motion";
import { notifyCartAdd, notifyCartCount } from "@/lib/cart-events";

/**
 * Product customizer — Figma frame 404:1371. A single scrollable "Customize
 * Product" card with four sections (Select Size, Choose Material, Printing
 * Options, Order Quantity + notes) and Keep Shopping / Buy Now actions.
 * Selected option cards use a taupe tint (rgba(196,188,176,0.3)) + line border.
 * The sticky "Step N of 5" progress reflects scroll position through the form.
 *
 * TODO(medusa): persist the configured line item to the cart; pull options
 * from product variants; compute live pricing.
 */
const SECTION_COUNT = 5;

export function ProductCustomizer({ product }: { product: Product }) {
  const router = useRouter();
  const [size, setSize] = React.useState(product.sizes[0]?.id ?? "");
  const [material, setMaterial] = React.useState(CARTON_MATERIALS[0]?.id ?? "");
  const [printing, setPrinting] = React.useState(CARTON_PRINTING[0]?.id ?? "");
  const [quantity, setQuantity] = React.useState(product.moq);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const addToCart = (onSuccess?: () => void) => {
    if (!size) {
      setError("Please select a size before adding to cart.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const cart = await addLineItem(size, quantity);
        // Sync the header badge to the real line-item count from the server
        // (line items may merge when the same variant is added twice).
        notifyCartCount(cart?.items?.length ?? 0);
        // Trigger the global "Added to cart!" toast (CartToast listens for
        // cart:add; cart:set is set-by-the-page and fires on remove too, so
        // we explicitly fire :add here to keep toast/badge events separable).
        notifyCartAdd({ qty: quantity });
        onSuccess?.();
      } catch (err) {
        console.error("[customizer] add to cart failed:", err);
        setError("Couldn't add to cart. Please try again.");
      }
    });
  };

  // "Step N of 5" tracks the furthest section scrolled past the sticky header.
  const sectionsRef = React.useRef<Array<HTMLElement | null>>([]);
  const [step, setStep] = React.useState(1);

  React.useEffect(() => {
    const onScroll = () => {
      const offset = 200; // height of the two stacked sticky headers
      let current = 1;
      sectionsRef.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= offset) current = i + 1;
      });
      setStep(Math.min(current, SECTION_COUNT));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const setSectionRef = (i: number) => (el: HTMLElement | null) => {
    sectionsRef.current[i] = el;
  };

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
            <span className="text-sm text-muted">Step {step} of {SECTION_COUNT}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3f4f6]">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${(step / SECTION_COUNT) * 100}%` }}
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
            <Section title="1. Select Size" info sectionRef={setSectionRef(0)}>
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
            <Section title="2. Choose Material" sectionRef={setSectionRef(1)}>
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
            <Section title="3. Printing Options" sectionRef={setSectionRef(2)}>
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
            <Section title="4. Order Quantity" sectionRef={setSectionRef(3)}>
              <div className="flex flex-col gap-3">
                <input
                  type="number"
                  min={product.moq}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  className="h-9 w-full rounded-button border-2 border-input bg-surface px-3 text-sm text-brand focus-visible:border-accent focus-visible:outline-none"
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
                    className="w-full resize-none rounded-button border-2 border-input bg-surface px-3 py-2 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none"
                  />
                </div>
              </div>
            </Section>

            {/* 5. Review / actions */}
            <div
              ref={setSectionRef(4)}
              className="flex flex-col gap-3 sm:flex-row sm:justify-end"
            >
              {/* Button order differs by breakpoint (Figma 404:1371):
                  mobile = Add to Cart → Buy Now → Keep Shopping (primary first);
                  desktop = Keep Shopping → Add to Cart → Buy Now (left-to-right). */}
              <Link
                href="/products"
                className="order-3 inline-flex h-10 items-center justify-center gap-2 rounded-button border border-line bg-background px-6 text-sm font-medium text-brand transition-colors hover:bg-line/30 sm:order-1 sm:mr-auto"
              >
                Keep Shopping
              </Link>
              <button
                type="button"
                onClick={() => addToCart(() => router.push("/cart"))}
                disabled={isPending || !size}
                className="order-1 inline-flex h-10 items-center justify-center gap-2 rounded-button border border-line bg-background px-6 text-sm font-medium text-brand transition-colors hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60 sm:order-2"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ShoppingCart className="size-4" aria-hidden />
                )}
                Add to Cart
              </button>
              <button
                type="button"
                onClick={() => addToCart(() => router.push("/cart"))}
                disabled={isPending || !size}
                className="order-2 inline-flex h-10 items-center justify-center gap-2 rounded-button bg-brand px-6 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60 sm:order-3"
              >
                Buy Now
              </button>
            </div>
            {error && (
              <p
                role="alert"
                className="text-sm font-medium text-destructive"
              >
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  info,
  sectionRef,
  children,
}: {
  title: string;
  info?: boolean;
  sectionRef?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <fieldset ref={sectionRef} className="flex flex-col gap-4">
      <legend className="mb-4 flex items-center gap-2 text-base font-semibold leading-6 tracking-tight text-brand">
        {title}
        {info && <Info className="size-4 text-muted" aria-hidden />}
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
        "flex items-center gap-4 rounded-option border p-4 text-left transition-[color,background-color,border-color] duration-200",
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
        {selected && (
          <motion.span
            className="size-2 rounded-full bg-brand"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={SPRING_TAP}
          />
        )}
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-brand">{title}</span>
        <span className="text-sm text-muted">{description}</span>
        {meta && <span className="text-sm text-muted">{meta}</span>}
      </span>
      {trailing}
      {selected && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING_TAP}
        >
          <Check className="size-5 shrink-0 text-brand" aria-hidden />
        </motion.span>
      )}
    </button>
  );
}

/**
 * Filled isometric box illustration with L/W/H labels (Figma frame 404:1371).
 * Parses "300 × 200 × 150 mm" into the three edge labels.
 */
function BoxDiagram({ dimensions }: { dimensions: string }) {
  const [l, w, h] = dimensions
    .replace(/mm/i, "")
    .split("×")
    .map((s) => s.trim());
  return (
    <span className="relative hidden h-14 w-20 shrink-0 sm:block" aria-hidden>
      <svg viewBox="0 0 80 56" className="size-full" fill="none">
        {/* top, left, right faces (light → dark tan) */}
        <path d="M16 18 L40 8 L64 18 L40 28 Z" fill="#e8d5c4" stroke="#964022" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M16 18 L16 40 L40 50 L40 28 Z" fill="#d4b59a" stroke="#964022" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M64 18 L64 40 L40 50 L40 28 Z" fill="#c19f82" stroke="#964022" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span className="absolute left-0 top-3 text-[8px] font-bold leading-none text-rust">{h}</span>
      <span className="absolute bottom-1 left-6 text-[8px] font-bold leading-none text-rust">{w}</span>
      <span className="absolute bottom-3 right-0 text-[8px] font-bold leading-none text-rust">{l}</span>
    </span>
  );
}
