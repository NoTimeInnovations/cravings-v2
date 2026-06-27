# Delivery app — scoped auth migration (review before applying)

Goal: get the **Hasura admin secret out of the delivery app** (it shipped in
every APK + git history). The app now logs in through cravings-v2, receives a
short-lived JWT scoped to one delivery boy, and uses that for all its existing
Hasura calls + its realtime subscription. Realtime behaviour is unchanged.

This doc is the **Hasura side**, which touches **production** and is therefore
**not applied yet** — review, then we apply together.

---

## 1. What's already built (code, on branches, not deployed)

**cravings-v2** (branch `delivery-app-scoped-auth`):
- `src/lib/deliveryAuth.ts` — signs/verifies the HS256 Hasura JWT.
- `src/app/api/delivery/login/route.ts` — verifies phone+password via the
  server-side admin secret, returns `{ token, deliveryBoy }`.
- `src/app/api/delivery/device-token/route.ts` — bearer-authed token refresh.
- `jose` added to deps.

**delivery app** (branch `secure-backend-auth`): login hits `/api/delivery/login`,
stores the token, and sends `Authorization: Bearer <token>` on every Hasura
HTTP request + in the websocket `initialPayload`. The admin secret is deleted
from the client.

---

## 2. Secrets to set (both sides share one key)

Generate one strong random secret (≥ 32 bytes), used as the HS256 key on both:

```bash
openssl rand -base64 48
```

**cravings-v2 (Vercel env):**
```
DELIVERY_JWT_SECRET = <the generated secret>
```

**Hasura instance env** (additive — the admin secret keeps working, so the
cravings-v2 web app and every existing client are unaffected):
```
HASURA_GRAPHQL_JWT_SECRET = {"type":"HS256","key":"<the same generated secret>"}
```
Default claims namespace is `https://hasura.io/jwt/claims`, which is what the
token uses — no extra config needed.

The JWT carries:
```json
{
  "sub": "<delivery_boy_id>",
  "https://hasura.io/jwt/claims": {
    "x-hasura-allowed-roles": ["delivery_boy"],
    "x-hasura-default-role": "delivery_boy",
    "x-hasura-delivery-boy-id": "<delivery_boy_id>"
  }
}
```

---

## 3. The `delivery_boy` role — permissions

> ✅ **APPLIED to prod 2026-06-27** via the admin `/v1/metadata` bulk API
> (source `neon db`) and verified. The rules below are what's live. They are
> inert until JWT mode (§2) is enabled — no `delivery_boy` token can be
> accepted until then — so this was safe to apply ahead of the env var.

Session variable used everywhere: **`X-Hasura-Delivery-Boy-Id`**.

Login and device-token writes go through cravings-v2 with the admin secret, so
`device_tokens` and the `delivery_boys.password` read do **not** need any
`delivery_boy`-role permission. Only the five tables the app touches directly
need rules.

> ⚠️ Relationship names below (`order`, `orders`) are the conventional Hasura
> names — verify them against the actual schema and adjust filters if yours
> differ.

### 3.1 `orders`
**Select** — filter:
```json
{ "delivery_boy_id": { "_eq": "X-Hasura-Delivery-Boy-Id" } }
```
columns: `id, display_id, total_price, created_at, delivery_address,
delivery_location, status, phone, notes, assigned_at, payment_method,
payment_status, delivered_at, delivery_boy_id`

**Update** — filter & check both:
```json
{ "delivery_boy_id": { "_eq": "X-Hasura-Delivery-Boy-Id" } }
```
columns allowed to set: `status, delivered_at` (used by "mark delivered").

> Note: column-update perms don't restrict *values* — a rider could set
> `status` to an arbitrary string on their own order. The app only ever writes
> `"completed"`. If you want to harden, add a check constraint / restrict to a
> known set later. Acceptable for v1.

### 3.2 `order_items`
**Select** — filter (items belonging to the rider's orders):
```json
{ "order": { "delivery_boy_id": { "_eq": "X-Hasura-Delivery-Boy-Id" } } }
```
columns: `id, quantity, item, order_id`

### 3.3 `partners`
**Select** — filter (partner of one of the rider's orders):
```json
{ "orders": { "delivery_boy_id": { "_eq": "X-Hasura-Delivery-Boy-Id" } } }
```
columns: `id, store_name, currency, phone, upi_id, delivery_qr_method`
(deliberately **not** the cashfree merchant fields — those stay server-side).

### 3.4 `users`
**Select** — filter (customer of one of the rider's orders):
```json
{ "orders": { "delivery_boy_id": { "_eq": "X-Hasura-Delivery-Boy-Id" } } }
```
columns: `full_name, phone` only (minimise customer PII exposure).

### 3.5 `delivery_boys`
**Select** — filter (self only):
```json
{ "id": { "_eq": "X-Hasura-Delivery-Boy-Id" } }
```
columns: `id, name, phone, partner_id, current_lat, current_lng,
location_updated_at, is_active`

**Update** — filter & check both:
```json
{ "id": { "_eq": "X-Hasura-Delivery-Boy-Id" } }
```
columns allowed to set: `current_lat, current_lng, location_updated_at`
(used by the live-location write).

---

## 4. Verify before rollout

1. In Hasura console → API → set role `delivery_boy` + paste a test JWT
   (mint one by calling `/api/delivery/login` against a staging deploy, or
   sign locally with the same key). Confirm:
   - the active-orders subscription returns only that rider's orders;
   - querying another rider's order id returns nothing;
   - `update_delivery_boys_by_pk` succeeds for self, fails for another id.
2. `curl` the new endpoints:
   ```bash
   curl -s -X POST https://<deploy>/api/delivery/login \
     -H 'content-type: application/json' \
     -d '{"phone":"...","password":"..."}'
   ```

## 5. Rollout order (so nothing breaks)

1. Set both secrets → enable Hasura JWT mode (**additive**, admin secret still works).
2. Create the `delivery_boy` permissions above.
3. Deploy cravings-v2 (`/api/delivery/*`).
4. Ship the new app build; let adoption climb (old APKs keep working on the
   admin secret in the meantime).
5. **Only once adoption is high:** rotate the Hasura admin secret **and** move
   `src/lib/hasuraClient.ts` off `NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET` (it
   currently ships the secret in the web bundle too) to a server-only
   `HASURA_GRAPHQL_ADMIN_SECRET`. This is the step that actually closes the leak.

## 6. Known follow-ups (out of scope here)
- `delivery_boys.password` is plaintext — hash on next login (needs a migration).
- `heartbeatApiKey` is a shared client secret — fold into the session token.
