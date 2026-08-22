# Order Push Payload

What MenuThere sends to a third‑party POS when a customer places an order.

This is not a proposal — it is the payload the platform emits today. It was
introduced for Petpooja and is delivered through a middleware service that maps
our fields onto the POS's own order API.

---

## Transport

```
POST  {POS_BACKEND_URL}/api/webhook/push-order
Content-Type: application/json
```

Body is the JSON object described below. A non‑2xx response is treated as a
failure (see **Delivery & retries**).

### When it fires

| Payment | When we push |
|---|---|
| Cash on delivery / pay at counter | Immediately, at order placement |
| Online (Cashfree / Razorpay) | **Only after payment is confirmed.** The payload is built at placement, stored on the order, and pushed by the payment finalizer once the gateway confirms |

An online order that is never paid is therefore **never pushed**. This is
deliberate: the kitchen should not see an order that may never be paid for.

---

## Delivery & retries

**The receiver must be idempotent on `id`.**

A failed push is retried. On failure we release our internal claim on the order
and return an error so the next trigger (payment webhook, customer return to the
site, or the reconcile cron) re‑attempts the same payload. The same `id` can
therefore arrive more than once, and the receiver must treat a repeat as the same
order rather than a new one.

`id` is a UUID and is stable across every retry of a given order.

---

## Top-level fields

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Our order id. **The idempotency key.** |
| `short_id` | string | First 8 chars of `id`. Convenience only. |
| `display_id` | string | Human-facing counter shown to the restaurant ("4"). Resets per partner — **not** unique. |
| `petpooja_restaurant_id` | string | The POS's own outlet identifier for this partner. |
| `partner_id` | uuid | Our partner id. |
| `status` | string | Always `"pending"` at push time. |
| `type` | string | `delivery` \| `takeaway` \| `dine_in`. |
| `created_at` | ISO 8601 | Order placement time (UTC). |
| `total_price` | number | **Final amount charged**, after discounts and loyalty, rounded to 2dp. |
| `gst_included` | number | Tax amount already included in `total_price`. |
| `payment_method` | string | `"cash"` = COD. `"cashfree"` = prepaid/online. See below. |
| `payment_status` | string | `"pending"` at push time. |
| `payment_details` | object \| null | Reserved. |
| `notes` | string \| null | Free-text customer note ("no onions"). Surface this to the kitchen. |
| `items` | array | See **Items**. |
| `discounts` | array | See **Discounts**. |
| `extra_charges` | array | See **Extra charges**. |

### Customer

| Field | Type | Notes |
|---|---|---|
| `user.phone` | string | `"N/A"` when unknown. |
| `user.full_name` | string \| null | |
| `phone` | string \| null | Duplicate of `user.phone` at top level. |
| `customer_name` | string \| null | Duplicate of `user.full_name`. |
| `user_id` / `orderedby` | uuid \| null | Our customer id. |

### Delivery (only when `type` is `delivery`)

| Field | Type | Notes |
|---|---|---|
| `delivery_address` | string \| null | Sanitised for printing. |
| `delivery_location` | GeoJSON Point \| null | `{ type: "Point", coordinates: [lng, lat] }` — **lng first**. |

### Dine-in

| Field | Type | Notes |
|---|---|---|
| `table_number` | number \| null | |
| `table_name` | string \| null | |
| `qr_id` | uuid \| null | The scanned table QR. |
| `captain_id` | uuid \| null | Set when a captain placed it. |

### Scheduled orders / reservations

| Field | Type |
|---|---|
| `scheduled_date` | string \| null |
| `scheduled_time` | string \| null |
| `scheduled_time_to` | string \| null |
| `booking_persons` | number \| null |

---

## Items

```jsonc
{
  "id":        "uuid",        // line id, unique per line
  "order_id":  "uuid",        // == top-level id
  "menu_id":   "uuid",        // our menu item id
  "quantity":  2,
  "created_at": "ISO 8601",

  "variant": { "id": "…", "name": "Large" } | null,

  "addons": [ … ] | null,     // see Add-ons

  "item": {
    "id":       "…",          // our line key: menuId | variant | optionIds
    "name":     "Chilly Gobi Paste",
    "price":    195,          // PRE-ADD-ON unit price — see below
    "pp_id":    "139279055",  // the POS's item id; null if unmapped
    "offers":   [],
    "category": { "id": "…", "name": "veg_items", … },
    "is_freebie": true        // only present on freebie lines
  }
}
```

### ⚠ `item.price` is the pre-add-on price

Add-ons are itemised **separately** in `addons`, so the item is sent at its
base/variant price with add-on cost removed.

```
item.price  +  Σ(addons[].price)   ==   charged unit price
```

Sending the all-in price and the add-on list would double-charge. The middleware
must map `addons` onto the POS's own add-on structure and use this de-baked
price. Items with no add-ons are unaffected (`addons` is `null`, price
unchanged).

### Add-ons

```jsonc
{
  "id":         "pp_addon_item_id"  | null,
  "name":       "Flax Seeds",
  "group_id":   "pp_addon_group_id" | null,
  "group_name": "Seeds (10 Gram)",
  "price":      6,
  "quantity":   1
}
```

`id` and `group_id` are the POS's own identifiers, carried from the menu mapping.
They are `null` when the add-on has not been mapped to the POS.

### Freebies

Discount-driven free items appear as ordinary lines with `item.is_freebie: true`.
Price them per the POS's own comp/freebie convention.

---

## Discounts

Array — may contain a coupon and/or a loyalty redemption.

```jsonc
{
  "code":               "HEALTH20",
  "type":               "percentage" | "flat" | "freebie",
  "value":              20,
  "savings":            82,       // actual amount taken off
  "pp_discount_id":     "…" | null,
  "description":        "…" | null,
  "max_discount_amount": 100 | null,
  "min_order_value":     299 | null,
  "discount_on_total":   true,
  "terms_conditions":    "…" | null,
  "discount_order_types": [ … ] | null,
  "valid_days":          [ … ] | null
}
```

Loyalty redemption arrives as a second entry with `code: "LOYALTY"`,
`type: "flat"`.

`total_price` is **already net of** every entry here. Treat `discounts` as
reporting detail, not something to subtract again.

---

## Extra charges

```jsonc
{ "id": "uuid", "name": "Round Off", "amount": 0.5, "charge_type": "FLAT_FEE" }
```

Delivery fees, packing charges and round-off arrive here. Like discounts, these
are **already reflected in** `total_price`.

---

## `payment_method` semantics

- `"cash"` — collect from the customer. Pushed at placement.
- `"cashfree"` — already paid online. Pushed only after the gateway confirms.

Both prepaid gateways (Cashfree and Razorpay) report as `"cashfree"`; the value
denotes *online*, not the specific processor. Do not map anything other than
`"cash"` to COD — treating every order as COD makes prepaid orders appear
unpaid to the restaurant.

---

## Live example

A real production order (customer details redacted).

```json
{
  "id": "75293526-b58b-4872-a724-46c73ed64aee",
  "short_id": "75293526",
  "display_id": "4",
  "petpooja_restaurant_id": "3zts02nc",
  "partner_id": "4f16a7cc-2dc6-4c1b-a76b-7dcbe6241ba9",
  "status": "pending",
  "type": "delivery",
  "created_at": "2026-07-31T06:05:23.916Z",
  "total_price": 410,
  "gst_included": 19.5,
  "payment_method": "cashfree",
  "payment_status": "pending",
  "payment_details": null,
  "notes": "Please make sure the cauliflower is cooked properly.",
  "user":          { "phone": "9XXXXXXXXX", "full_name": "Sample Customer" },
  "phone":         "9XXXXXXXXX",
  "customer_name": "Sample Customer",
  "user_id":   "838ff28d-0cda-43c2-b018-74c0d99ac2b3",
  "orderedby": "838ff28d-0cda-43c2-b018-74c0d99ac2b3",
  "delivery_address": "Thaikkattil house, P9RQ+X29, Mayannur, Kerala 679105, India",
  "delivery_location": { "type": "Point", "coordinates": [76.38769133594384, 10.743415022169202] },
  "table_number": null,
  "table_name": null,
  "qr_id": null,
  "captain_id": null,
  "scheduled_date": null,
  "scheduled_time": null,
  "scheduled_time_to": null,
  "booking_persons": null,
  "status_history": null,
  "discounts": [],
  "extra_charges": [
    { "id": "bbb5a4c1-ffba-4b0f-9e35-df0f083828ff", "name": "Round Off", "amount": 0.5, "charge_type": "FLAT_FEE" }
  ],
  "items": [
    {
      "id": "76f3d5fb-845e-4c00-bc1a-7670bcca5d85",
      "order_id": "75293526-b58b-4872-a724-46c73ed64aee",
      "menu_id": "6966d468-0a2f-4b15-a2c5-00be009a19c9",
      "quantity": 2,
      "variant": null,
      "addons": null,
      "created_at": "2026-07-31T06:05:23.916Z",
      "item": {
        "id": "6966d468-0a2f-4b15-a2c5-00be009a19c9",
        "name": "Chilly Gobi Paste",
        "price": 195,
        "pp_id": "139279055",
        "offers": [],
        "category": { "id": "25adc194-6be2-4d1a-a187-e07f8c918573", "name": "veg_items", "priority": 37, "is_active": true }
      }
    }
  ]
}
```

---

## Integration checklist

1. **Be idempotent on `id`.** Retries send the identical payload.
2. **Return 2xx only once the order is safely accepted.** A non‑2xx schedules a retry.
3. **Reconcile the money**: `item.price + Σ addons[].price` per unit; `total_price` is final and already net of `discounts` and inclusive of `extra_charges` and `gst_included`.
4. **Map `pp_id` / add-on `id` / `group_id`**, and decide the fallback when they are `null` (unmapped item).
5. **Honour `payment_method`** — do not treat prepaid orders as COD.
6. **Show `notes`** to the kitchen.
7. Expect **no push at all** for unpaid online orders.

## Open items for a non-Petpooja POS

- `petpooja_restaurant_id` is the outlet key; a new POS needs its own equivalent field or a mapping table.
- There is currently **no status callback** from the POS back to us (accepted / preparing / ready). Order status in MenuThere is driven by the restaurant dashboard, not the POS.
- There is **no cancellation or modification push** — a cancellation after push is handled out of band.
