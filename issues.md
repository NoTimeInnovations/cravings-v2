# Issues & Fixes

## Issue #9 - Move Plan Details to Separate Billing Section

**Status:** Implemented

**What was done:**
- Added "Billing" sidebar item with `Receipt` icon in `AdminSidebar.tsx`
- Created `AdminV2Billing.tsx` component that renders:
  - `SubscriptionStatus` component (current plan, expiry, scan usage, upgrade/cancel)
  - **Payment History** section that fetches from `partner_payments` table and shows transaction date, plan name, amount, and validity period
- Added dynamic import and view rendering in `admin-v2/page.tsx`

**Files changed:**
- `src/components/admin-v2/AdminSidebar.tsx` - Added billing nav item
- `src/components/admin-v2/AdminV2Billing.tsx` - New billing view with payment history
- `src/app/admin-v2/page.tsx` - Added billing view rendering

**Impact on existing users:** None. This adds a new sidebar item. Existing views are untouched.

---

## Issue #46 - Change Color of App Bar According to BG of Partner in Webmanifest

**Status:** Implemented

**What was done:**
- Created dynamic API route `/api/manifest/[username]` that:
  - Fetches partner's `theme` (bg, accent colors) and `store_name` from Hasura by username
  - Returns a proper web manifest JSON with partner's `background_color` and `theme_color`
  - Includes partner's `store_banner` as an icon if available
  - Cached for 1 hour (`Cache-Control: public, max-age=3600`)
- Added `manifest` property to `[username]` page metadata pointing to the dynamic manifest

**Files changed:**
- `src/app/api/manifest/[username]/route.ts` - New dynamic manifest API
- `src/app/[username]/page.tsx` - Added manifest metadata link

**Impact on existing users:** None. The global `/manifest.webmanifest` is unchanged. Partner pages now get their own themed manifest.

---

## Issue #50 - Add User Phone Number in Checkout Modal + Change Number Feature

**Status:** Implemented

**What was done:**
- Added `updateUserPhoneMutation` to `api/auth.ts` for updating user phone in Hasura
- Created `PhoneNumberCard` component in `PlaceOrderModal.tsx` that:
  - Displays current phone number with a "Change" button
  - On click "Change", expands into an inline edit form with country code prefix + phone input
  - Validates phone using existing `validatePhoneNumber` utility
  - Saves new phone via Hasura mutation and updates Zustand store
  - Does **NOT** log the user out (fixes previous implementation)
- Phone card shows after the customer name section in checkout

**Files changed:**
- `src/api/auth.ts` - Added `updateUserPhoneMutation`
- `src/components/hotelDetail/placeOrder/PlaceOrderModal.tsx` - Added `PhoneNumberCard` component and imported `updateUserPhoneMutation`

**Impact on existing users:** None. Additive change - new card appears in checkout if user has a phone number. All existing checkout flow untouched.

---

## Issue #24 - Allow Video Upload in Banner Section (Max 1MB)

**Status:** Implemented

**What was done:**
- Created `src/lib/mediaUtils.ts` with `isVideoUrl()` helper that detects video URLs
- Updated `GeneralSettings.tsx`:
  - File input now accepts `image/*,video/mp4,video/webm`
  - Videos are validated to be under 1MB; shows error toast if exceeded
  - Videos skip the image cropper and upload directly
  - Preview section renders `<video>` tag for video banners
- Created `BannerEditor.tsx` — a full two-step banner image editor:
  - **Step 1 — Crop**: Locked 1131:583 aspect ratio, users can resize crop area but not change ratio
  - **Step 2 — Edit**: After cropping, provides editing tools:
    - **Remove Background**: Uses `@imgly/background-removal` (client-side AI, no API key needed)
    - **Eraser**: Canvas-based eraser with adjustable brush size to manually erase parts of the image
    - **Background Color**: Color picker + apply to fill transparent areas with a solid color
    - **Undo**: Revert to previous state
    - **Checkerboard pattern** shows through transparent areas for visual feedback
  - Users can skip editing and use the cropped image directly
- Updated `ImageCropper.tsx` (kept for non-banner uses):
  - Added optional `lockedAspect` prop
  - When set, locks crop ratio, shows ratio info, hides crop mode buttons
  - Calculates proper initial crop dimensions on image load
- Updated all 3 banner display components to render `<video autoPlay muted loop playsInline>` for video banners:
  - `HotelBanner.tsx` (Default style)
  - `Sidebar.tsx` (Sidebar style)
  - `Compact.tsx` (Compact style)

**Files changed:**
- `src/lib/mediaUtils.ts` - New helper
- `src/components/BannerEditor.tsx` - New full banner image editor with crop, bg removal, eraser, bg color
- `src/components/ImageCropper.tsx` - Added `lockedAspect` prop (used for non-banner image crops)
- `src/components/admin-v2/settings/GeneralSettings.tsx` - Uses BannerEditor for banner uploads, video upload support
- `src/lib/emptyModule.ts` - Empty stub for bundler compatibility
- `next.config.ts` - Added webpack/turbopack aliases for onnxruntime-node/sharp
- `src/components/hotelDetail/styles/Default/HotelBanner.tsx` - Video support
- `src/components/hotelDetail/styles/Sidebar/Sidebar.tsx` - Video support
- `src/components/hotelDetail/styles/Compact/Compact.tsx` - Video support

**Impact on existing users:** None. Image banners continue to work as before. Video is a new option. The crop ratio is now locked to 1131:583 for new uploads but existing banners are unaffected.

---

## Issue #37 - Create Profile Section for User

**Status:** Implemented

**What was done:**
- Created `/user-profile` page with:
  - Name display with inline edit (saves via `updateUserFullNameMutation`)
  - Phone display with "Change Number" button (signs out + redirects to login)
  - Logout button
  - Orders grouped by store with store name, order count, and recent orders
  - Links to individual order pages
- Fixed hydration issue: page waits for Zustand store to hydrate before checking auth, shows loader instead of immediately redirecting to `/login`
- Added "Profile" tab to `BottomNav.tsx` for user role with `User` icon
- Added `user-profile` to known static routes in `Navbar.tsx` and `BottomNav.tsx`
- Updated `UserAvatar.tsx` dropdown: users now go to `/user-profile`, partners still go to `/profile`

**Files changed:**
- `src/app/user-profile/page.tsx` - New user profile page
- `src/components/BottomNav.tsx` - Added Profile nav item for users
- `src/components/Navbar.tsx` - Added `user-profile` to known routes
- `src/components/UserAvatar.tsx` - Profile link routing by role

**Impact on existing users:** None. Additive feature. The new `/user-profile` route only appears for logged-in users. Partner profile (`/profile`) is unchanged.

---

## Issue #18 - Add "Add Category" Flow with Manual Item Entry or AI Image Upload

**Status:** Already implemented (no changes needed)

The existing codebase already has the complete flow:
- `AdminV2Menu.tsx` has "Add Category" button (line 337-340)
- `AdminV2AddCategory.tsx` (1200+ lines) provides:
  - Category name input (required)
  - Manual item entry (name, price, description, image, veg/non-veg, variants, tags)
  - AI image upload using Google Gemini to extract items from menu photos
  - Editable extracted items
  - Prevents saving if no items added (`items.length === 0` check)
  - Progress tracking during save

---

## New Files Created

| File | Purpose |
|------|---------|
| `src/app/api/manifest/[username]/route.ts` | Dynamic per-partner web manifest |
| `src/app/user-profile/page.tsx` | User profile page |
| `src/components/admin-v2/AdminV2Billing.tsx` | Billing view with payment history |
| `src/lib/mediaUtils.ts` | Video URL detection utility |
