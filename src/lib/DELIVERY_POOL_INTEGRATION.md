# Delivery Pool integration (Cravings-v2 side)

This branch adds **`src/lib/deliveryPool.ts`** — the hook that hands a ready order to
the Menuthere **Delivery Pool** (`order-service`). It is intentionally **not yet wired**
into the order flow so it can be reviewed/verified before touching production paths.

## 1. Env (add to `.env`)
```
DELIVERY_POOL_URL=https://delivery.menuthere.com      # order-service base (no trailing slash)
DELIVERY_POOL_HMAC_SECRET=<shared secret>             # must equal order-service INTEGRATION_HMAC_SECRET
```
With `DELIVERY_POOL_URL` unset, every call is a **no-op** — safe to merge before the
Delivery Pool is live.

## 2. Where to call it
When an order is confirmed/ready for a **pool-enabled** restaurant, fire-and-forget:

```ts
import { notifyDeliveryPoolOrderReady } from "@/lib/deliveryPool";

// inside the order-confirmation server action, after the order row exists:
void notifyDeliveryPoolOrderReady({
  source_order_id: order.id,
  restaurant_id: order.partner_id,            // restaurant/partner id
  pickup: { lat: restaurant.lat, lng: restaurant.lng },
  drop:   { lat: order.delivery_lat, lng: order.delivery_lng },
  drop_address: order.delivery_address,
  customer: { name: order.customer_name, phone: order.customer_phone },
  items_summary: order.items,
  order_value: order.total,
  assignment_mode: "manual",                  // or "auto" once auto-dispatch (P3) ships
});
```

On cancellation:
```ts
import { cancelDeliveryPoolOrder } from "@/lib/deliveryPool";
void cancelDeliveryPoolOrder(order.id, "cancelled_by_customer");
```

## 3. Status callbacks (Delivery Pool → Cravings-v2)
The Delivery Pool POSTs `delivery.status_changed` events back to
`CRAVINGS_WEBHOOK_URL` (HMAC-signed with `CRAVINGS_WEBHOOK_SECRET`). Add a webhook
route to update the order's delivery status and notify the partner app. Contract:
`{ event, source_order_id, delivery_order_id, status, rider?, occurred_at }`.

> Gate the call behind the restaurant's pool opt-in flag so only pool restaurants
> are dispatched. Keep it `void`-ed / try-safe so it can never block order placement.
