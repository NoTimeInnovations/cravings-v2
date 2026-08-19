# admin-v3 build conventions

Read this before writing any admin-v3 screen. It exists so ~40 screens written by
different people look and behave like one product.

## Where things are
- Design source: `/Users/abhinks/Documents/Modern SaaS dashboard redesign/Menuthere Dashboard.dc.html`
  (9300 lines, complete). Each screen is a `<sc-if value="{{ isX }}">` block at 4-space indent.
- Shell (do NOT edit from a screen): `src/app/admin-v3/page.tsx`, `AdminV3Header.tsx`,
  `AdminV3Sidebar.tsx`, `navItems.ts`. Wiring is done centrally after screens land.

## Design template syntax
- `<sc-if value="{{ flag }}" hint-placeholder-val="{{ true|false }}">` wraps a variant;
  the hint is the DEFAULT state, i.e. which variant the design shows.
- `style-hover="…"` is the hover style. `onClick="{{ handler }}"` marks an interaction.
- `{{ someVar }}` inside text/style is a placeholder for real data.

## Use the existing primitives — do not re-invent
From `src/components/admin-v3/ui/primitives.tsx`:
- `V3Card`  — the card shell. Already full-bleed (square, no side borders) below `lg`
  and rounded from `lg` up. Never add your own rounding/border to a card.
- `AdminV3Button` — variants `primary | strong | secondary | small | icon | danger`.
- `StatusPill` — tones `amber | green | neutral | outline`.
- `MiniProgress` — 6px track. For the 3px analytics-style bar use `className="h-[3px]"`.
- `StoreToggle` (ui/StoreToggle.tsx) — store open/closed.
Order cards + their actions: `src/components/admin-v3/dashboard/orderCardShared.tsx`
(`OrderCard`, `useOrderCardActions`). Reuse for anything that lists live orders.

## Palette — stock Tailwind only, always with a dark: pair
bg page `bg-white dark:bg-zinc-950` · card `bg-white dark:bg-zinc-900` · control face
`bg-white dark:bg-zinc-800` · hover `hover:bg-zinc-100 dark:hover:bg-zinc-800`
(on a zinc-800 face use `dark:hover:bg-zinc-700`)
border `border-zinc-200 dark:border-zinc-800` (control face: `dark:border-zinc-700`)
text 950→`dark:text-zinc-50` · 700→`dark:text-zinc-300` · 600→`dark:text-zinc-300`
· 500→`dark:text-zinc-400` · 400→`dark:text-zinc-500`
NEAR-BLACK BUTTONS INVERT: `bg-zinc-900 text-white` → `dark:bg-zinc-50 dark:text-zinc-900`
(hover `dark:hover:bg-zinc-200`). A near-black button on a near-black card is invisible.
pills: green `bg-green-50 border-green-200 text-green-700` →
`dark:bg-green-950 dark:border-green-900 dark:text-green-400`; amber and red the same shape.
Saturated dots/badges (`bg-green-600`, `bg-red-500/600`) and white text on them stay as-is.

## Type scale (from the design)
page h1 `text-[15px] lg:text-[clamp(17px,4.2vw,19px)] font-semibold tracking-[-0.02em]`
card title `text-[14.5px] font-semibold tracking-[-0.01em]` · card sub `text-[12.5px] text-zinc-500 mt-0.5`
stat label `text-xs font-medium text-zinc-500` · stat value `text-2xl font-semibold tracking-[-0.03em] mt-2`
stat sub `text-xs text-zinc-400 mt-[3px]` · body row `text-[13.5px]` · meta `text-[12.5px]`
Set explicit `leading-*` on compact rows — globals.css sets `:root{line-height:1.5}` and the
design assumes browser-normal (~1.2), so rows render 3-6px too tall without it.

## Responsive
- Mobile-first, no media queries in the design — reproduce `clamp()`, `flex-wrap`, and
  `repeat(auto-fit,minmax(Npx,1fr))` with Tailwind arbitrary values.
- The dashboard content area has NO horizontal padding below `lg` (cards are full-bleed);
  it gets `lg:px-[clamp(14px,3vw,28px)]`. Match that in your screen's root wrapper.
- Anything wide (tables, chart rows) scrolls inside its own `overflow-x-auto`; the page
  must never scroll horizontally.

## Data
- Read the matching `src/components/admin-v2/AdminV2*.tsx` and REUSE its queries, stores and
  mutations. Do not invent new data paths, and do not change admin-v2.
- Partner data is `useAuthStore().userData as Partner`. Currency `partner.currency || "₹"`.
- Bucket dates by the PARTNER timezone via `src/lib/partnerTime.ts`, never the browser's.
- After any partner-row mutation: `updatePartner(id, patch)` → `revalidateTag(id)`.
- Mark partner-owned text (store name, dish names, customer names, addresses) with
  `translate="no" className="notranslate"` — Google Translate rewrites everything else.
- If a panel in the design has NO real data source, render an honest empty/"not tracked yet"
  state and say so in your report. Never invent numbers.

## Contract for a screen component
- One default-or-named export, `"use client"`, no props required beyond what the shell passes.
- Own only your file(s). Never edit the shell, primitives, or another screen.
- `npx tsc --noEmit -p tsconfig.json` must be clean when you finish.
