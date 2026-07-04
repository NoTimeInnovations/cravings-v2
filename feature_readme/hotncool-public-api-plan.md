# Public Partner API — Plan (hotncool)

Status: **PLAN / DESIGN** (not yet implemented). Target consumer: the **hotncool** team's own backend app.

**v1 scope (confirmed):** send WhatsApp **template** messages to their customers, behind an **API key + rate limiting**.
**Deferred (not in v1):** loyalty points (earn / redeem / balance). The loyalty design below is kept for when it's wanted — §3.2 is marked DEFERRED.

Decisions locked in (see §7): customer identity = **by phone**; security = **API key + rate limit** (HMAC signature + test-mode deferred to a later phase); loyalty = **skipped for now**.

This doc is the implementation plan + the basis for the public API reference docs.

---

## 1. Guiding principles

1. **Server-to-server only.** The API key is a secret that lives on hotncool's **backend**, never in their mobile/web client. No CORS is opened; no browser calls. (Our current Hasura admin secret is browser-exposed — the public API must be completely decoupled from it.)
2. **Auth-locked partner scope.** The API key maps to exactly one `partner_id`. The caller **never** passes `partner_id` in the body — it is derived from the key. A key can only ever read/write its own partner's data.
3. **Reuse the safe internals.** Sends go through the existing Graph payload builder + phone normalization + opt-out check + `whatsapp_message_logs`. Loyalty writes go through the existing signed ledger `appendTxn()` — the API never mutates balances directly.
4. **Idempotent by design.** Every mutating call accepts an idempotency reference so retries never double-send or double-credit.
5. **Fail closed.** Missing/invalid key, disabled feature, opted-out recipient, unverified template, or an integrity error → reject, never silently proceed.

---

## 2. Prerequisites (one-time, per partner)

Before any API call works, hotncool must exist as a normal partner in our system with:
- A row in `partners` (id, `username`, `country_code`, `currency`, `feature_flags`, `loyalty_settings`).
- A **connected WhatsApp number** (row in `whatsapp_business_integrations`, `is_primary=true`, valid `access_token`) — the number sends from their own WABA. No Menuthere fallback on the public API.
- **Approved templates** on their WABA (created via our Templates screen or their own Meta setup).
- `loyalty_points` feature `access=true` **and** `enabled=true` in `feature_flags`, plus a configured `loyalty_settings` JSON.
- An **issued API key** (see §4).

---

## 3. Endpoints (v1)

Base path: `/api/v1` (new versioned namespace). Auth: `Authorization: Bearer <api_key>` on every request. All responses JSON.

### 3.1 WhatsApp

**`POST /api/v1/whatsapp/send-template`** — send one approved template to one phone.
```jsonc
// request
{
  "to": "919876543210",            // phone; country code optional (defaults to partner country)
  "template_name": "order_update",
  "language": "en",                // BCP-47 / Meta language code, e.g. "en", "en_US"
  "body_params": ["Asha", "#1234"],// fills {{1}},{{2}} in BODY (in order)
  "header_params": ["Welcome"],    // optional, fills a TEXT header {{1}}
  "header_media_url": null,          // optional, for IMAGE/VIDEO/DOCUMENT header templates
  "button_params": [],               // optional, dynamic URL button vars
  "idempotency_key": "hnc-8f3a..." // optional; de-dupes retries for a short window
}
// 200
{ "ok": true, "message_id": "wamid.HBg...", "to": "919876543210", "status": "sent" }
// 4xx/5xx
{ "ok": false, "error": "recipient_opted_out" | "template_not_approved" | "invalid_number" | "send_failed", "detail": "..." }
```
Behavior: normalize `to` → check partner opt-out list (`whatsapp_broadcast_optouts`) → build Graph `template` payload from params → send from the partner's **primary** connected number + token → log to `whatsapp_message_logs` (partner_id, template_name, status, meta_message_id, `sent_from_phone_number_id`). Enforce the number's Meta daily tier cap (per-number `countSentToday`).

**`GET /api/v1/whatsapp/templates`** — list the partner's approved templates (so hotncool's app knows valid `template_name` + variable counts).
```jsonc
{ "templates": [ { "name": "order_update", "language": "en", "category": "UTILITY", "status": "APPROVED", "body_variables": 2, "has_header": true } ] }
```

### 3.2 Loyalty — DEFERRED (not in v1)

> Skipped for the first release per product decision. The full design is retained below so it can be built later without re-discovery. When picked up, it needs the `external_ref` idempotency migration (§4.3) since hotncool's orders live in their system, not ours.

_(customer-addressed by **phone**)_

**`GET /api/v1/loyalty/balance?phone=919876543210`**
```jsonc
{ "phone": "9876543210", "balance": 340, "value": 340, "currency": "₹",
  "lifetime_earned": 1200, "lifetime_redeemed": 860,
  "settings": { "point_value": 1, "min_redeem_points": 1, "max_redeem_percent": 100, "earn_percent": 2 } }
```
No customer auth needed — the API key + partner scope authorizes reading that partner's loyalty for any phone. (If the account doesn't exist yet, return zeros.)

**`POST /api/v1/loyalty/earn`** — credit points.
```jsonc
// request — either give explicit points, OR an amount to compute from partner earn_percent
{ "phone": "919876543210", "points": 50,            // explicit
  // "amount": 2500,                                  // OR compute: floor(amount*earn_percent/100/point_value)
  "reference": "hnc-order-8842",                      // REQUIRED for idempotency (their order/txn id)
  "note": "Order #8842", "notify": true }             // notify=send loyalty WhatsApp msg if configured
// 200
{ "ok": true, "points_added": 50, "balance": 390, "value": 390, "duplicate": false }
```
Idempotent on `(partner_id, reference, type=earn)` — a repeat call returns the original result with `"duplicate": true`, never double-credits.

**`POST /api/v1/loyalty/redeem`** — debit points (returns the ₹ discount value hotncool applies in their checkout).
```jsonc
// request
{ "phone": "919876543210", "points": 100,
  "bill_amount": 800,          // optional; enforces max_redeem_percent cap on the bill
  "reference": "hnc-order-8842", "note": "Redeemed at checkout", "notify": true }
// 200
{ "ok": true, "points_redeemed": 100, "value": 100, "balance": 290, "duplicate": false }
// 4xx
{ "ok": false, "error": "insufficient_balance" | "below_min_redeem" | "account_flagged", "detail": "..." }
```
Clamps requested points to `min(balance, bill×max_redeem_percent, ≥min_redeem_points)`. Idempotent on `(partner_id, reference, type=redeem)`.

**`POST /api/v1/loyalty/refund`** *(optional, phase 2)* — reverse a redeem when hotncool's order fails/cancels (restores the redeemed points). Idempotent per `reference`.

**`GET /api/v1/loyalty/history?phone=...&limit=50`** *(optional)* — the customer's ledger for that partner.

> All loyalty writes flow through the existing signed ledger (`appendTxn`) so hash-chaining, tamper detection, and concurrency (seq retry) are inherited unchanged. Points are keyed to the **global phone-user** scoped to hotncool's `partner_id`, so a phone's hotncool balance is isolated from other partners.

---

## 4. Auth & security (new infrastructure to build)

### 4.1 `partner_api_keys` table
```sql
CREATE TABLE public.partner_api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name          text NOT NULL,                 -- "hotncool prod"
  key_prefix    text NOT NULL,                 -- first 8 chars, shown in UI/logs
  key_hash      text NOT NULL,                 -- sha256 of the full key (never store plaintext)
  scopes        text[] NOT NULL DEFAULT '{whatsapp,loyalty}',
  rate_per_min  int NOT NULL DEFAULT 120,
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX partner_api_keys_key_hash_key ON partner_api_keys(key_hash);
```
- Key format: `ck_live_<32 random bytes base62>`. Shown **once** at creation; we store only the sha256 hash + prefix.
- Validation helper `requirePartnerApiKey(req)`: parse Bearer → sha256 → lookup by `key_hash` (server client only) → reject if missing/revoked → return `{ partnerId, scopes, keyId }`. Constant-time compare. Update `last_used_at` (throttled).
- Issuance: a small server-side script/superadmin action (never a public endpoint). Optional later: a key-management panel in admin-v2.

### 4.2 Rate limiting
Serverless (no in-process state survives), so use a **durable** counter:
- **Send caps:** reuse the per-number Meta tier + `countSentToday(partnerId, phoneNumberId)` (already exists) → 429 when the number's daily tier is exhausted.
- **Request rate:** a lightweight fixed-window counter table `api_rate_counters(key_id, window_start, count)` (or Upstash Redis if we want a proper sliding window). Reject with `429` + `Retry-After` past `rate_per_min`.
- **Per-recipient anti-spam:** cap messages/hour to a single phone (protects hotncool's Meta quality rating).

### 4.3 Idempotency + audit
- `Idempotency-Key` header (sends) / `reference` field (loyalty) → dedupe. For loyalty, add:
  ```sql
  ALTER TABLE loyalty_transactions ADD COLUMN external_ref text;
  CREATE UNIQUE INDEX loyalty_txn_partner_ref_type_key
    ON loyalty_transactions(partner_id, external_ref, type) WHERE external_ref IS NOT NULL;
  ```
  `appendTxn` gains an `externalRef` param; a conflict → return the existing txn (`duplicate:true`).
- `partner_api_logs(id, key_id, partner_id, method, path, status, ip, ref, created_at)` — audit every call (fire-and-forget). Sends already log to `whatsapp_message_logs`; loyalty already logs to the ledger with `created_by = 'api:hotncool'`.

### 4.4 Hardening checklist
- All Hasura calls via `hasuraServerClient` (server-only secret) — **never** the `NEXT_PUBLIC_*` admin client.
- No CORS headers (server-to-server). Reject browser `Origin` if desired.
- Optional **HMAC body signature** (`X-Signature: sha256=...` over raw body + timestamp using a per-key signing secret) for extra integrity on mutating calls — recommend for loyalty in phase 2.
- Optional **IP allowlist** column on the key.
- Optional **test mode**: a `ck_test_...` key flag that no-ops external effects (no real WhatsApp send / marks ledger rows test) so hotncool can integrate safely.

---

## 5. Reuse map (what we lean on vs. build)

| Concern | Reuse (exists) | Build (new) |
|---|---|---|
| Graph template payload | `send/route.ts` component builder | extract to `lib/whatsappSend.ts` |
| Phone normalization | `normalizePhone` / `toLocalPhone` | accept partner country code |
| Opt-out check | `getPartnerOptOuts` / `whatsapp_broadcast_optouts` | call before send |
| Send number/token | `getPartnerWabaIntegration` (primary) + `partnerWabaToken` | drop Menuthere fallback |
| Daily cap | `countSentToday(partnerId, pnid)` + Meta tier | 429 on exhaustion |
| Loyalty write | `appendTxn` (signed ledger) | `externalRef` idempotency |
| Loyalty config/gate | `loadPartnerLoyalty`, `parseLoyaltySettings`, `pointsToValue`, `computeMaxRedeemable` | earn-by-amount option |
| Customer identity | `findOrCreateUserByPhone`, `getOrCreateAccount(user,partner)` | phone→user resolution in API |
| Loyalty→WhatsApp notify | `loyalty_transactions` INSERT trigger → `flows/loyalty-event` | `notify` flag reuses it |
| Auth | — | `partner_api_keys` + `requirePartnerApiKey` |
| Rate limit / audit | — | counters + `partner_api_logs` |

---

## 6. Build phases

**v1 (now):**
- **Phase 0 — Foundation:** `partner_api_keys` table + `requirePartnerApiKey` helper + `/api/v1` scaffolding + rate-limit counter + `partner_api_logs` + key-issuance script.
- **Phase 1 — WhatsApp:** extract the send core to a shared lib; `POST /whatsapp/send-template` (+ opt-out, logging, tier cap); `GET /whatsapp/templates`.
- **Phase 2 — Docs & DX:** public API reference (this doc → polished), curl examples, error table, `Idempotency-Key`/rate-limit/opt-out guidance. Optional: admin-v2 key-management UI.

Rough size: Phase 0 ~0.5 day, Phase 1 ~0.5–1 day, Phase 2 ~0.5 day → **~1.5–2 days total for v1.**

**Later (deferred):**
- **Loyalty:** `external_ref` migration + `appendTxn` idempotency; `GET /loyalty/balance`, `POST /loyalty/earn`, `POST /loyalty/redeem` (+ optional `refund`, `history`).
- **Security hardening:** HMAC body signature, `ck_test_` sandbox/test mode.

---

## 7. Decisions

**Resolved:**
- Customer identity: **by phone** (global phone-user scoped to their partner). ✔
- Security v1: **API key + rate limiting**; HMAC signature + test mode **deferred**. ✔
- Loyalty (earn/redeem/balance) + loyalty notifications: **skipped for v1**, deferred. ✔

**Still worth confirming (don't block v1):**
1. **Inbound/webhooks to them:** do they need delivery-status / customer-reply callbacks to a hotncool webhook, or is fire-and-forget send enough for v1? (Assume fire-and-forget.)
2. **Volume & rate limits:** expected sends/day + burst, to size the per-key rate limit (default 120/min) and confirm their Meta tier covers it.
3. **Billing:** sends go out on **their** WABA (they pay Meta directly); our `whatsapp_message_logs` cost tracking stays informational. (Assume yes.)
4. **Prereqs ready?** hotncool exists as a partner with a connected WABA + approved templates (see §2).

---

## 8. Explicitly out of scope (v1)
- Bulk/batch endpoints (one send / one loyalty op per call).
- Point expiry (ledger has none today).
- Cross-partner point transfer.
- A hotncool-branded admin dashboard (they use their own app).
- Moving Hasura to JWT/row-level security (tracked separately in SECURITY-admin-secret-migration.md).
