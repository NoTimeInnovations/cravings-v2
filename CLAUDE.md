# Cravings v2 — Claude Notes

## Hasura DB management

For any task that touches the Hasura database (inspecting schema, running SQL, partner CRUD, onboarding a Petpooja partner, updating usernames), prefer the prebuilt scripts in:

```
C:\Users\thris\Desktop\startup\11 product\Claude Skills\
```

- `skill-registry.json` — index of available skills with arg signatures
- `scripts/list-tables.sh` — list public-schema tables
- `scripts/describe-table.sh <table_name>` — column/type/nullable/default
- `scripts/run-sql.sh "<sql>"` — raw SQL via Hasura `/v2/query`
- `scripts/search-partner.sh <term>` — search partners by name/store/email/username/phone
- `scripts/create-pp-partner.sh <name> <email> <petpooja_restaurant_id>` — inserts partner row + emails Petpooja team
- `scripts/set-username.sh <partner_id> <new_username>` — validates + updates username
- `credentials.env` — Hasura endpoint + admin secret (sourced by every script)

**Workflow:**
1. Check `skill-registry.json` first to see if an existing skill fits.
2. Read the script before running — several have hardcoded defaults (e.g. `create-pp-partner.sh` uses default password `123456`, sends from `servicesnotime@gmail.com`, CCs the Petpooja team).
3. Scripts hardcode `source "/home/abhin/Cloud Skills/credentials.env"` (Linux path). On Windows they need WSL with the env file at that path, or edit the `source` line. Confirm with the user before executing.
4. For destructive SQL (UPDATE/DELETE/DDL), confirm with the user first.

---

# Codebase Map

> A feature→file index so you can jump straight to the right file instead of searching. ~1000 source files under `src/`. Keep this current when structure changes. Paths are repo-relative.

## Stack & architecture

- **Framework:** Next.js 15 App Router + React + TypeScript. Routes in `src/app/`, UI in `src/components/`.
- **Styling:** Tailwind CSS + shadcn/ui primitives (Radix) in `src/components/ui/`. `cn()` from `src/lib/utils` composes classes. Icons: `lucide-react`.
- **State:** Zustand stores in `src/store/` (Hasura-backed stores use the `*_hasura.ts` suffix). `useAuthStore` holds `userData`/role/session.
- **Data:** Hasura GraphQL is the single source of truth. Access goes through `fetchFromHasura()` (browser — `src/lib/hasuraClient.ts`), `fetchFromHasuraServer()` (server, admin secret — `src/lib/hasuraServerClient.ts`), and `subscribeToHasura()` (realtime — `src/lib/hasuraSubscription.ts`). GraphQL strings live either in `src/api/*` (named consts, grouped by resource) or inline template strings in the caller.
- **Server logic:** Server Actions in `src/app/actions/` (`"use server"`), REST API routes in `src/app/api/`.
- **Media:** S3 via `uploadFileToS3` / `deleteFileFromS3` (`src/app/actions/aws-s3`).
- **Cache:** After any partner mutation, call `revalidateTag(partnerId)` (from `src/app/actions/revalidate`) to bust ISR.
- **Integrations:** Payments = Cashfree + Razorpay; messaging = WhatsApp Meta Cloud API; AI = Google Gemini; maps = Google/Mapbox; analytics = PostHog + Sentry.
- **Scripts:** `npm run dev | build | start | lint | codegen` (codegen = graphql-codegen).

## Three app "generations" (know which one you're in)

- **Current partner dashboard → `src/app/admin-v2/` + `src/components/admin-v2/`** (active partners are redirected here). This is where almost all dashboard work happens.
- **Legacy partner dashboard → `src/app/admin/` + `src/components/admin/`** (older; kept for inactive/redirect flows).
- **Superadmin (platform ops) → `src/app/superadmin/` + `src/components/superAdmin/`** (guarded by `SuperadminGuard`).
- **Customer storefront → `src/app/[username]/` + `src/components/hotelDetail/`** (menu, ordering); discovery in `src/components/hotels/`.

## Find it fast — task → location

| To change… | Go to |
|---|---|
| Store settings (name, currency, timezone, phone, legal) | `src/components/admin-v2/settings/GeneralSettings.tsx` |
| Any dashboard **setting** (router + save flow) | `src/components/admin-v2/AdminV2Settings.tsx` + `src/store/adminSettingsStore.ts` |
| Delivery / order-types / payments / discounts / loyalty settings | `src/components/admin-v2/settings/*Settings.tsx` |
| Theme / branding / menu style | `src/components/admin-v2/settings/ThemeSettings.tsx`, `BrandingSettings.tsx` |
| Customer menu layout (5 variants) | `src/components/hotelDetail/styles/{Default,Compact,V3,V4,V5,Sidebar}/` |
| Checkout / cart / address picker | `src/components/hotelDetail/OrderDrawer.tsx`, `hotelDetail/placeOrder/` |
| Order tracking page (customer) | `src/app/order/[id]/OrderClient.tsx` (all order-side logic, ~1500 lines) |
| POS (in-store billing) | `src/components/admin-v2/AdminV2POS.tsx` + `admin-v2/pos/`; captain POS `src/app/captain/` |
| Orders list / management (dashboard) | `src/components/admin-v2/AdminV2Orders.tsx`, `OrderDetails.tsx` |
| Menu items / categories / stock | `src/components/admin-v2/AdminV2Menu.tsx`, `AdminV2AddMenuItem.tsx`, `AdminV2StockManagement.tsx` |
| WhatsApp automation flow builder | `src/components/admin-v2/whatsapp-flow/FlowBuilder.tsx`; engine `src/lib/whatsappFlow/engine.ts` |
| WhatsApp inbox/templates/broadcasts (API) | `src/app/api/whatsapp/` (send `.../send/route.ts`, webhook `.../meta/webhook/route.ts`) |
| Partner signup / onboarding | `src/components/get-started/GetStartedClient.tsx`, `src/app/actions/quickSignupFromGoogle.ts`, `onBoardUserSignup.ts` |
| Auth / login / session cookies | `src/store/authStore.ts`, `src/app/auth/actions.ts`, `src/proxy.ts` (middleware) |
| Public website builder | `src/components/storefront/` (state → `src/store/storefrontStore.ts` → `website_config`) |
| Superadmin partner CRUD / QR / subscriptions | `src/components/superAdmin/EditPartners.tsx`, `QrManagement_v2.tsx`, `SubscriptionManagementV2.tsx` |
| Payments (webhooks / verify) | `src/app/api/cashfree/`, `src/app/api/fhc/`, actions `src/app/actions/cashfree.ts`, `razorpay_payments.ts` |
| Analytics dashboards | `src/app/analytics/` (network), `src/app/my-earnings/` (partner), API `src/app/api/stats/` |
| Analytics **Target** tab (₹10L/mo goal + restaurant watchlist) | `src/app/analytics/_components/sections/TargetSection.tsx` + API `src/app/api/stats/watchlist/route.ts` (DB table `analytics_watchlist` — only the selection is stored; order stats/trends computed live) |
| Cron / scheduled jobs | `src/app/api/cron/` (dispatch notifications, auto-progress, reconcile) |
| A shared UI primitive (button/input/dialog/select) | `src/components/ui/` |
| Feature-flag logic | `src/lib/getFeatures.ts` |
| Menu visibility / scheduling | `src/lib/visibility.ts`, `src/components/admin-v2/availability/VisibilityEditor.tsx` |
| Loyalty points math / ledger | `src/lib/loyalty/config.ts`, `src/lib/loyalty/ledger.ts` |
| Global nav / footer / bottom nav | `src/components/Navbar.tsx`, `BottomNav.tsx` (loose files in `src/components/`) |

## Directory map

**`src/app/` — routes & backend**
- `[username]/` — customer storefront (menu, ordering, per-partner legal pages). `order/[id]/`, `bill/[id]/` — order tracking & bill. `qrScan/[[...id]]/` — dine-in QR ordering.
- `offers/`, `explore/`, `compare/`, `coupons/`, `product/` — offer discovery & marketing/product pages.
- `admin-v2/` (active dashboard), `admin/` (legacy), `superadmin/` (platform ops), `profile/` (partner settings hub), `user-profile/` (customer).
- `login/`, `newlogin/`, `partnerlogin/`, `captainlogin/`, `superLogin/`, `auth/` — role-specific auth entry points.
- `onboard/`, `get-started/`, `signup-from-google/` — partner onboarding. `captain/`, `kot/`, `delivery-app/`, `demo/` — captain POS, kitchen tickets, rider app, demo showcase.
- `analytics/`, `my-earnings/`, `my-orders/`, `reel-analytics/` — dashboards & reports.
- `(root)/`, `solutions/`, `business/`, `hotels/`, `pricing/`, `blog/`, `tutorials/`, `help-center/`, `go/` (rider app), legal pages (`privacy-policy/`, `terms-*`, `refund-policy/`) — marketing/legal/content. `test/` — internal dev utilities (not in sitemap).
- **`actions/`** (~49) — server actions: auth, onboarding, orders, payments, notifications, delivery dispatch, loyalty, S3, geocoding, revalidation.
- **`api/`** (~95) — REST routes: `whatsapp/` (largest), `cashfree/`, `fhc/`, `webhooks/`, `cron/`, `auth/`, `order/`, `stats/`, `ai/`, `loyalty/`, `google-business/`, `domains/`, `delivery*/`, `go/`, `v1/` (public partner API), `image-bank/`, `email/`.
- Root: `layout.tsx`, `sitemap.ts`, `manifest.ts`, `error.tsx`, `not-found.tsx`, `loading.tsx`.

**`src/components/` — UI**
- `admin-v2/` (~110) — current dashboard: `AdminV2*.tsx` feature screens + `settings/`, `pos/`, `inventory/`, `availability/`, `tour/`, `whatsapp-flow/`.
- `admin/` (~32) — legacy dashboard (tabs, menu/offer/order management, `inventory/`, `orders/`, `pos/`).
- `superAdmin/` (~30), `hotelDetail/` (~46, customer menu + `styles/` + `placeOrder/`), `hotels/` (discovery), `storefront/` (website builder), `website/` (embed rendering).
- `home/` (~31), `explore/` (~13), `solutions/`, `blog/`, `seo/`, `product/`, `international/` — marketing.
- `ui/` (~42) — shadcn design system (see below). Loose files directly in `src/components/` (~74) — global chrome (`Navbar`, `Footer`, `BottomNav`), cards, modals, init/bootstrap.
- Smaller: `emails/`, `onboarding/`, `bulkMenuUpload/`, `pos/`, `customOfferAndPormotion/`, `deliveryPool/`, `WhtaasappQrScan/`, `partnerVerification/`, `notices/`, `legal/`, `get-started/`, `captain/`, `loyalty/`, `reelAnalytics/`.

**`src/lib/` (~103)** — helpers. Core: `hasuraClient.ts`, `hotelDataFetcher.ts`, `getFeatures.ts`, `visibility.ts`, `brandColor.ts`, `subscriptionConfig.ts`, `newPartnerDefaults.ts`, `prebooking.ts`, `encrtption.ts` (note the typo — import it as-is). Subsystems: `ai/`, `menu/` (Gemini extraction), `loyalty/` (config + signed ledger), `notify/` (push/broadcast), `whatsappFlow/` (FSM engine), `publicApi/` (bearer auth/rate-limit for `/api/v1`), `imageSearch/`.

**`src/api/` (~22)** — GraphQL wrappers per resource: `partners.ts` (incl. `updatePartner`), `menu.ts`, `orders.ts`, `offers.ts`, `category.ts`, `pos.ts`, `inventory.ts`, `deliveryBoys.ts`, `reviews.ts`, `analytics.ts`, `auth.ts`, `branches.ts`, etc.

**`src/store/` (~25)** — Zustand: `authStore`, `orderStore`, `posStore`, `menuStore_hasura`, `categoryStore_hasura`, `offerStore_hasura`, `partnerStore` / `usePartnerStore` (⚠ two different hooks, same name), `adminStore`, `adminSettingsStore`, `tourStore`, `locationStore`, `liveStockStore`, `inventoryStore`, `storefrontStore`, etc.

**Other:** `src/hooks/` (bulk upload, OTP auth, PWA, live location, subscription gate), `src/providers/` (`AuthInitializer`, theme, PostHog), `src/types/` (`storefront.ts`, `website.ts`, `notices.ts`, payments), `src/utils/`, `src/screens/`, `src/data/` (`currencies.json`, country meta), `src/proxy.ts` (middleware: role routing + custom-domain rewrites + GTM header).

## Data model & storage conventions (partner row — important gotchas)

- **`currency`** = display **symbol** string (`₹`/`$`/`€`), NOT ISO code. Consumers fall back to `₹`/`$`. Full world list derived at runtime — `src/lib/worldCurrencies.ts`.
- **`timezone`** = IANA string (e.g. `Asia/Kolkata`). Full list — `src/lib/timezones.ts`. Used by `src/lib/visibility.ts` / scheduling.
- **`feature_flags`** = comma-separated CSV string (`ordering-true,delivery-false,...`); parse with `getFeatures()`, never hand-edit. Each feature has `{access, enabled}`.
- **`social_links`** = JSON object — **read-modify-write** (different settings sections own different keys: General owns instagram/facebook, Integrations owns zomato/uberEats/etc.).
- **`whatsapp_numbers`** = array of `{number, area}` (multi-location; primary `area: "default"`).
- **`storefront_settings`, `theme`, `website_config`, `delivery_rules`, `loyalty_settings`** = JSON (often stored stringified) — always parse-check (handle string OR object) on read.
- **`geo_location`** = GeoJSON `Point {type, coordinates:[lng,lat]}`.
- Orders: `type` = `delivery|takeaway|dine_in`; `status_history` drives the state machine; `savings` locked at placement.
- Category names stored `lowercase_underscore`, shown via `formatDisplayName()`.

## Cross-cutting conventions

- **Save flow (settings):** each section registers `setSaveAction()` on `useAdminSettingsStore`; one floating Save button runs it → `updatePartner(id, updates)` → `revalidateTag(id)` → `setState(updates)`. Track edits in a `hasChanges` effect.
- **Next.js 15:** dynamic route params are awaited (`const { id } = await params`). Metadata via `generateMetadata()`.
- **Webhooks:** verify signature (Cashfree HMAC-SHA256, Meta `X-Hub-Signature-256`, Razorpay `X-Razorpay-Signature`), be idempotent, return 200 fast.
- **Fire-and-forget:** delivery dispatch, loyalty, restock, Porter/pool never block the caller; failures logged, not thrown.
- **Custom domains:** detected via host; use root-relative links (not `/username/...`); PostHog + GTM behave differently (see `src/proxy.ts`).
- **Auth cookie:** `new_auth_token` (encrypted, httpOnly, 30d) → `{id, role, feature_flags, status}`. Roles: `partner | captain | superadmin | user`.
- **Reusable searchable dropdown:** `src/components/ui/searchable-select.tsx` (keyboard nav, multi-token filter, handles legacy values). Category picker with inline create: `src/components/ui/CategoryDropdown.tsx`.
- **Toasts:** `sonner` (`toast.success/error`). Drag-drop reorder: `@hello-pangea/dnd` with a `priority` field.
