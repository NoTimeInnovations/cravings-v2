# Discount Code Feature

## Database Schema

Table: `discount_codes`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| partner_id | uuid | FK to partners |
| code | string | Unique code (e.g. "DIS1") |
| discount_type | "percentage" \| "flat" | Type of discount |
| discount_value | number | Percentage (e.g. 10) or flat amount (e.g. 50) |
| min_order_value | number \| null | Minimum order to use this code |
| max_discount_amount | number \| null | Cap for percentage discounts |
| usage_limit | number \| null | Max times code can be used (null = unlimited) |
| used_count | number | Current usage count |
| is_active | boolean | Admin toggle |
| expires_at | timestamp \| null | Expiry date (null = never) |
| created_at | timestamp | Creation date |

Discount is stored on the order in the `discounts` JSONB column as an array:
```json
[{ "code": "DIS1", "type": "percentage", "value": 10, "savings": 118.30 }]
```

## Key Files

| File | Purpose |
|------|---------|
| `src/api/discountCodes.ts` | GraphQL queries & mutations |
| `src/components/admin-v2/settings/DiscountCodeSettings.tsx` | Admin CRUD UI |
| `src/components/hotelDetail/placeOrder/PlaceOrderModal.tsx` | User-facing discount input + BillCard |
| `src/store/orderStore.ts` | placeOrder saves discount to DB |
| `src/components/admin-v2/OrderDetails.tsx` | Admin order detail (reads from DB) |
| `src/app/bill/[id]/page.tsx` | Printed bill/receipt (reads from DB) |
| `src/components/hotelDetail/OrderDrawer.tsx` | WhatsApp message with discount line |

## Discount Calculation Logic

### Core formula (in `computeDiscountSavings` — PlaceOrderModal)

```
itemsSubtotal = sum of (item.price * item.quantity) for all items

if percentage:
  savings = (itemsSubtotal * value) / 100
  if max_discount_amount: savings = min(savings, max_discount_amount)
if flat:
  savings = value

savings = min(savings, itemsSubtotal)   // never exceed subtotal
grandTotal = itemsSubtotal + GST + deliveryCharge + parcelCharge + qrExtraCharges - savings
```

**Important:** Discount is applied on the **item subtotal only** (sum of item prices), NOT on GST or extra charges.

### Where calculation happens

1. **PlaceOrderModal (BillCard)** — recalculates dynamically from `discount.type` and `discount.value` for live preview
2. **PlaceOrderModal (handlePlaceOrder)** — calls `computeDiscountSavings()` to get final `savings` value, passes it to `placeOrder()`
3. **orderStore.placeOrder** — uses `discounts.savings` directly for `grandTotal` stored in DB as `total_price`
4. **OrderDetails.tsx** — reads `order.totalPrice`, `order.gstIncluded`, and `discount.savings` from DB (no recalculation)
5. **bill/[id]/page.tsx** — reads `order.total_price`, `order.gst_included`, and `discount.savings` from DB (no recalculation)
6. **WhatsApp message** — reads `order.discounts` from store, recalculates discount for display text

### What gets stored in the DB (via orderStore.placeOrder)

- `total_price` = final grand total after discount
- `gst_included` = GST amount
- `discounts` = `[{ code, type, value, savings }]`
- `extra_charges` = `[{ name, amount, charge_type }]` (delivery, parcel, service charges)

## End-to-End Flow

### 1. Admin creates discount code
- `DiscountCodeSettings.tsx` → `createDiscountCodeMutation`
- Validates: code required, value > 0, percentage ≤ 100

### 2. User applies code at checkout
- `PlaceOrderModal` checks if partner has active codes via aggregate query
- Section only shown if `showDiscountSection && hasActiveCodes`
- `showDiscountSection` = feature flag check (`ordering.enabled` for QR, `delivery.enabled` for delivery)

### 3. Code validation (`handleApplyDiscount`)
- Calls `validateDiscountCodeQuery` — fetches active, non-expired codes matching partner + code
- Checks:
  - Code exists and is active
  - Not expired
  - Usage limit not reached (`used_count < usage_limit`)
  - Minimum order value met (compared against item subtotal `totalPrice`)
- On success: stores `{ id, code, type, value, max_discount_amount }` in state

### 4. Discount displayed in BillCard
- BillCard receives `{ type, value, max_discount_amount }` as prop
- Recalculates savings from current items/charges for live preview
- Shows green "Discount" line with negative amount

### 5. Order placed
- `handlePlaceOrder` calls `computeDiscountSavings(appliedDiscount)` for final savings
- Passes `{ code, type, value, savings }` to `placeOrder()` in orderStore
- orderStore computes `grandTotal = subtotal + gst + extraCharges - savings`
- Stores in DB: `total_price`, `gst_included`, `discounts`, `extra_charges`

### 6. Usage incremented
- After successful order: `incrementDiscountUsageMutation({ id })` increments `used_count`
- Fire-and-forget (`.catch(() => {})`)

### 7. Display in admin & receipts
- **OrderDetails.tsx**: Uses `order.totalPrice` directly from DB, `discount.savings` for discount line
- **bill/[id]/page.tsx**: Uses `order.total_price` directly from DB, `discount.savings` for discount line
- **WhatsApp**: Reads `order.discounts` from store, includes `*Discount:*` line in message

## API Queries & Mutations

### Validate code (user checkout)
```graphql
query ValidateDiscountCode($partner_id: uuid!, $code: String!) {
  discount_codes(where: {
    partner_id: { _eq: $partner_id },
    code: { _eq: $code },
    is_active: { _eq: true },
    _or: [
      { expires_at: { _is_null: true } },
      { expires_at: { _gt: "now()" } }
    ]
  }, limit: 1) {
    id, code, discount_type, discount_value, min_order_value,
    max_discount_amount, usage_limit, used_count
  }
}
```

### Increment usage (after order placed)
```graphql
mutation IncrementDiscountUsage($id: uuid!) {
  update_discount_codes_by_pk(pk_columns: { id: $id }, _inc: { used_count: 1 }) {
    id, used_count
  }
}
```

### Check active codes exist (show/hide section)
```graphql
query CheckActiveCodes($partner_id: uuid!) {
  discount_codes_aggregate(where: {
    partner_id: { _eq: $partner_id },
    is_active: { _eq: true },
    _or: [
      { expires_at: { _is_null: true } },
      { expires_at: { _gt: "now()" } }
    ]
  }) {
    aggregate { count }
  }
}
```

## Important Notes

- The `savings` field in the stored discount is the **pre-computed** amount at order time. Admin pages and bills read this directly — they do NOT recalculate.
- `total_price` in the DB is the final amount the customer pays. Admin and bill pages use this directly.
- The BillCard in PlaceOrderModal is the only place that recalculates dynamically (for live preview as user changes items).
- WhatsApp message reads from `useOrderStore.getState().order.discounts` after order is placed.
- Discount codes are case-insensitive (input is uppercased before validation).
