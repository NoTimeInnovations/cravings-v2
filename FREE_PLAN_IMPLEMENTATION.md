# Free Plan Implementation Guide

## Overview
Add a permanent **Free Plan** (no expiry, unlimited duration) replacing the 20-day trial. The menu is **fully usable** (unlimited items & categories) but restricted on premium features to drive upgrades to paid plans.

---

## Current Plan Hierarchy (after change)
| Plan | Price (India) | Price (Intl) | Duration |
|------|--------------|--------------|----------|
| **Free** | Free | Free | Forever |
| Digital Menu | ₹299/mo or ₹2999/yr | $19/mo or $190/yr | 30/365 days |
| Ordering | ₹499/mo or ₹4999/yr (+2%) | — | 30/365 days |
| Billing | ₹4999/yr | — | 365 days |

---

## Feature Restrictions Table

| Feature | Free | Digital Menu | Ordering | Billing |
|---------|------|-------------|----------|---------|
| Menu items | ✅ Unlimited | ✅ | ✅ | ✅ |
| Categories | ✅ Unlimited | ✅ | ✅ | ✅ |
| Menu editing | ✅ Full | ✅ | ✅ | ✅ |
| QR codes | **1 only** | Unlimited | Unlimited | Unlimited |
| Theme customization | ❌ Default only | ✅ | ✅ | ✅ |
| Custom banner/logo | ❌ | ✅ | ✅ | ✅ |
| "Powered by Menuthere" branding | ✅ Forced | Removable | Removable | Removable |
| Item variants (S/M/L) | ❌ | ✅ | ✅ | ✅ |
| AI image fetch | ❌ | ✅ | ✅ | ✅ |
| Custom username/URL | ❌ (auto ID) | ✅ | ✅ | ✅ |
| Google Business sync | ❌ | ✅ | ✅ | ✅ |
| Analytics dashboard | Basic (scan count) | Full | Full | Full |
| Download reports | ❌ | ✅ | ✅ | ✅ |
| Offers/Promotions | ❌ | ❌ | ✅ | ✅ |
| Ordering (dine-in/takeaway) | ❌ | ❌ | ✅ | ✅ |
| Delivery | ❌ | ❌ | ✅ | ✅ |
| KOT & Bill printing | ❌ | ❌ | ✅ | ✅ |
| WhatsApp integration | ❌ | ❌ | ✅ | ✅ |
| Captain/Staff mgmt | ❌ | ❌ | ✅ | ✅ |
| Discount codes | ❌ | ❌ | ✅ | ✅ |
| POS | ❌ | ❌ | ❌ | ✅ |
| Purchase & Inventory | ❌ | ❌ | ❌ | ✅ |
| Priority support | ❌ | ✅ | ✅ | ✅ |

### Why These Restrictions Drive Upgrades
1. **No theme/branding** — Restaurant owners care deeply about brand identity
2. **"Powered by Menuthere"** — Professional restaurants won't want competitor branding
3. **1 QR code** — Can't do per-table QR codes
4. **No variants** — Very common need (small/medium/large) forces upgrade
5. **No offers** — Can't run promotions
6. **Basic analytics** — They'll want detailed performance data
7. **No custom URL** — Can't share a clean branded link
8. **No AI images** — Manual upload only, tedious for large menus
9. **No Google Business** — Missing discoverability opportunity

---

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
    "custom_banner": false,
    "branding_removable": false,
    "variants": false,
    "ai_image_fetch": false,
    "custom_username": false,
    "google_business": false,
    "analytics": "basic",
    "download_reports": false,
    "offers": false,
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

### Step 6: Restrict variants in menu management
**File:** `src/components/admin-v2/AdminV2EditMenuItem.tsx`

- Get `planLimits` from auth store
- Hide "Add Option" button if `!planLimits.variants`
- Show UpgradePrompt card inside variants CardContent for free plan
- Variant form only renders when `planLimits.variants` is true

---

### Step 7: Add "Powered by Menuthere" watermark on public menu
**File:** `src/components/hotelDetail/` (public-facing menu page)

**What to do:**
- Find the main hotel detail/menu page component
- Check partner's plan from the server-fetched hotel data (need plan info in the public page data)
- If free plan: render a sticky footer/banner with "Powered by Menuthere" + link to menuthere.com
- If paid plan: hide or show removable option
- Style: subtle but visible — e.g. fixed bottom bar or footer badge

**Key consideration:** The public menu page is server-rendered. The partner's plan info needs to be available in the hotel data query (may need to add `subscription_details` to the public hotel query).

---

### Step 8: Restrict analytics dashboard
**File:** `src/components/admin-v2/AdminV2Dashboard.tsx`

**What to do:**
- Get plan limits from auth store
- If `planLimits.analytics === "basic"`:
  - Show only QR scan count card (already exists)
  - Wrap revenue, orders, payment breakdown, charts in a `relative` container
  - Overlay with UpgradePrompt (`variant="overlay"`) on top of blurred content
  - Users can see the layout exists but can't interact — creates FOMO
- If full analytics: render everything normally
- Disable "Download Report" button if `!planLimits.download_reports`, show toast on click

---

### Step 9: Restrict offers section
**File:** `src/components/admin-v2/AdminV2Offers.tsx`

**What to do:**
- Get plan limits from auth store
- If `!planLimits.offers`: replace entire offers UI with UpgradePrompt card variant
- Message: "Create offers & promotions to attract more customers. Upgrade to unlock."

---

### Step 10: Restrict remaining features

#### AI Image Fetch
**File:** `src/components/admin-v2/AdminV2Menu.tsx` (or wherever "Get all images" button is)
- Disable button if `!planLimits.ai_image_fetch`
- Show tooltip or toast: "Upgrade to use AI image generation"

#### Custom Username
**File:** Settings or partner profile where username is edited
- Disable username input field for free plan
- Show inline UpgradePrompt

#### Report Downloads
**File:** `src/components/admin-v2/AdminV2Dashboard.tsx`
- Disable download button, show upgrade toast on click

---

### Step 11: Update pricing page & signup flow
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

### Step 12: Update subscription logic
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

### Step 13: Update admin sidebar with lock icons
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
    if (["offers", "captains", "pos", "inventory", "orders"].includes(item.id)) {
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

| File | Status | Change |
|------|--------|--------|
| `src/data/plans.json` | ✅ Done | Added `in_free` & `int_free`, disabled `in_trial` |
| `src/lib/getPlanLimits.ts` | ✅ Done | New utility for plan limits |
| `src/components/admin-v2/UpgradePrompt.tsx` | ✅ Done | New reusable upgrade CTA component |
| `src/components/admin-v2/AdminV2QrCodes.tsx` | ✅ Done | QR code limit enforcement |
| `src/components/admin-v2/settings/GeneralSettings.tsx` | ✅ Done | Banner & Google Business restrictions |
| `src/components/admin-v2/AdminV2EditMenuItem.tsx` | ✅ Done | Variant restrictions |
| `src/components/hotelDetail/` (public menu) | ⬜ TODO | "Powered by Menuthere" watermark |
| `src/components/admin-v2/AdminV2Dashboard.tsx` | ⬜ TODO | Analytics restriction with overlay |
| `src/components/admin-v2/AdminV2Offers.tsx` | ⬜ TODO | Offers section locked |
| `src/components/admin-v2/AdminV2Menu.tsx` | ⬜ TODO | AI image fetch restriction |
| `src/components/admin-v2/AdminSidebar.tsx` | ⬜ TODO | Lock icons on restricted nav items |
| `src/app/pricing/page.tsx` | ⬜ TODO | Add Free Plan card |
| `src/components/international/PricingSection.tsx` | ⬜ TODO | Add Free Plan card |
| Signup/registration flow | ⬜ TODO | Default to free plan instead of trial |
| `src/app/actions/subscriptionV2.ts` | ⬜ TODO | Handle no-expiry plan |
| `src/app/actions/upgradePlan.ts` | ⬜ TODO | Free → paid upgrade flow |
| `src/components/admin-v2/SubscriptionStatus.tsx` | ⬜ TODO | Free Plan badge UI |

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
4. Theme settings → banner locked with upgrade CTA
5. Public menu → "Powered by Menuthere" watermark visible
6. Add variant → blocked with upgrade prompt
7. Dashboard → only scan count, rest blurred with overlay
8. Offers/Captains/POS sidebar → lock icon, upgrade prompt on click
9. Upgrade to Digital Menu → QR/theme/variants/analytics unlocked
10. Existing expired trial users → unchanged
