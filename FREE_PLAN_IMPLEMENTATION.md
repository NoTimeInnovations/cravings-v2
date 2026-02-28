# Free Plan Implementation Guide

## Overview

Add a permanent **Free Plan** (no expiry, unlimited duration) replacing the 20-day trial. The menu is **fully usable** (unlimited items & categories) but restricted on premium features to drive upgrades to paid plans.

---

## Current Plan Hierarchy (after change)

| Plan         | Price (India)             | Price (Intl)      | Duration    |
| ------------ | ------------------------- | ----------------- | ----------- |
| **Free**     | Free                      | Free              | Forever     |
| Digital Menu | ₹299/mo or ₹2999/yr       | $19/mo or $190/yr | 30/365 days |
| Ordering     | ₹499/mo or ₹4999/yr (+2%) | —                 | 30/365 days |

> **Note:** Billing plan (`in_billing_yearly`) has been removed from India. Disable it in `plans.json`.

---

## Feature Restrictions Table (udpated)

| Feature                         | Free               |
| ------------------------------- | ------------------ |
| Menu items                      | ✅ Unlimited       |
| Categories                      | ✅ Unlimited       |
| Menu editing                    | ✅ Full            |
| QR codes                        | 1 QR               |
| Theme customization             | ❌ Default only    |
| Custom banner/logo              | ✅                 |
| "Powered by Menuthere" branding | ✅ Forced          |
| Item variants (S/M/L)           | ✅                 |
| Auto Image Getting              | ✅                 |
| Custom username/URL             | ✅                 |
| Google Business sync            | 1 Time Only        |
| Analytics dashboard             | Basic (scan count) |
| Download reports                | ❌                 |
| Offers/Promotions               | ✅                 |
| Ordering (dine-in/takeaway)     | ❌                 |
| Delivery                        | ❌                 |
| KOT & Bill printing             | ❌                 |
| WhatsApp integration            | ❌                 |
| Captain/Staff mgmt              | ❌                 |
| Discount codes                  | ❌                 |
| POS                             | ❌                 |
| Purchase & Inventory            | ❌                 |
| Priority support                | ❌                 |

## Implementation Steps

### Step 1: Add Free Plan to `src/data/plans.json`

- Add `in_free` (India) and `int_free` (international) plan entries
- Set `period_days: -1` (no expiry)
- Set `price: "Free"`, `buttonText: "Get Free Menu"`
- Add new `limits` object on each plan defining all restrictions:
  ```json
  "limits": {
    "max_qr_codes": 1,
    "theme_customization": false,
    "custom_banner": true,
    "branding_removable": false,
    "variants": true,
    "ai_image_fetch": true,
    "custom_username": true,
    "google_business": "once",
    "analytics": "basic",
    "download_reports": false,
    "offers": true,
    "priority_support": false
  }
  ```
- Disable `in_trial` plan (`"disabled": true`)

---

### Step 2: Create plan limits utility — `src/lib/getPlanLimits.ts` (new file)

- Define `PlanLimits` type with all restriction fields
- `getPlanLimits(planId)` — returns restricted defaults for free plans, all-enabled for paid
- `isFreePlan(planId)` — helper to check if current plan is free
- Free plan IDs: `["in_free", "int_free"]`
- Paid plans return unlimited/all-enabled defaults unless custom limits defined in plans.json

---

### Step 3: Create reusable UpgradePrompt component — `src/components/admin-v2/UpgradePrompt.tsx` (new file)

- Three variants: `inline`, `overlay`, `card`
- **inline**: small lock icon + text + upgrade link (for banners/hints)
- **overlay**: blurred backdrop over restricted content with centered CTA
- **card**: full card with lock icon, feature name, description, upgrade button
- All link to `/pricing` page
- Uses existing UI components: Button, lucide-react icons (Lock, Sparkles)

---

### Step 4: Enforce QR code limit

**File:** `src/components/admin-v2/AdminV2QrCodes.tsx`

- Get `planId` from `userData.subscription_details.plan.id` via `useAuthStore()`
- Compute `planLimits = getPlanLimits(planId)`
- In `handleCreateSubmit()`: check if `totalQrs >= planLimits.max_qr_codes` before creating
- Cap `createCount` to remaining allowed QRs
- On "Generate New QRs" button click: show toast error if limit reached
- Show inline UpgradePrompt banner for free plan users

---

### Step 5: Restrict theme customization & banner

**File:** `src/components/admin-v2/settings/GeneralSettings.tsx`

- Get plan limits at component level
- **Banner card**: Wrap content in `isOnFreePlan ? <UpgradePrompt /> : <existing banner UI>`
- Show "Pro" badge (Lock icon) on card header for free plan
- **Google Business card**: Same pattern — show UpgradePrompt instead of connect UI for free plan

---

### Step 6: Add "Powered by Menuthere" watermark on public menu

**File:** `src/components/hotelDetail/` (public-facing menu page)

**What to do:**

- Find the main hotel detail/menu page component
- Check partner's plan from the server-fetched hotel data (need plan info in the public page data)
- If free plan: render a footer/banner with "Powered by Menuthere" + link to menuthere.com at bottom of screen not sticky
- If paid plan: hide or show removable option (disabled default for all plans for new user enabled default for old user)
- Style: subtle but visible — e.g. fixed bottom bar or footer badge
- also hide change theme button

**Key consideration:** The public menu page is server-rendered. The partner's plan info needs to be available in the hotel data query (may need to add `subscription_details` to the public hotel query).

---

### Step 8: Restrict report download on dashboard

**File:** `src/components/admin-v2/AdminV2Dashboard.tsx`

**What to do:**

- Get plan limits from auth store
- Analytics dashboard remains fully visible for all plans (no overlay/blur)
- Disable "Download Report" button for free plan
- Add a crown icon (👑 or lucide `Crown`) next to the button to indicate it's a premium feature
- On click: show upgrade toast — "Upgrade to download reports"

---

### Step 9: Update pricing page & signup flow

**Files:**

- `src/app/pricing/page.tsx`
- `src/components/international/PricingSection.tsx`

**What to do:**

- Add Free Plan card as first option (show "Current Plan" badge for free users)
- Trial plan card should be hidden (already disabled)
- Free plan card shows limited features list
- Paid plans show "Upgrade" CTA
- On new signup: assign free plan by default instead of trial

**Signup flow files:**

- Find where `in_trial` is assigned on registration (likely in `src/store/authStore.ts` or registration actions)
- Change default plan assignment to `in_free` / `int_free` based on country
- Set `subscription_details.status: "active"`, no `expiryDate` (or far future date)

---

### Step 10: Update subscription logic

**Files:**

- `src/app/actions/subscriptionV2.ts`
- `src/app/actions/upgradePlan.ts`
- `src/components/admin-v2/SubscriptionStatus.tsx`
- `src/lib/subscriptionManagemenFunctions.ts`

**What to do:**

- Handle `period_days: -1` — skip expiry check, never mark as expired
- `SubscriptionStatus.tsx`: Show "Free Plan" badge instead of expiry countdown
- Show "Upgrade" CTA button prominently
- Upgrade flow: free → paid (no Razorpay subscription to cancel, just create new)
- `isFreePlanUsed` flag should NOT be set (that was for trial)

---

### Step 11: Update admin sidebar with lock icons

**File:** `src/components/admin-v2/AdminSidebar.tsx`

**What to do:**

- Currently, sidebar hides items based on feature flags (e.g., captains hidden if `!captainordering.enabled`)
- For free plan: **show all items but with lock icon** on restricted ones
- Restricted sidebar items for free plan: Offers, Captains, POS, Purchase & Inventory, Orders
- On click of locked item: show toast or redirect to pricing instead of navigating
- This creates visibility of premium features → drives upgrades

**Implementation:**

```tsx
// In filteredItems logic, instead of filtering out, add a "locked" flag
const getItemState = (item) => {
  if (isOnFreePlan) {
    if (
      ["offers", "captains", "pos", "inventory", "orders"].includes(item.id)
    ) {
      return "locked";
    }
  }
  // ... existing feature flag checks
};
```

- Render Lock icon next to locked items
- Style locked items with muted text

---

## Files Changed Summary

| File                                                   | Status  | Change                                            |
| ------------------------------------------------------ | ------- | ------------------------------------------------- |
| `src/data/plans.json`                                  | ⬜ TODO | Added `in_free` & `int_free`, disabled `in_trial` |
| `src/lib/getPlanLimits.ts`                             | ⬜ TODO | New utility for plan limits                       |
| `src/components/admin-v2/UpgradePrompt.tsx`            | ⬜ TODO | New reusable upgrade CTA component                |
| `src/components/admin-v2/AdminV2QrCodes.tsx`           | ⬜ TODO | QR code limit enforcement                         |
| `src/components/admin-v2/settings/GeneralSettings.tsx` | ⬜ TODO | Banner & Google Business restrictions             |
| `src/components/hotelDetail/` (public menu)            | ⬜ TODO | "Powered by Menuthere" watermark                  |
| `src/components/admin-v2/AdminV2Dashboard.tsx`         | ⬜ TODO | Analytics restriction with overlay                |
| `src/components/admin-v2/AdminSidebar.tsx`             | ⬜ TODO | Lock icons on restricted nav items                |
| `src/app/pricing/page.tsx`                             | ⬜ TODO | Add Free Plan card                                |
| `src/components/international/PricingSection.tsx`      | ⬜ TODO | Add Free Plan card                                |
| Signup/registration flow                               | ⬜ TODO | Default to free plan instead of trial             |
| `src/app/actions/subscriptionV2.ts`                    | ⬜ TODO | Handle no-expiry plan                             |
| `src/app/actions/upgradePlan.ts`                       | ⬜ TODO | Free → paid upgrade flow                          |
| `src/components/admin-v2/SubscriptionStatus.tsx`       | ⬜ TODO | Free Plan badge UI                                |

---

## How Plan Limits Are Accessed (Pattern)

All admin components use the same pattern:

```tsx
import { useAuthStore } from "@/store/authStore";
import { getPlanLimits, isFreePlan } from "@/lib/getPlanLimits";

// Inside component:
const { userData } = useAuthStore();
const planId = userData?.subscription_details?.plan?.id;
const planLimits = getPlanLimits(planId);
const isOnFreePlan = isFreePlan(planId);

// Then use planLimits.variants, planLimits.max_qr_codes, etc. to gate features
```

---

## Existing Users

- **Expired trial users**: No change. They stay in expired state.
- **Active paid users**: No change. Their plan limits return all-enabled.
- **New signups**: Get `in_free` or `int_free` based on country.

---

## Testing Checklist

1. New signup → gets Free Plan, no expiry shown
2. Add unlimited items/categories → works fine
3. Try 2nd QR code → blocked with upgrade prompt
4. Theme settings → banner locked with upgrade CTA. chanage theme button in compact.tsx disabled with upgrade prompt
5. Public menu → "Powered by Menuthere" watermark visible
7. Dashboard → disabled download report button
8. Captains/POS sidebar → lock icon, upgrade prompt on click
9. Upgrade to Digital Menu → QR/theme/variants/analytics unlocked
10. Existing expired trial users → unchanged
