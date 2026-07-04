# Cravings Partner API — v1

A small HTTP API for sending **WhatsApp template messages** to your customers through your connected WhatsApp Business number on Cravings.

> **Server-to-server only.** Your API key is a secret — keep it on your **backend**. Never ship it in a mobile/web app or call these endpoints from a browser.

---

## Base URL

```
https://menuthere.com
```
(Confirm your assigned base URL with the Cravings team.)

All endpoints are under `/api/v1`.

---

## Authentication

Send your API key as a Bearer token on **every** request:

```
Authorization: Bearer ck_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

- The key identifies **your account** — you never pass an account/partner id; you can only act on your own data.
- Keys are issued by the Cravings team and shown **once**. Store it securely; if lost, we rotate it.
- Requests without a valid key get `401`.

---

## Conventions

- **Content type:** `application/json` for request bodies. All responses are JSON.
- **Phone numbers:** digits, with or without the country code (e.g. `919876543210` or `9876543210`). If you omit the country code, your account's default country is applied. No `+`, spaces, or dashes needed — we normalize.
- **Success:** HTTP `200` with `{ "ok": true, ... }`.
- **Errors:** non-2xx with `{ "ok": false, "error": "<code>", "detail": "<human message>" }`.
- **Which number sends:** messages always go out from the **default** WhatsApp number configured on your Cravings account (Integration settings). You do not choose it per request.

### Rate limits
Each key is limited to **120 requests/minute** by default (tell us if you need more). Over the limit → `429 rate_limited`. Sending is additionally bounded by your WhatsApp number's Meta daily messaging tier → `429 daily_limit_reached` when exhausted.

### Idempotency
For sends, pass a unique `id` (your message/order reference). Retrying with the same `id` returns the original result (`"duplicate": true`) instead of sending again — safe for network retries.

---

## Endpoints

### 1. Send a template message

`POST /api/v1/whatsapp/send-template`

Sends one **approved** WhatsApp template to one customer.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `to` | string | ✔ | Customer phone (with/without country code). |
| `template_name` | string | ✔ | Exact approved template name (see endpoint 2). |
| `language` | string |  | Template language code (e.g. `en`, `en_US`). **Optional** — auto-detected from your approved template when omitted. |
| `body_params` | string[] |  | Fills `{{1}}, {{2}}, …` in the template BODY, in order. |
| `header_params` | string[] |  | Fills a `{{1}}` in a TEXT header. |
| `header_media_url` | string |  | Public URL for an IMAGE/VIDEO/DOCUMENT header. |
| `header_media_type` | string |  | `image` \| `video` \| `document` (with `header_media_url`). |
| `button_params` | string[] |  | Values for a dynamic URL button. |
| `id` | string |  | Your unique reference for this message; de-dupes retries (idempotency). |

**Example**
```bash
curl -X POST https://menuthere.com/api/v1/whatsapp/send-template \
  -H "Authorization: Bearer ck_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "919876543210",
    "template_name": "order_update",
    "body_params": ["Asha", "#1234"],
    "id": "order-1234-confirmed"
  }'
```

**Success `200`**
```json
{ "ok": true, "message_id": "wamid.HBgM...", "to": "919876543210", "status": "sent" }
```

**Errors**

| HTTP | `error` | Meaning |
|---|---|---|
| 400 | `missing_fields` | `to` or `template_name` missing. |
| 400 | `invalid_number` | Phone couldn't be parsed. |
| 400 | `invalid_json` | Body wasn't valid JSON. |
| 404 | `template_not_found` | No approved template of that name on your default number (when `language` was omitted). |
| 400 | `template_error` | Meta rejected the template (name/language/params mismatch, not approved). `detail` has Meta's reason. |
| 409 | `in_progress` | A request with the same `id` is still processing. |
| 409 | `recipient_opted_out` | Customer replied STOP; we won't message them. |
| 412 | `no_whatsapp_number` | No default WhatsApp number connected on your account. |
| 429 | `rate_limited` | Per-key request rate exceeded. |
| 429 | `daily_limit_reached` | Your number's Meta daily send limit is used up today. |
| 401 | `missing_api_key` / `invalid_api_key` | Auth failed. |
| 403 | `scope_denied` | Key not permitted for WhatsApp. |
| 502 | `send_failed` | Couldn't reach WhatsApp; safe to retry. |

---

### 2. List your templates

`GET /api/v1/whatsapp/templates`

Returns your **approved** templates on the default number's WhatsApp account, so you know valid `template_name`s and how many variables each expects.

**Example**
```bash
curl https://menuthere.com/api/v1/whatsapp/templates \
  -H "Authorization: Bearer ck_live_xxx"
```

**Success `200`**
```json
{
  "ok": true,
  "templates": [
    { "name": "order_update", "language": "en", "category": "UTILITY",
      "status": "APPROVED", "body_variables": 2, "has_header": true, "header_format": "TEXT" }
  ]
}
```

---

## Notes & good practices

- **Templates must be approved** on your WhatsApp account before they can be sent. Create/manage them in the Cravings admin (WhatsApp → Templates) and wait for Meta approval.
- **Opt-outs are enforced automatically.** If a customer replies `STOP`, further sends to them return `409 recipient_opted_out` until they reply `START`.
- **Billing:** messages are sent on your own WhatsApp Business account, so Meta bills you directly per their pricing.
- **Retries:** on `502`/timeout, retry with the same `idempotency_key` — you won't double-send.
- **Sending window:** WhatsApp only allows business-initiated messages via approved **templates** (which this API sends). Free-form text isn't supported here.

---

## Changelog
- **v1** — WhatsApp template send + template listing. (Loyalty points endpoints planned for a later version.)
