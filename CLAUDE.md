@AGENTS.md

# Storefront — Packaging General

Next.js **16** (App Router) · React 19 · **Tailwind v4** · `motion` · Medusa JS SDK · TypeScript. Deploys to Vercel.
See the root `../CLAUDE.md` for project-wide rules (stack, git, Ghana VAT, env gotchas).

> ⚠ Per `AGENTS.md` above: this is a newer Next.js than your training data. Check `node_modules/next/dist/docs/` before relying on framework APIs.

## Source layout

- `src/app/(auth)`, `src/app/(shop)` — route groups (App Router).
- `src/components/{home,products,checkout,track-order,layout,ui,motion,auth}` — feature components + design-system primitives in `ui/`.
- `src/lib/actions/` — server actions: `checkout.ts`, `cart.ts`, `auth.ts`, `orders.ts`.
- `src/lib/medusa.ts` — SDK client (`createAuthClient`, `authHeaders`).
- `scripts/` — Figma/visual tooling (committed): `figma-api.py`, `shoot.mjs`, `diff-figma.py`, `extract-figma.py`. `shots/` is gitignored.

## Design Parity Protocol (MANDATORY for any screen built from Figma)

**Do NOT eyeball Figma — read the exact numbers.** Full doc: `../design-reference/WORKFLOW.md`. Use the `/figma-screen` skill to run the loop:

1. **Capture** via Figma REST API (default, no rate cap): `python scripts/figma-api.py nodes <fileKey> <nodeId>` (specs + caches JSON) and `... image <fileKey> <nodeId> [scale]` (reference PNG). Token in `../design-reference/.figma-token` (gitignored). MCP `get_design_context` is **fallback only** (rate-limited).
2. **Build to the printed specs** (px size/weight/line-height/letter-spacing/align/color per text; layoutMode/gap/padding/fills/strokes/cornerRadius per frame). Section headings = Inter Medium 36; Hero = Medium 60.
3. **Render**: `node scripts/shoot.mjs <routes>` → desktop + mobile PNGs in `shots/`.
4. **Verify 3 ways** — visual crop-compare vs cached Figma, **computed styles** (`getComputedStyle` via Playwright) for borders/colors/fonts, and re-run the extractor for type. A screenshot alone can mislead.
5. Only mark done when visual + computed + type all match; record verified specs in `../design-reference/<frame>.md`.

## ⚠ Tailwind v4 border-color gotcha

`border-<token>/<opacity>` (e.g. `border-taupe/30`) can **silently fail to generate** the border-color rule, falling back to `currentColor` (dark) — observed when a base `<Card>` class is overridden via `cn()`/twMerge. `border-brand/50`, `bg-brand/5`, `bg-taupe` work, but the token+opacity *border* combo doesn't.
**Fix: for exact Figma borders/colors use arbitrary values** — `border-[rgba(165,154,135,0.3)]`, not `border-taupe/30`. Always confirm with computed styles, never just a screenshot.

## Checkout / Paystack (keep this call order intact)

Flow: `/checkout` → `/checkout/delivery` → `/checkout/payment` → Paystack hosted page → `/checkout/callback` → `/checkout/confirmation`. All in `src/lib/actions/checkout.ts` against `sdk.store.*`.

1. `cart.update(id, { email, metadata:{ company_name, contact_person, contact_phone } })` — **email is REQUIRED** for Paystack.
2. `cart.update(id, { shipping_address, billing_address })` — Ghana defaults `country_code:"gh"`, `city:"Accra"`; instructions in `address.metadata.instructions`.
3. `fulfillment.listCartOptions({ cart_id })` → `cart.addShippingMethod(id,{ option_id })` — **required** before payment or `cart.complete()` fails. One option today (Standard GH₵30) → auto-pick `[0]`.
4. `payment.initiatePaymentSession(cart, { provider_id:"pp_paystack", data:{ email: cart.email, channels, metadata } })` — `data.email` is **required** by the plugin. `channels` (`["card"]` / `["mobile_money"]`) + `metadata` are forwarded to Paystack's `initialize` **only because we patch the plugin** (see backend `scripts/patch-paystack-rounding.mjs` — it now applies channels forwarding too). Returns `…paystackTxAccessCode` + `…paystackTxAuthorizationUrl`.
5. **Hosted-page redirect (the live flow):** `payment-method.tsx` calls `initiatePaystack` then `window.location.href = authorizationUrl` — the browser goes to Paystack's hosted checkout page. **Channel is locked at initialize time** (card→card form, momo→momo form). MoMo number is captured for records (metadata) but Paystack does NOT prefill it. (The inline `@paystack/inline-js` popup was tried 2026-07-16 and **reverted 2026-07-16 — it didn't work**; back to the plain redirect. The dep may still be in package.json, unused.)

- **`/checkout/callback` (Route Handler) completes the order.** Paystack returns the browser here (`?reference=…`); it runs `completeCheckout` → `cart.complete` → `authorizePayment` (Paystack verify) → `{type:"order"}` / `{type:"cart",error}`, then `redirect()`s to `/checkout/confirmation`. MUST be a Route Handler, never a page (it mutates cookies — `cookies().delete` is illegal during page render in Next 16). Call `redirect()` outside try/catch.
- ⚠ **The dashboard Callback URL rejects `localhost`**, so the post-payment redirect only lands correctly on the **deployed** storefront — run end-to-end payment tests there, not locally. (A per-tx env patch to set the callback URL was built then reverted — **don't re-propose it unprompted**.)
- `CART_FIELDS` in `cart.ts` must include `*payment_collection,payment_collection.payment_sessions` (the `*relation,relation.subfield` two-field pattern — `*relation.subfield` alone strips parent scalars).

## ⚠ Platform fee — a cart LINE ITEM (2026-08-10)

The store's platform fee is not a total; Medusa has no order-level fee, so the backend
charges it as a line item flagged `metadata.pg_platform_fee`. Helpers: `src/lib/platform-fee.ts`.

- **`getCart()` syncs it** (`withPlatformFee` in `lib/actions/cart.ts`) and re-fetches
  only when the backend reports `changed`. ⚠⚠ **`initiatePaystack` begins by calling
  `getCart()` — that is the money guarantee.** Paystack's amount is fixed at
  `initiatePaymentSession`; if that call order ever changes, the sync needs its own
  explicit call there. Cart mutations sync too, but only so the cart page isn't showing
  the previous basket's fee.
- ⚠⚠ **IT IS NEVER PRESENTED AS A PRODUCT** (client, 2026-08-11). It is a charge, in the
  same family as VAT/NHIL and delivery, and belongs beside the total — never in an item
  list, never in an item count, never with a stepper or a delete button. It was briefly
  shipped as a cart card and rejected. Concretely: `cart-client.tsx` derives `goods`
  (everything except the fee) and uses it for the cards, **both** item counts, the
  header badge, the stock guard and the empty-cart test — only `total` reads `items`;
  the checkout page and the emails do the equivalent.
- ⚠ It is inside `cart.item_total` / `order.totals.item_total`, **not additional to it**.
  Anything that shows it as its own row MUST also subtract it from Subtotal, and drop
  the line from its item list. Doing one without the other double-counts it. This
  applies to the cart summary, the checkout Order Summary, the invoice (`buildInvoice` +
  `invoiceLines`), the order-confirmation email and the receipt builder.
- `mapLineItem` still marks it `isService` as a belt-and-braces guard — it should never
  reach a cart card, but if it did it must not come with a quantity stepper.
- Reorder and `getCartLineCount` exclude it automatically (no `variant_id`, and
  `goodsLines`).

## ⚠ MOQ tiers — quantity-bracketed prices (2026-08-14)

Products may carry `metadata.tiers` (`[{minQuantity, maxQuantity|null, priceMultiplier,
label}]`, e.g. 50-199 ×1.2 … 1000+ ×0.8). The multiplier scales the selected **variant's
own price** — per-variant pricing stays the source of truth; no tiers = flat pricing.

- `src/lib/moq-tiers.ts` is the pure, client-safe **display twin** of
  `backend/src/utils/moq-tiers.ts` — same rules, same 2dp rounding, nothing checks them
  against each other. The customizer only PREVIEWS tier prices (ladder + active-tier row
  + optimistic cart lines).
- **The charge happens server-side**: `withPlatformFee` in `lib/actions/cart.ts` first
  calls `POST /store/carts/:id/moq-tiers` (which re-prices goods lines via
  `unit_price` → `is_custom_price`), then the platform-fee sync. ⚠⚠ **Tiers before fee
  is load-bearing** — the fee's base is `unit_price × quantity`. Same money guarantee as
  the fee: `initiatePaystack` → `getCart()` runs both syncs before the Paystack amount
  is fixed.
- Tier-priced lines are flagged `metadata.pg_moq_tiered` so removing a product's tiers
  walks its cart lines back to base; unflagged lines are never touched.

## ⚠ Category browse is DATA-DRIVEN (2026-08-14)

The hard-coded `SHOP_CATEGORIES` list is gone. Homepage cards, `/products` and
`/products/category/[handle]` render live Medusa categories (admin portal → Products →
Categories subtab). All display rules live in the pure, tested `src/lib/shop-categories.ts`;
`src/lib/categories.ts` is the fetch edge (5-min cache, static fallback when the backend
is unreachable). `categoryBySlug` is now **async `getShopCategoryBySlug`**.

- A category renders only when active AND it has ≥1 published product; a single-product
  category links straight to that product (this is how RSC Cartons' card → customizer
  works now — a data rule, not a special case).
- ⚠ Products match categories **by name**; a rename can hide a category for up to
  ~5 min while the two caches roll over (hidden, not broken).
- ⚠ Rank ties fall back to the canonical handle order — the imported categories all
  have rank 0, and a plain rank sort would reshuffle the homepage alphabetically.
- ⚠ The canonical card copy in `shop-categories.ts` is duplicated in the admin's
  prefill (`admin/src/lib/category-canonical.ts`); stored category data wins over both.

## ⚠ Cart page — user-requested deviations from Figma (preserve these)

Frames 404:1984 / 452:9255 / 452:9905. Apply these instead of the raw Figma layout:
1. Cross-sell uses a single **Add to Cart** button (swaps to green `✓ Added` pill), **not** a `(−) n (+)` stepper.
2. Cross-sell card: price on its own line, Add to Cart full-width below.
3. Cross-sell **mobile = horizontal-scroll strip** (`w-60 shrink-0 overflow-x-auto snap-x`, `-mx-4 px-4` bleed); desktop = 2-col grid.
4. Cart **line items have a quantity stepper** using squircle buttons (`rounded-button`/14px), count in a `<span>` not an `<input>`.
5. Empty-cart dialog (452:9905): centered modal, "Empty your cart?", full-width **plum** `Empty Cart` button (not rust), `Cancel` text link; Esc + backdrop dismiss.

If a future Figma frame contradicts these, **ask before reverting.**
