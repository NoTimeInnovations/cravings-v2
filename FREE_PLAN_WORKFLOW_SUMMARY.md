# Free Plan Implementation — Workflow Summary

## New Files Created (2)

| File | Purpose |
|------|---------|
| `src/lib/getPlanLimits.ts` | Utility with `PlanLimits` type, `getPlanLimits(planId)` and `isFreePlan(planId)` helpers. Free plan IDs: `in_free`, `int_free`. Returns restricted limits for free plans, all-enabled for paid. |
| `src/components/admin-v2/UpgradePrompt.tsx` | Reusable upgrade CTA component with 3 variants: `inline` (banner), `overlay` (blurred backdrop), `card` (full card). All link to `/pricing`. |

## Files Modified (12)

| File | Changes |
|------|---------|
| `src/data/plans.json` | Added `in_free` and `int_free` plans with `period_days: -1` (no expiry) and `limits` object. Disabled `in_trial` and `in_billing_yearly` (`"disabled": true`). |
| `src/components/admin-v2/AdminV2QrCodes.tsx` | Added plan limits check. `handleCreateSubmit()` blocks creation when QR limit reached. Caps create count to remaining allowed. Shows inline UpgradePrompt for free plan users. "Generate New QRs" button shows toast if limit hit. |
| `src/components/admin-v2/settings/GeneralSettings.tsx` | Google Business Profile card shows `UpgradePrompt` (card variant) instead of connect UI for free plan users. Lock icon on card header for free plan. |
| `src/screens/HotelMenuPage_v2.tsx` | Added "Powered by Menuthere" footer watermark for free plan hotels (non-sticky, bottom of page with link to menuthere.com). Passes `isOnFreePlan` prop to Default/Compact components. |
| `src/components/hotelDetail/styles/Default/Default.tsx` | Added `isOnFreePlan` to `DefaultHotelPageProps` interface. Hides `ThemeChangeButton` when `isOnFreePlan` is true. |
| `src/components/hotelDetail/styles/Compact/Compact.tsx` | Accepts `isOnFreePlan` prop. Hides "Change Theme" button for free plan users. |
| `src/components/admin-v2/AdminV2Dashboard.tsx` | "Download Report" button shows Crown icon for free plan and shows upgrade toast on click instead of downloading. |
| `src/components/admin-v2/SubscriptionStatus.tsx` | Handles `period_days: -1` — shows "Free Plan — No expiry" instead of countdown. Never marks free plan as expired. |
| `src/components/admin-v2/AdminSidebar.tsx` | Free plan users see all sidebar items but Orders, Offers, Captains, POS, Purchase & Inventory show Lock icon and are muted. Clicking shows upgrade toast instead of navigating. |
| `src/components/international/PricingSection.tsx` | Added "Free" tab as first option in India pricing (4 tabs now). Free plan card shows "Free" price, "Forever" label, "Get Free Menu" CTA. Shows "Current Plan" if user is on that plan. Handles `period_days: -1` in signup flow (no expiry date). |
| `src/components/get-started/GetStartedClient.tsx` | New signups get `in_free` (India) or `int_free` (international) instead of `in_trial`. `expiryDate` set to `null` for free plan. `isFreePlanUsed` set to `false`. |
| `src/app/actions/upgradePlan.ts` | Handles `period_days: -1` — sets `expiryDate: null` for free plan upgrades. |

## Key Behavior Changes

- **New signups** → Free plan (no expiry, unlimited items/categories)
- **QR codes** → Limited to 1 for free plan, upgrade prompt shown
- **Theme customization** → Hidden on public menu for free plan
- **Google Business sync** → Locked behind upgrade prompt
- **Download reports** → Crown icon, blocked with toast for free plan
- **Sidebar** → All items visible but premium ones locked with Lock icon
- **Public menu** → "Powered by Menuthere" watermark at bottom
- **Subscription status** → Shows "Free Plan — No expiry" badge
- **Existing users** → Unchanged (expired trials stay expired, active paid plans unaffected)

## Plan Hierarchy (after change)

| Plan | Price (India) | Price (Intl) | Duration |
|------|---------------|--------------|----------|
| **Free** | Free | Free | Forever |
| Digital Menu | ₹299/mo or ₹2999/yr | $19/mo or $190/yr | 30/365 days |
| Ordering | ₹499/mo or ₹4999/yr (+2%) | — | 30/365 days |

## Pattern for Accessing Plan Limits

All admin components use the same pattern:

```tsx
import { useAuthStore } from "@/store/authStore";
import { getPlanLimits, isFreePlan } from "@/lib/getPlanLimits";

const { userData } = useAuthStore();
const planId = (userData as any)?.subscription_details?.plan?.id;
const planLimits = getPlanLimits(planId);
const isOnFreePlan = isFreePlan(planId);
```
