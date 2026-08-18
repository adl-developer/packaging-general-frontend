"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Info, Loader2, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveCombo,
  type MaterialOption,
  type Product,
} from "@/lib/products";
import {
  resolveOptionsMatch,
  SECTION_LABELS,
  type StorefrontSection,
} from "@/lib/attributes";
import type { StockState } from "@/lib/stock-rules";
import { tierFor, tieredUnitPrice } from "@/lib/moq-tiers";
import { supportWhatsappUrl, outOfStockEnquiry } from "@/lib/whatsapp";
import { formatGhs } from "@/lib/format";
import { warmCart } from "@/lib/actions/cart";
import { buyNow } from "@/lib/actions/checkout";
import { beginOptimisticAdd, requestAddCommit } from "@/lib/cart-handoff";
import { setReorderNotice } from "@/lib/reorder-notice";
import { TAX_RATE, type CartItem } from "@/app/(shop)/cart/map-cart";
import { motion } from "motion/react";
import { SPRING_TAP } from "@/lib/motion";
import { notifyCartAdd } from "@/lib/cart-events";
import { CartSkeleton } from "@/app/(shop)/cart/cart-skeleton";
import { ProductGallery } from "@/components/products/product-gallery";
import { toProductImages } from "@/lib/product-images";
import { BuyNowAuthDialog } from "./buy-now-auth-dialog";
import type { ContinueRoute } from "@/lib/buy-now-auth";

// Canonical section order for attribute-mode products — mirrors
// SECTION_LABELS' key order (size → material → printing_colour → type →
// custom). There is no separate SECTION_ORDER export in lib/attributes.ts.
const SECTION_ORDER = Object.keys(SECTION_LABELS) as StorefrontSection[];

/**
 * Product customizer — Figma frames 404:1371 → 3933:25640 (the "New Product
 * Page" redesign). Two columns on desktop: a PINNED product-image panel on the
 * left (535fr) and the scrolling customizer card on the right (657fr, 24px
 * gap). Product identity (category chip, title, description, starting price)
 * moved into the card's header; Keep Shopping / Add to Cart / Buy Now moved out
 * of the card into a bar pinned to the bottom of the viewport, so both the
 * product shot and the actions stay reachable the whole way down the form.
 * Below `lg` the panel stacks above the card and stops being sticky.
 *
 * Sections (Select Size, Choose Material, Printing Options, Order Quantity +
 * notes) are unchanged.
 * Selected option cards use a taupe tint (rgba(196,188,176,0.3)) + line border.
 * The sticky "Step N of M" progress reflects scroll position through the form.
 *
 * Since the enriched backend model, every section is live data: materials and
 * printing come from product metadata, the (size, material, printing) choice
 * resolves to a real Medusa variant, and printed options add a one-time
 * setup-fee line.
 * Products without material/printing choices (accessories) skip those
 * sections — the step count adapts.
 */
export function ProductCustomizer({
  product,
  stock,
  isSignedIn,
}: {
  product: Product;
  /** Live stock keyed by VARIANT id — a plain object because this crosses the
   *  server/client boundary from the page (Maps don't serialise that way).
   *  A missing key means unknown, which is treated as in stock (fail open). */
  stock: Record<string, StockState>;
  /** Selects Buy Now's BEHAVIOUR, not its visibility: the button always
   *  renders, but a signed-out click opens the auth modal instead of calling
   *  `buyNow` (spec 2026-08-06). Display-only either way — the `buyNow`
   *  server action re-checks getCustomer() itself, so a stale or tampered
   *  value can't grant access. */
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const [size, setSize] = React.useState(product.sizes[0]?.id ?? "");
  const [material, setMaterial] = React.useState(
    product.materials[0]?.id ?? "",
  );
  const [printing, setPrinting] = React.useState(product.printing[0]?.id ?? "");
  // N-axis attribute model (Task S2/S3): non-empty `product.attributes` means
  // this product was authored via the admin "Product Variants" UI and the
  // customizer renders one picker per attribute instead of the legacy
  // size/material/printing sections. Legacy products (attributes: []) render
  // exactly as before — every branch below gates on this flag.
  const attributeMode = product.attributes.length > 0;
  const [attrSelection, setAttrSelection] = React.useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      product.attributes
        .filter((a) => a.values.length > 0)
        .map((a) => [a.name, a.values[0].id]),
    ),
  );
  const [quantity, setQuantity] = React.useState(product.moq || 1);
  const [notes, setNotes] = React.useState("");
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
  // Signed-out Buy Now opens the auth modal instead of refusing
  // (docs/superpowers/specs/2026-08-06-buy-now-signed-out-design.md).
  const [authOpen, setAuthOpen] = React.useState(false);

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
  // printing choices; Wrap has a Type choice but no Size axis). Indices feed
  // the scroll-spy refs + heading numbers.
  const hasSizes = product.sizes.length > 0;
  const hasMaterials = product.materials.length > 0;
  const hasPrinting = product.printing.length > 0;
  const labels = product.optionLabels;
  // Faceted materials (RSC): the composite Material spec renders as one
  // section PER FACET (Board Grade / Colour / Flute Type) — see
  // Product.materialFacets. Selections still resolve to one real material.
  const facetList = product.materialFacets;
  const useFacets = hasMaterials && facetList.length > 0;

  // Combos can be SPARSE (e.g. White RSC exists only in 400×400×400) — a
  // material with no variant for the selected size is shown disabled, and
  // selecting a size auto-corrects an incompatible material selection.
  const availableMaterials = React.useMemo(
    () =>
      new Set(
        product.combos.filter((c) => c.sizeId === size).map((c) => c.materialId),
      ),
    [product.combos, size],
  );
  const pickSize = (sizeId: string) => {
    setSize(sizeId);
    if (!hasMaterials) return;
    const forSize = new Set(
      product.combos.filter((c) => c.sizeId === sizeId).map((c) => c.materialId),
    );
    if (!forSize.has(material)) {
      const first = product.materials.find((m) => forSize.has(m.id));
      if (first) setMaterial(first.id);
    }
  };

  // ── Faceted-material helpers ──
  const currentMaterial = product.materials.find((m) => m.id === material);
  /** A facet value is offered when SOME material carrying it exists for the
   *  selected size — cross-facet conflicts are auto-corrected on click, size
   *  gaps (White only in 400³) are disabled. */
  const facetAvailable = (key: string, value: string) =>
    product.materials.some(
      (m) => m.facets?.[key] === value && availableMaterials.has(m.id),
    );
  /** Select a facet value: switch to the available material that carries it
   *  and agrees with the most other currently-selected facets (so picking
   *  "Double Wall" keeps Brown, and picking "White" flips board back to
   *  Single Wall — the only spec White exists in). */
  const pickFacetValue = (key: string, value: string) => {
    const candidates = product.materials.filter(
      (m) => m.facets?.[key] === value && availableMaterials.has(m.id),
    );
    if (!candidates.length) return;
    const current = currentMaterial?.facets ?? {};
    const agreement = (m: MaterialOption) =>
      Object.entries(current).filter(
        ([k, v]) => k !== key && m.facets?.[k] === v,
      ).length;
    const best = candidates.reduce((a, b) =>
      agreement(b) > agreement(a) ? b : a,
    );
    setMaterial(best.id);
  };

  // ── Attribute-mode (N-axis) helper — sparse-combo availability, same
  //    spirit as availableMaterials/facetAvailable above, generalized to any
  //    number of named attributes. A value is offered when swapping it into
  //    the CURRENT selection still resolves to a real combo. ──
  const attrValueAvailable = (attrName: string, valueId: string) =>
    product.combosV2.some((c) => {
      const trial = { ...attrSelection, [attrName]: valueId };
      return Object.entries(trial).every(
        ([n, v]) => (c.options[n] ?? "") === (v ?? ""),
      );
    });

  // Attribute mode: one section per distinct StorefrontSection present among
  // product.attributes, in the canonical SECTION_ORDER (never per-attribute —
  // several attributes can share a section, e.g. two "type"-section axes).
  // attrSectionIdx maps each present section to its cursor slot so the JSX
  // and the scroll-spy (sectionsRef) agree on indices.
  const presentSections: StorefrontSection[] = attributeMode
    ? SECTION_ORDER.filter((s) => product.attributes.some((a) => a.section === s))
    : [];
  const attrSectionIdx: Partial<Record<StorefrontSection, number>> = {};

  let nextIndex = 0;
  let sizeIdx = -1;
  let materialStart = -1;
  let printingIdx = -1;
  if (attributeMode) {
    for (const s of presentSections) attrSectionIdx[s] = nextIndex++;
  } else {
    sizeIdx = hasSizes ? nextIndex++ : -1;
    materialStart = hasMaterials ? nextIndex : -1;
    if (hasMaterials) nextIndex += useFacets ? facetList.length : 1;
    printingIdx = hasPrinting ? nextIndex++ : -1;
  }
  const quantityIdx = nextIndex++;
  const reviewIdx = nextIndex++;
  const sectionCount = nextIndex;

  // Live selection → variant + pricing.
  const combo = attributeMode
    ? resolveOptionsMatch(product.combosV2, attrSelection)
    : resolveCombo(product, size, material, printing);
  const selectedPrinting = product.printing.find((p) => p.id === printing);
  // Attribute mode generalizes "the printed option carrying a setup fee" to
  // "the first selected attribute value carrying a setup fee" — the wire
  // contract still sends at most one setupPrintingValue per add, matching
  // today's single-printing-selection shape.
  const attrSetupValue = attributeMode
    ? product.attributes
        .map((a) => a.values.find((v) => v.id === attrSelection[a.name]))
        .find((v): v is NonNullable<typeof v> => !!v && v.setupFee > 0)
    : undefined;
  // What every add-to-cart / buy-now call sends as setupPrintingValue, and
  // what the optimistic "Printing Setup Fee" line's spec text names.
  const setupSelectionId = attributeMode
    ? attrSetupValue?.id
    : selectedPrinting && selectedPrinting.setupFee > 0
      ? selectedPrinting.id
      : undefined;
  // Attribute mode: incomplete when any attribute that HAS values is still
  // unselected (mirrors the legacy `hasSizes && !size` gate, generalized to
  // N axes instead of one).
  const selectionIncomplete = attributeMode
    ? product.attributes.some((a) => a.values.length > 0 && !attrSelection[a.name])
    : hasSizes && !size;
  const baseUnitPrice = combo?.unitPrice ?? 0;
  // MOQ tiers scale the variant's own price by quantity bracket. ⚠ This is a
  // PREVIEW — the backend's /store/carts/:id/moq-tiers sync (run on every
  // getCart) is what actually charges it, with the same rounding, so the two
  // agree line for line.
  const activeTier = tierFor(product.tiers, quantity);
  const unitPrice = tieredUnitPrice(baseUnitPrice, product.tiers, quantity);
  const setupFee = attributeMode
    ? (attrSetupValue?.setupFee ?? 0)
    : (selectedPrinting?.setupFee ?? 0);
  const estimatedTotal = unitPrice * quantity + setupFee;

  // Out-of-stock is a SEPARATE, parallel concept from the sparse-combo
  // availability system above (availableMaterials / facetAvailable /
  // pickSize's auto-correction) — that system hides combos that DO NOT
  // EXIST and silently steers the selection away from them. An out-of-stock
  // combo is a REAL combo that just has no stock right now: it must stay
  // selectable and must NEVER be auto-corrected away, or the customer is
  // silently moved to a different option and the enquiry/sales lead is lost.
  // Unknown variant (absent from `stock`) => treat as in stock (fail open).
  const comboStock = combo ? stock[combo.variantId] : undefined;
  const comboOutOfStock = comboStock ? !comboStock.purchasable : false;
  // The enquiry is read by a human on WhatsApp, so every spec must be the
  // DISPLAY LABEL, never the option id. For products with real size options
  // the id happens to be readable ("Small"), but for accessories the size id
  // IS THE VARIANT ID (see SizeOption.id in lib/products.ts — "legacy/accessory
  // fallback: the variant id"), which produced messages like
  // "Size: variant_01KYVJHRMBAHEF48PNX5KCY8YV" — gibberish to the customer and
  // to whoever answers. Resolve through the option lists; fall back to the raw
  // value only when no option matches, which is strictly better than nothing.
  const labelFor = <T extends { id: string; label: string }>(
    options: readonly T[],
    id: string,
  ) => options.find((o) => o.id === id)?.label ?? id;

  const enquiryUrl = comboOutOfStock
    ? supportWhatsappUrl(
        outOfStockEnquiry({
          product: product.name,
          specs: attributeMode
            ? product.attributes
                .map((a) => {
                  const v = a.values.find((vv) => vv.id === attrSelection[a.name]);
                  return v ? `${a.name}: ${v.label}` : null;
                })
                .filter((s): s is string => !!s)
            : [
                size ? `${labels.size}: ${labelFor(product.sizes, size)}` : null,
                material
                  ? `${labels.material}: ${labelFor(product.materials, material)}`
                  : null,
                printing
                  ? `Printing: ${labelFor(product.printing, printing)}`
                  : null,
              ].filter((s): s is string => !!s),
          quantity,
        }),
      )
    : null;

  const images = React.useMemo(
    () => toProductImages(product.images, product.name),
    [product.images, product.name],
  );

  // The action bar is `fixed`, so it covers the last ~70px of the page — which
  // would otherwise permanently hide the tail of the site footer. Reserve its
  // real measured height (it grows when the error line shows, and is shorter on
  // mobile) as body padding while this page is mounted.
  const actionBarRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const bar = actionBarRef.current;
    if (!bar) return;
    const apply = () => {
      document.body.style.paddingBottom = `${bar.offsetHeight}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, []);

  /** Shared pre-flight validation for both Add to Cart and Buy Now — same
   *  rules, same messages. Returns false (and sets `error`) when the current
   *  selection can't be added at all. */
  const validateSelection = (): boolean => {
    if (selectionIncomplete) {
      setError(
        attributeMode
          ? "Please complete your selection before adding to cart."
          : `Please select a ${labels.size.toLowerCase()} before adding to cart.`,
      );
      return false;
    }
    if (product.moq && quantity < product.moq) {
      setError(`Minimum order quantity is ${product.moq} units.`);
      return false;
    }
    if (!combo) {
      setError("This combination is currently unavailable.");
      return false;
    }
    if (comboOutOfStock) {
      setError("This option is currently out of stock.");
      return false;
    }
    setError(null);
    return true;
  };

  const addToCart = () => {
    // One mutation at a time — Medusa locks the cart per mutation, so a second
    // concurrent add would 409. Ignore extra clicks while one is in flight.
    if (pendingKind) return;
    if (!validateSelection() || !combo) return; // combo re-checked for TS narrowing

    // ── Fully optimistic: render first, commit in the background. ──
    // We already know everything the cart page will show — the option ids ARE
    // the backend option values —
    // so we stage the new line(s) client-side, navigate to /cart immediately,
    // and let the mutation settle behind it (the cart page reconciles to the
    // server truth, or rolls the lines back with an error, via cart-handoff).
    const optimisticLines: Omit<CartItem, "id">[] = [
      {
        variantId: combo.variantId,
        name: product.name,
        specs: attributeMode
          ? product.attributes
              .map((a) => `${a.name}: ${attrSelection[a.name]}`)
              .filter((s) => !s.endsWith(": "))
          : [
              size ? `${labels.size}: ${size}` : null,
              material ? `${labels.material}: ${material}` : null,
              printing ? `Printing: ${printing}` : null,
            ].filter((s): s is string => !!s),
        unitPrice,
        taxRate: TAX_RATE,
        quantity,
        productSlug: product.slug,
        isService: false,
      },
      ...(setupFee > 0 && setupSelectionId
        ? [
            {
              name: "Printing Setup Fee",
              specs: [`${setupSelectionId} · one-time charge`],
              unitPrice: setupFee,
              taxRate: TAX_RATE,
              quantity: 1,
              isService: true,
            } satisfies Omit<CartItem, "id">,
          ]
        : []),
    ];

    notifyCartAdd({ lines: 1 });
    setJustAdded(true);
    if (addedResetRef.current) window.clearTimeout(addedResetRef.current);
    addedResetRef.current = window.setTimeout(() => setJustAdded(false), 1800);
    setPendingKind("add");
    setGoingToCart(true);
    beginOptimisticAdd(optimisticLines);
    // The commit runs in CartAddAgent (mounted in the shop layout, survives
    // this navigation) — NOT here: this component unmounts when the push
    // lands, and Next drops a server-action dispatch whose component dies.
    // Also NOT in startTransition — that would entangle with the navigation
    // transition and hold the push until the action settled.
    requestAddCommit({
      variantId: combo.variantId,
      quantity,
      setupPrintingValue: setupSelectionId,
      notes,
    });
    router.push("/cart");
  };

  /** Where a successful Buy Now goes. Shared by the signed-in path and the
   *  modal's sign-in path so Buy Now's navigation lives in exactly one place. */
  const continueToRoute = React.useCallback(
    (route: ContinueRoute, notice?: string) => {
      // Close the re-click window for the whole client-side navigation: the
      // modal's sign-in path lands here directly (never through
      // handleBuyNow), so without this the Buy Now button stays live and a
      // second click would add the same line again. Idempotent when
      // handleBuyNow already set it on the signed-in path.
      setPendingKind("buy");
      // The item is in the cart on every ok branch — bump the header badge the
      // same way the cart-based Add to Cart flow does.
      notifyCartAdd({ lines: 1 });

      if (route === "cart-with-notice") {
        // Reuses the take-once notice channel the Reorder flow uses to hand a
        // message to /cart across a client-side navigation (see
        // lib/reorder-notice.ts + cart-client.tsx's banner) — the mechanism is
        // generic, not reorder-specific.
        if (notice) setReorderNotice(notice);
        router.push("/cart");
        return;
      }
      if (route === "delivery") {
        router.push("/checkout/delivery");
        return;
      }
      router.push("/checkout/payment");
    },
    [router],
  );

  /**
   * Buy Now — deliberately NOT the optimistic "navigate first, commit behind
   * it" pattern above. This is the money path (docs/superpowers/specs/
   * 2026-07-31-buy-now-design.md): where we navigate to depends on the
   * SERVER's view of the cart and the account's saved details, so we must
   * await the real result before deciding. This function only ever RUNS for
   * a signed-in customer — `onBuyNowClick` gates on `isSignedIn` before
   * calling it, regardless of whether the button itself is visible — but
   * that gating is display-only. The `buyNow` server action re-checks
   * getCustomer() itself, so that's the actual access control.
   */
  const handleBuyNow = async () => {
    if (pendingKind) return;
    if (!validateSelection() || !combo) return; // combo re-checked for TS narrowing

    setPendingKind("buy");
    try {
      const result = await buyNow({
        variantId: combo.variantId,
        quantity,
        setupPrintingValue: setupSelectionId,
        notes,
      });

      if (!result.ok) {
        setError(result.error);
        setPendingKind(null);
        return;
      }

      continueToRoute(
        result.route,
        result.route === "cart-with-notice" ? result.notice : undefined,
      );
    } catch (err) {
      console.error("[product-customizer] buyNow failed:", err);
      setError("Something went wrong. Please try again.");
      setPendingKind(null);
    }
  };

  /** Buy Now's click target. Signed in → straight to the money path. Signed
   *  out → validate first (no point authenticating for a configuration that
   *  can't be bought), then open the modal. */
  const onBuyNowClick = () => {
    if (isSignedIn) {
      void handleBuyNow();
      return;
    }
    if (pendingKind) return;
    if (!validateSelection() || !combo) return;
    setAuthOpen(true);
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
    // Full-width root so the pinned action bar can run edge-to-edge; the
    // progress header + body keep their own max-w-7xl wrapper.
    <div className="w-full">
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
      <div className="mx-auto w-full max-w-7xl">
        {/* Sticky progress header */}
        <div className="sticky top-[121px] z-40 border-b border-line bg-surface">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  // Return to wherever the shopper came from; fall back to the
                  // catalog when there's no in-app history (direct load / new tab).
                  if (window.history.length > 1) router.back();
                  else router.push("/products");
                }}
                className="inline-flex items-center gap-1.5 rounded-button px-3 text-sm font-medium text-brand transition-colors hover:text-brand/70"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Back
              </button>
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

        {/* Figma body container: 32px top / 96px bottom padding — the bottom
            padding is the clearance for the pinned action bar. */}
        <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[535fr_657fr] lg:items-start lg:px-8">
          {/* Left column — pinned product images. Sticky offset clears the site
              header (121px) + the sticky progress header (99px) + 16px. */}
          <div className="lg:sticky lg:top-[236px]">
            <ProductGallery images={images} productName={product.name} />
          </div>

          {/* Right column — the scrolling customizer card. */}
          <div className="overflow-hidden rounded-option border border-line bg-surface">
            <div className="flex flex-col border-b border-line p-6">
              {/* Several families are the only product in their category (RSC
                  Cartons, Pizza Box …) — skip the chip rather than print the
                  title twice. */}
              {product.category &&
                product.category.toLowerCase() !== product.name.toLowerCase() && (
                  <span className="mb-4 w-fit rounded-full bg-[#ede9f7] px-3 py-1 text-xs font-semibold tracking-[1.2px] text-[#6c4db5]">
                    {product.category}
                  </span>
                )}
              <h1 className="text-2xl font-bold leading-[33px] text-brand">
                {product.name}
              </h1>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-[1.2px] text-muted">
                Description
              </p>
              <p className="mt-1 text-sm leading-[22.8px] text-muted">
                {product.description}
              </p>
              {product.startingPrice > 0 && (
                <>
                  <p className="mt-2.5 text-xs font-semibold uppercase tracking-[1.2px] text-muted">
                    Price
                  </p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted">
                    Starting from
                    <span className="text-lg font-bold text-brand">
                      {formatGhs(product.startingPrice)}
                    </span>
                    / unit
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col gap-10 p-6">
              {/* Attribute mode (N-axis "Product Variants" model): one Section
                  per distinct StorefrontSection present, in canonical order;
                  inside, one sub-heading per attribute sharing that section,
                  values rendered as the same OptionCard radio cards. */}
              {attributeMode &&
                presentSections.map((section) => {
                  const idx = attrSectionIdx[section]!;
                  const sectionAttrs = product.attributes.filter(
                    (a) => a.section === section,
                  );
                  return (
                    <Section
                      key={section}
                      title={`${idx + 1}. ${SECTION_LABELS[section]}`}
                      ref={(el) => {
                        sectionsRef.current[idx] = el;
                      }}
                    >
                      <div className="flex flex-col gap-6">
                        {sectionAttrs.map((attr) => (
                          <div key={attr.name} className="flex flex-col gap-3">
                            <h3 className="text-sm font-semibold text-brand">
                              {attr.label ?? attr.name}
                            </h3>
                            <div className="flex flex-col gap-4">
                              {attr.values.map((v) => {
                                const isAvailable = attrValueAvailable(
                                  attr.name,
                                  v.id,
                                );
                                return (
                                  <OptionCard
                                    key={v.id}
                                    selected={attrSelection[attr.name] === v.id}
                                    disabled={!isAvailable}
                                    onSelect={() => {
                                      if (!isAvailable) return;
                                      warm();
                                      setAttrSelection((s) => ({
                                        ...s,
                                        [attr.name]: v.id,
                                      }));
                                    }}
                                    title={v.label}
                                    description={v.description ?? ""}
                                    meta={
                                      v.setupFee > 0 || v.perUnit > 0
                                        ? `Setup fee: ${formatGhs(v.setupFee)} + ${formatGhs(v.perUnit)}/unit`
                                        : undefined
                                    }
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  );
                })}

              {/* Select Size (label metadata-driven: Size / Width / Capacity …).
                  Skipped entirely for products without a Size axis (Wrap). */}
              {!attributeMode && hasSizes && (
                <Section
                  title={`${sizeIdx + 1}. Select ${labels.size}`}
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
                        pickSize(s.id);
                      }}
                      title={s.label}
                      description={s.dimensions}
                    />
                  ))}
                </Section>
              )}

              {/* Choose Material — either one section per FACET (RSC: Board
                  Grade / Colour / Flute Type) or a single metadata-labelled
                  section (Colour / Window / Type / …). */}
              {!attributeMode &&
                useFacets &&
                facetList.map((facet, fi) => (
                  <Section
                    key={facet.key}
                    title={`${materialStart + fi + 1}. Choose ${facet.label}`}
                    ref={(el) => {
                      sectionsRef.current[materialStart + fi] = el;
                    }}
                  >
                    {facet.values.map((v) => {
                      const available = facetAvailable(facet.key, v.id);
                      return (
                        <OptionCard
                          key={v.id}
                          selected={currentMaterial?.facets?.[facet.key] === v.id}
                          disabled={!available}
                          onSelect={() => {
                            if (!available) return;
                            warm();
                            pickFacetValue(facet.key, v.id);
                          }}
                          title={v.id}
                          description={
                            available
                              ? v.description
                              : `Not available in ${size || "this " + labels.size.toLowerCase()}`
                          }
                        />
                      );
                    })}
                  </Section>
                ))}
              {!attributeMode && hasMaterials && !useFacets && (
                <Section
                  title={`${materialStart + 1}. Choose ${labels.material}`}
                  ref={(el) => {
                    sectionsRef.current[materialStart] = el;
                  }}
                >
                  {product.materials.map((m) => {
                    const available = availableMaterials.has(m.id);
                    return (
                      <OptionCard
                        key={m.id}
                        selected={material === m.id}
                        disabled={!available}
                        onSelect={() => {
                          if (!available) return;
                          warm();
                          setMaterial(m.id);
                        }}
                        title={m.label}
                        description={
                          available
                            ? m.description
                            : `Not available in ${size || "this " + labels.size.toLowerCase()}`
                        }
                      />
                    );
                  })}
                </Section>
              )}

              {/* Printing Options */}
              {!attributeMode && hasPrinting && (
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
                  {/* Volume-pricing ladder — only for tiered products. Prices
                      are the CURRENT combo's, so switching size/material
                      re-prices the whole ladder. The active bracket is
                      highlighted so the price jump on a quantity change is
                      explained rather than surprising. */}
                  {product.tiers.length > 0 && combo && combo.unitPrice > 0 && (
                    <div className="flex flex-col gap-1 rounded-option border border-line px-3.5 py-3 text-sm">
                      <span className="pb-1 font-semibold text-brand">
                        Volume pricing
                      </span>
                      {product.tiers.map((t) => {
                        const isActive = t === activeTier;
                        return (
                          <span
                            key={`${t.minQuantity}`}
                            className={cn(
                              "flex justify-between",
                              isActive ? "font-semibold text-brand" : "text-muted",
                            )}
                          >
                            <span>{t.label}</span>
                            <span>
                              {formatGhs(
                                tieredUnitPrice(
                                  combo.unitPrice,
                                  product.tiers,
                                  t.minQuantity,
                                ),
                              )}
                              /unit
                            </span>
                          </span>
                        );
                      })}
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
                      {activeTier && activeTier.priceMultiplier !== 1 && (
                        <span className="flex justify-between text-muted">
                          <span>Volume price · {activeTier.label}</span>
                          <span>{formatGhs(unitPrice)}/unit</span>
                        </span>
                      )}
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
                  {comboOutOfStock && (
                    <div className="flex flex-col gap-2 rounded-option border border-[rgba(231,0,11,0.3)] bg-[rgba(231,0,11,0.06)] px-3.5 py-3 text-sm">
                      <span className="font-semibold text-destructive">
                        Out of stock
                      </span>
                      <span className="text-muted">
                        This exact option isn&apos;t available right now.
                        Reach out and we&apos;ll let you know when it&apos;s
                        back or help with lead time.
                      </span>
                      {enquiryUrl && (
                        <a
                          href={enquiryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex w-fit items-center gap-2 rounded-button border border-line bg-background px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-line/30"
                        >
                          Ask about this on WhatsApp
                        </a>
                      )}
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

              {/* End-of-form anchor — the actions themselves now live in the
                  pinned bar below, but the scroll-spy still needs a marker for
                  the final step. */}
              <div
                ref={(el) => {
                  sectionsRef.current[reviewIdx] = el;
                }}
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pinned action bar, full-bleed. `fixed` (not `sticky`) so it stays at
          the very bottom of the viewport the whole way down, sitting in front
          of the site footer rather than stopping above it. `useBodyPadding`
          reserves its height at the end of the document so the footer can
          still be scrolled fully clear of it. */}
      <div
        ref={actionBarRef}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface"
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          {error && (
            <p
              role="alert"
              className="mb-2 text-sm font-medium text-destructive"
            >
              {error}
            </p>
          )}
          {/* Mobile stacks the three CTAs full-width — Add to Cart → Buy Now →
              Keep Shopping, top to bottom. From `sm` they share one row with
              Keep Shopping pushed left and Buy Now last. The `order-*` classes
              drive both arrangements. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Link
              href="/products"
              className="order-3 inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-button border border-line bg-background px-6 text-sm font-medium text-brand transition-colors hover:bg-line/30 sm:order-1 sm:mr-auto sm:w-auto"
            >
              Keep Shopping
            </Link>
            <button
              type="button"
              onClick={() => addToCart()}
              disabled={selectionIncomplete || comboOutOfStock}
              className={cn(
                "order-1 inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-button border px-6 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60 sm:order-2 sm:w-auto",
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
            {/* Always rendered, signed in or not — a signed-out click opens the
                auth modal (spec 2026-08-06) rather than hiding the fast path. */}
            <button
              type="button"
              onClick={onBuyNowClick}
              disabled={selectionIncomplete || comboOutOfStock}
              className="order-2 inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-button bg-brand px-6 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60 sm:order-3 sm:w-auto"
            >
              {pendingKind === "buy" && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {authOpen && combo && (
        <BuyNowAuthDialog
          item={{
            variantId: combo.variantId,
            quantity,
            setupPrintingValue: setupSelectionId,
            notes: notes || undefined,
          }}
          onClose={() => setAuthOpen(false)}
          onContinue={(route, notice) => {
            setAuthOpen(false);
            continueToRoute(route, notice);
          }}
        />
      )}
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
  disabled,
  onSelect,
  title,
  description,
  meta,
}: {
  selected: boolean;
  /** Combination not available for the current selection (sparse combos). */
  disabled?: boolean;
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
      aria-disabled={disabled || undefined}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-4 rounded-option border p-4 text-left transition-[color,background-color,border-color] duration-200",
        selected
          ? "border-line bg-[rgba(196,188,176,0.3)]"
          : "border-input hover:border-brand/40",
        disabled && "cursor-not-allowed opacity-45 hover:border-input",
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

