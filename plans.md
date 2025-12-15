# Plans Architecture & Implementation Guide

This document outlines how subscription plans are defined, stored, and enforced across the Cravings v2 application. The system relies on `src/data/plans.json` as the source of truth for plan definitions, while individual subscriptions are stored in the database.

## Source of Truth: `src/data/plans.json`

The `plans.json` file contains definitions for two main markets:
1. **International** (`international`): Plans like `int_free`, `int_standard`, `int_plus`.
2. **India** (`india`): Plans like `in_trial`, `in_digital`, `in_ordering`.

### Key Properties
- **`id`**: Unique identifier used to link database records to the plan definition.
- **`max_scan_count`**: The hard limit for QR scans/views per month.
  - Value `50`: Limited to 50 scans.
  - Value `-1`: Unlimited.
- **`features_enabled`**: (Optional) Flags to enable specific system capabilities (e.g., `ordering: true`).
- **`scan_limit`**: Legacy property, often checked as a fallback for `max_scan_count`.

---

## Implementation by Feature

### 1. Admin Dashboard Display
**File:** `src/components/admin-v2/SubscriptionStatus.tsx`

The admin dashboard displays the user's current usage against their plan's limit.

- **Limit Source**: It **does not** rely solely on the limit stored in the user's database record (`subscription_details`). Instead, it dynamically resolves the limit from `plans.json` using the plan ID.
- **Benefit**: Changing a limit in `plans.json` immediately updates the visualized limit for all users on that plan without a database migration.
- **Logic**:
  ```typescript
  // Resolves fresh plan data to ensure latest limits are used
  const jsonPlan = plansData.international.find(p => p.id === sub?.plan?.id) ...
  const scanLimit = jsonPlan?.max_scan_count ?? ...
  ```

### 2. QR Code Access Control
**File:** `src/app/qrScan/[[...id]]/page.tsx`

This page handles the actual customer interaction when scanning a QR code.

- **Dynamic Check**: The page performs a runtime check every time a QR code is scanned for International partners.
- **Logic Flow**:
  1. Fetches the partner's subscription details.
  2. Dynamically imports `plans.json` (`await import("@/data/plans.json")`).
  3. Finds the matching plan in the JSON.
  4. Queries Hasura for the **aggregate total scans** (`GET_PARTNER_TOTAL_SCANS`) for the partner.
  5. **Enforcement**:
     - If `current_scans >= max_scan_count` AND `max_scan_count !== -1`:
     - **Block Access**: Renders `<ScanLimitReachedCard />`.
     - **Allow Access**: Increments scan count and renders the menu.

### 3. Direct Hotel Link Access
**File:** `src/app/hotels/[...id]/page.tsx`

Similar to QR scans, accessing the menu via a direct URL is also subject to consumption limits.

- **Logic**: Implements the identical check as the QR Scan page.
- **Reasoning**: Prevents users from bypassing QR scan limits by simply sharing the direct URL.

### 4. New User Onboarding
**File:** `src/app/get-started/page.tsx`

When a new partner signs up, `plans.json` determines their starting state.

- **Selection**:
  - **India**: Defaults to `in_trial`.
  - **International**: Defaults to `int_free`.
- **Persistence**: The entire plan object from `plans.json` is copied into the `partners` table under the `subscription_details` column. This snapshots their plan at the time of signup.
- **Note**: While the snapshot exists in the DB, the *enforcement* logic (points 1, 2, 3) prefers the live `plans.json` values for limits.

---

## Modifying Plans

To change limits or features:
1. **Edit** `src/data/plans.json`.
2. **Deploy** the changes.
3. **Effect**:
   - **Immediately**: Users will see the new limits in their dashboard.
   - **Immediately**: The scan enforcement logic will respect the new limits.
   - **Future**: New signups will receive the updated plan snapshot.

---

## Monthly Scan Limit Enforcement
The system calculates usage to enforce "X scans per month" limits (e.g., 50 or 500 scans).

### Current Check Mechanism
**File:** `src/app/qrScan/[[...id]]/page.tsx` and `src/components/admin-v2/SubscriptionStatus.tsx`

1. **Aggregation**: The system calculates `currentTotalScans` by counting records in the `qr_scans` table that:
   - Belong to the partner (via `qr_code.partner_id`).
   - Were created within the current month (from `startOfMonth` to `endOfMonth`).

   ```graphql
   query GetPartnerMonthlyScans($partner_id: uuid!, $startDate: timestamptz!, $endDate: timestamptz!) {
     qr_scans_aggregate(where: {
       qr_code: { partner_id: {_eq: $partner_id} },
       created_at: {_gte: $startDate, _lte: $endDate}
     }) {
       aggregate { count }
     }
   }
   ```
2. **Limit Comparison**: This count is compared against the `max_scan_count` defined in `plans.json` (or the partner's subscription).

### Automatic Reset
- **Nature**: This method **does not** require an explicit reset or cron job.
- **Behavior**: As the month changes, the `startDate` and `endDate` variables shift, automatically resetting the count for the new period. The system essentially queries "how many scans have occurred *this month*?"


