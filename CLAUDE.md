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
4. `payment.initiatePaymentSession(cart, { provider_id:"pp_paystack", data:{ email: cart.email } })` — `data.email` is **required** by the plugin. Returns `…paystackTxAuthorizationUrl` → redirect there.
5. `cart.complete(cartId)` after return → runs `authorizePayment` (Paystack verify). Returns `{type:"order"}` or `{type:"cart",error}`.

- **`/checkout/callback` MUST be a Route Handler (`route.ts`), never a page** — it mutates cookies (`cookies().delete` is illegal during page render in Next 16). Call `redirect()` outside try/catch.
- Paystack callback URL is **configured on the Paystack dashboard** (not per-transaction). It **rejects `localhost`** → run end-to-end payment tests on the **deployed** storefront. A per-tx env patch was built then reverted — **don't re-propose it unprompted.**
- `CART_FIELDS` in `cart.ts` must include `*payment_collection,payment_collection.payment_sessions` (the `*relation,relation.subfield` two-field pattern — `*relation.subfield` alone strips parent scalars).

## ⚠ Cart page — user-requested deviations from Figma (preserve these)

Frames 404:1984 / 452:9255 / 452:9905. Apply these instead of the raw Figma layout:
1. Cross-sell uses a single **Add to Cart** button (swaps to green `✓ Added` pill), **not** a `(−) n (+)` stepper.
2. Cross-sell card: price on its own line, Add to Cart full-width below.
3. Cross-sell **mobile = horizontal-scroll strip** (`w-60 shrink-0 overflow-x-auto snap-x`, `-mx-4 px-4` bleed); desktop = 2-col grid.
4. Cart **line items have a quantity stepper** using squircle buttons (`rounded-button`/14px), count in a `<span>` not an `<input>`.
5. Empty-cart dialog (452:9905): centered modal, "Empty your cart?", full-width **plum** `Empty Cart` button (not rust), `Cancel` text link; Esc + backdrop dismiss.

If a future Figma frame contradicts these, **ask before reverting.**
