# Delivery Pool integration (Cravings-v2 side)

Wires Cravings-v2 to the Menuthere **Delivery Pool** (`order-service`) as a new
delivery provider (`delivery_provider = "menuthere_pool"`), modeled on the existing
porter-bridge integration. **Safe by default**: every pool call is a no-op unless the
partner has the `delivery_pool-true` feature flag AND `DELIVERY_POOL_URL` is set.

## What's wired (this branch)
- **`src/lib/deliveryPool.ts`** — transport: POST order to the pool / cancel (HMAC-signed, env-gated). Returns delivery_order_id, tracking_url, pickup_otp, drop_otp, distance_km, delivery_fee.
- **`src/app/actions/deliveryPoolDispatch.ts`** — `dispatchDeliveryPool(orderId)` / `cancelDeliveryPoolDispatch(orderId)`: loads the order from Hasura, builds pickup/drop, calls the pool, and persists the response into `delivery_provider_*` (state `searching`, meta = tracking/otps/fee).
- **`src/store/orderStore.ts`** — `updateOrderStatus()` fires the pool on `accepted` and cancels on `cancelled`, gated by `features.delivery_pool` + real-delivery (same shape as delivery_agent / porter_bridge). Fire-and-forget.
- **`src/lib/getFeatures.ts`** — new `delivery_pool` feature flag (`delivery_pool-true`).
- **`src/app/api/webhook/delivery-pool/route.ts`** — inbound webhook; mirrors pool lifecycle (`delivery.created|status_changed|no_rider_found`) into `delivery_provider_state` (HMAC-verified when secret set).

## Env (`.env`)
```
DELIVERY_POOL_URL=http://localhost:4004                # order-service base (no trailing slash); prod: https://delivery.menuthere.com
DELIVERY_POOL_HMAC_SECRET=                             # = order-service INTEGRATION_HMAC_SECRET (leave blank in dev; pool skips HMAC)
DELIVERY_POOL_WEBHOOK_SECRET=                          # = order-service CRAVINGS_WEBHOOK_SECRET (verifies inbound webhook; blank = skip in dev)
```

## Per-restaurant config
- **Enable the pool**: add `delivery_pool-true` to the partner's `feature_flags`.
- **OTP toggles** (optional): `partners.delivery_rules` jsonb → `{ "pool_pickup_otp": true, "pool_drop_otp": true }`. Default off.

## Local test
1. Run the pool stack (order-service on :4004) + the rider app, with a rider online & linked to the test restaurant.
2. In cravings-v2 `.env`: set `DELIVERY_POOL_URL=http://localhost:4004` (leave the two secrets blank). On the pool side set `CRAVINGS_WEBHOOK_URL=http://localhost:3000/api/webhook/delivery-pool` so status flows back.
3. Add `delivery_pool-true` to the test partner's `feature_flags`.
4. Place a **delivery** order on that partner and mark it **accepted** in admin-v2.
5. Expect: the order appears in the pool (rider gets the offer); `orders.delivery_provider = "menuthere_pool"`, `delivery_provider_state` tracks `searching → assigned → … → delivered`; `delivery_provider_meta` holds `trackingUrl` + OTPs + fee.

## Follow-ups (UI surfacing — data already flows)
- Show `delivery_provider_meta.pickupOtp` on the partner OrderDetails (like the porter pickupPin); show `dropOtp` + `trackingUrl` to the customer on `/order/[id]`.
- Send the drop OTP to the customer via WhatsApp (the pool returns it; reuse the WhatsApp sender with a fixed code).
- Superadmin: OTP toggles UI in EditPartners; render the pool admin API (`GET {DELIVERY_POOL_URL}/delivery/v1/admin/{overview,orders,riders}`, server-side with `x-internal-key`) inside `/superadmin` — see `docs/CRAVINGS-V2-WIRING.md` in the pool repo.
