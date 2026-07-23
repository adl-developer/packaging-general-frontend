"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Info, Loader2, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveCombo,
  tierFor,
  tierRangeLabel,
  type Product,
} from "@/lib/products";
import { formatGhs } from "@/lib/format";
import {
  addConfiguredLineItem,
  getCartLineCount,
  warmCart,
} from "@/lib/actions/cart";
import { setCartHandoff } from "@/lib/cart-handoff";
import { mapLineItem } from "@/app/(shop)/cart/map-cart";
import { motion } from "motion/react";
import { SPRING_TAP } from "@/lib/motion";
import { notifyCartAdd, notifyCartCount } from "@/lib/cart-events";
import { CartSkeleton } from "@/app/(shop)/cart/cart-skeleton";

/**
 * Product customizer — Figma frame 404:1371. A single scrollable "Customize
 * Product" card with sections (Select Size, Choose Material, Printing Options,
 * Order Quantity + notes) and Keep Shopping / Add to Cart / Buy Now actions.
 * Selected option cards use a taupe tint (rgba(196,188,176,0.3)) + line border.
 * The sticky "Step N of M" progress reflects scroll position through the form.
 *
 * Since the enriched backend model, every section is live data: materials and
 * printing come from product metadata, the (size, material, printing) choice
 * resolves to a real Medusa variant, quantity tiers mirror the native
 * min_quantity prices, and printed options add a one-time setup-fee line.
 * Products without material/printing choices (accessories) skip those
 * sections — the step count adapts.
 */
export function ProductCustomizer({ product }: { product: Product }) {
  const router = useRouter();
  const [size, setSize] = React.useState(product.sizes[0]?.id ?? "");
  const [material, setMaterial] = React.useState(
    product.materials[0]?.id ?? "",
  );
  const [printing, setPrinting] = React.useState(product.printing[0]?.id ?? "");
  const [quantity, setQuantity] = React.useState(product.moq || 1);
  const [notes, setNotes] = React.useState("");
  const [, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  // Which action is mid-flight (drives the Buy Now spinner + blocks a second
  // concurrent mutation — Medusa locks the cart per mutation).
  const [pendingKind, setPendingKind] = React.useState<null | "add" | "buy">(
    null,
  );
  // Optimistic "✓ Added" confirmation on the Add to Cart button.
  const [justAdded, setJustAdded] = React.useState(false);
  const addedResetRef = React.useRef<number | null>(null);
  // While the add commits + we navigate, a full-screen cart skeleton overlay
  // makes the user "arrive" at the loading cart instantly — the wait no longer
  // happens visibly on the product page. Cleared only on failure; on success
  // the navigation unmounts this component (and /cart's loading.tsx shows the
  // identical skeleton, so the handoff is seamless).
  const [goingToCart, setGoingToCart] = React.useState(false);

  // Warm the cart route (Buy Now lands there) so the navigation is instant.
  React.useEffect(() => {
    router.prefetch("/cart");
  }, [router]);

  // Eager cart creation: on the shopper's first interaction, ensure a cart
  // exists in the background so their first Add to Cart is a single write, not
  // create-cart + create-line. Runs at most once; no-op if a cart already
  // exists. This is the "eager loading" that shaves the fresh-guest first add.
  const warmedRef = React.useRef(false);
  const warm = React.useCallback(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    void warmCart();
  }, []);

  React.useEffect(() => {
    return () => {
      if (addedResetRef.current) window.clearTimeout(addedResetRef.current);
    };
  }, []);

  // Section layout adapts to the product (accessories have no material or
  // printing choices). Indices feed the scroll-spy refs + heading numbers.
  const hasMaterials = product.materials.length > 0;
  const hasPrinting = product.printing.length > 0;
  let nextIndex = 0;
  const sizeIdx = nextIndex++;
  const materialIdx = hasMaterials ? nextIndex++ : -1;
  const printingIdx = hasPrinting ? nextIndex++ : -1;
  const quantityIdx = nextIndex++;
  const reviewIdx = nextIndex++;
  const sectionCount = nextIndex;

  // Live selection → variant + pricing.
  const combo = resolveCombo(product, size, material, printing);
  const selectedPrinting = product.printing.find((p) => p.id === printing);
  const tier = tierFor(product.tiers, quantity);
  const discountPct = tier?.discountPct ?? 0;
  const unitPrice = combo
    ? Math.round(combo.unitPrice * (1 - discountPct / 100) * 100) / 100
    : 0;
  const setupFee = selectedPrinting?.setupFee ?? 0;
  const estimatedTotal = unitPrice * quantity + setupFee;

  const addToCart = (kind: "add" | "buy") => {
    // One mutation at a time — Medusa locks the cart per mutation, so a second
    // concurrent add would 409. Ignore extra clicks while one is in flight.
    if (pendingKind) return;
    if (!size) {
      setError("Please select a size before adding to cart.");
      return;
    }
    if (product.moq && quantity < product.moq) {
      setError(`Minimum order quantity is ${product.moq} units.`);
      return;
    }
    if (!combo) {
      setError("This combination is currently unavailable.");
      return;
    }
    setError(null);

    // ── Optimistic: confirm instantly, before the backend round-trip. ──
    // Fire the "Added to cart!" toast + bump the header badge (+1 line) now,
    // and flip the button to its "✓ Added" state — so the click feels
    // immediate instead of waiting ~1s on the network. Reconciled/rolled back
    // once the server responds below.
    notifyCartAdd({ lines: 1 });
    setJustAdded(true);
    if (addedResetRef.current) window.clearTimeout(addedResetRef.current);
    addedResetRef.current = window.setTimeout(() => setJustAdded(false), 1800);
    setPendingKind(kind);
    setGoingToCart(true);

    startTransition(async () => {
      try {
        const cart = await addConfiguredLineItem({
          variantId: combo.variantId,
          quantity,
          setupPrintingValue:
            selectedPrinting && selectedPrinting.setupFee > 0
              ? selectedPrinting.id
              : undefined,
          notes,
        });
        // Reconcile the badge to the server truth (lines may merge when the
        // same variant is added twice). cart:set — no second toast.
        notifyCartCount(cart?.items?.length ?? 0);
        // Hand the mutation's cart payload to the /cart page so it paints the
        // items instantly instead of re-fetching the same cart on arrival.
        setCartHandoff((cart?.items ?? []).map(mapLineItem));
        // Both actions land on the cart page — navigate once the line is
        // committed (so /cart renders it). The optimistic "✓ Added" + toast
        // already fired on click, so the ~1s pre-nav wait doesn't read as a
        // dead click; the /cart route is prefetched + has a loading skeleton.
        router.push("/cart");
      } catch (err) {
        console.error("[customizer] add to cart failed:", err);
        // Roll back the optimistic UI.
        setGoingToCart(false);
        setJustAdded(false);
        try {
          notifyCartCount(await getCartLineCount());
        } catch {
          // Best-effort badge reconcile; the next navigation re-syncs it.
        }
        setError("Couldn't add to cart. Please try again.");
      } finally {
        setPendingKind(null);
      }
    });
  };

  // "Step N of M" tracks the furthest section scrolled past the sticky header.
  const sectionsRef = React.useRef<Array<HTMLElement | null>>([]);
  const [step, setStep] = React.useState(1);

  React.useEffect(() => {
    const onScroll = () => {
      const offset = 200; // height of the two stacked sticky headers
      let current = 1;
      sectionsRef.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= offset) current = i + 1;
      });
      setStep(Math.min(current, sectionCount));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sectionCount]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Instant "arriving at the cart" overlay: covers the page (below the
          site header, z-50) with the same skeleton /cart's loading.tsx shows,
          so Add to Cart / Buy Now feels like an immediate navigation while the
          line item commits in the background. */}
      {goingToCart && (
        <div
          aria-hidden
          className="fixed inset-0 z-[45] overflow-hidden bg-background pt-[121px]"
        >
          <CartSkeleton />
        </div>
      )}
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
            <span className="text-sm text-muted">Step {step} of {sectionCount}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3f4f6]">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${(step / sectionCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold leading-9 text-brand">
            {product.name}
          </h1>
          <p className="text-lg leading-7 text-muted">
            {product.description}
          </p>
        </div>

        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="border-b border-line p-6">
            <h2 className="text-2xl font-semibold text-brand">
              Customize Product
            </h2>
            <p className="text-base text-muted">
              Configure your packaging requirements
            </p>
          </div>

          <div className="flex flex-col gap-10 p-6">
            {/* Select Size */}
            <Section
              title={`${sizeIdx + 1}. Select Size`}
              info
              ref={(el) => {
                sectionsRef.current[sizeIdx] = el;
              }}
            >
              {product.sizes.map((s) => (
                <OptionCard
                  key={s.id}
                  selected={size === s.id}
                  onSelect={() => {
                    warm();
                    setSize(s.id);
                  }}
                  title={s.label}
                  description={s.dimensions}
                />
              ))}
            </Section>

            {/* Choose Material */}
            {hasMaterials && (
              <Section
                title={`${materialIdx + 1}. Choose Material`}
                ref={(el) => {
                  sectionsRef.current[materialIdx] = el;
                }}
              >
                {product.materials.map((m) => (
                  <OptionCard
                    key={m.id}
                    selected={material === m.id}
                    onSelect={() => {
                      warm();
                      setMaterial(m.id);
                    }}
                    title={m.label}
                    description={m.description}
                  />
                ))}
              </Section>
            )}

            {/* Printing Options */}
            {hasPrinting && (
              <Section
                title={`${printingIdx + 1}. Printing Options`}
                ref={(el) => {
                  sectionsRef.current[printingIdx] = el;
                }}
              >
                {product.printing.map((p) => (
                  <OptionCard
                    key={p.id}
                    selected={printing === p.id}
                    onSelect={() => {
                      warm();
                      setPrinting(p.id);
                    }}
                    title={p.label}
                    description={p.description}
                    meta={
                      p.setupFee > 0
                        ? `Setup fee: ${formatGhs(p.setupFee)} + ${formatGhs(p.perUnit)}/unit`
                        : undefined
                    }
                  />
                ))}
              </Section>
            )}

            {/* Order Quantity */}
            <Section
              title={`${quantityIdx + 1}. Order Quantity`}
              ref={(el) => {
                sectionsRef.current[quantityIdx] = el;
              }}
            >
              <div className="flex flex-col gap-3">
                <input
                  type="number"
                  min={product.moq || 1}
                  value={quantity}
                  onChange={(e) => {
                    warm();
                    // Drop leading zeros so "088" reads "88" — React skips the
                    // DOM rewrite on number inputs when values match numerically.
                    const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                    if (cleaned !== e.target.value) e.target.value = cleaned;
                    setQuantity(Number(cleaned) || 0);
                  }}
                  className="h-9 w-full rounded-button border-2 border-input bg-surface px-3 text-sm text-brand focus-visible:border-accent focus-visible:outline-none"
                />
                {tier && product.tiers.length > 0 && (
                  <div className="rounded-option border border-line bg-[rgba(196,188,176,0.3)] px-3.5 py-3">
                    <p className="text-sm font-medium text-brand">
                      {tierRangeLabel(product.tiers, tier)} — {tier.label}
                      {discountPct > 0 && ` (−${discountPct}%)`}
                    </p>
                    {combo && (
                      <p className="text-sm text-muted">
                        {formatGhs(unitPrice)}/unit
                      </p>
                    )}
                  </div>
                )}
                {combo && combo.unitPrice > 0 && (
                  <div className="flex flex-col gap-1 rounded-option border border-line px-3.5 py-3 text-sm">
                    <span className="flex justify-between text-muted">
                      <span>
                        Unit price × {quantity.toLocaleString("en-GH")}
                      </span>
                      <span>{formatGhs(unitPrice * quantity)}</span>
                    </span>
                    {setupFee > 0 && (
                      <span className="flex justify-between text-muted">
                        <span>One-time printing setup</span>
                        <span>{formatGhs(setupFee)}</span>
                      </span>
                    )}
                    <span className="flex justify-between font-semibold text-brand">
                      <span>Estimated total</span>
                      <span>{formatGhs(estimatedTotal)}</span>
                    </span>
                    <span className="text-xs text-muted">
                      Excludes tax and delivery — final totals at checkout.
                    </span>
                  </div>
                )}
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requirements or instructions..."
                    className="w-full resize-none rounded-button border-2 border-input bg-surface px-3 py-2 text-sm text-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-none"
                  />
                </div>
              </div>
            </Section>

            {/* Review / actions */}
            <div
              ref={(el) => {
                sectionsRef.current[reviewIdx] = el;
              }}
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
                onClick={() => addToCart("add")}
                disabled={!size}
                className={cn(
                  "order-1 inline-flex h-10 items-center justify-center gap-2 rounded-button border px-6 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60 sm:order-2",
                  justAdded
                    ? "border-[rgba(22,163,74,0.35)] bg-[rgba(22,163,74,0.12)] text-[#15803d]"
                    : "border-line bg-background text-brand hover:bg-line/30",
                )}
              >
                {justAdded ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <ShoppingCart className="size-4" aria-hidden />
                )}
                {justAdded ? "Added" : "Add to Cart"}
              </button>
              <button
                type="button"
                onClick={() => addToCart("buy")}
                disabled={!size}
                className="order-2 inline-flex h-10 items-center justify-center gap-2 rounded-button bg-brand px-6 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60 sm:order-3"
              >
                {pendingKind === "buy" && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
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
  ref,
  children,
}: {
  title: string;
  info?: boolean;
  // React 19: ref is a regular prop — forwarded straight to the fieldset so
  // the parent's scroll-spy can track section positions.
  ref?: React.Ref<HTMLFieldSetElement>;
  children: React.ReactNode;
}) {
  return (
    <fieldset ref={ref} className="flex flex-col gap-4">
      <legend className="mb-4 flex items-center gap-2 text-base font-semibold leading-6 text-brand">
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
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  meta?: string;
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

