# WhatsApp Business Catalogue — implementation plan

Shape **A**: the customer browses and carts **inside WhatsApp**, then hands off to
the existing storefront checkout. Opt-in per partner behind a feature flag.

## Decisions already made

| | |
|---|---|
| Scope | New partners only, behind a per-partner feature flag. Not a platform default. |
| Variants / add-ons | **Excluded.** One catalogue product per `menu` row. |
| Images | Partner-supplied. Items without one are skipped, not placeholdered. |
| Checkout | Stays on the storefront. Catalogue is a browse + cart surface only. |

This removes the three constraints that made a general rollout ugly: the 32
partners sharing one WABA are out of scope, the 37,196 image-less items are out of
scope, and the 8,899 variant items need no flattening.

## Why Shape A is safe

The handoff already exists. `buildOrderLink` supports `&ro=<base64url JSON>`
(`src/lib/whatsappFlow/orderLink.ts:191`), and `ReorderHandler`
(`src/components/hotelDetail/ReorderHandler.tsx:60-105`) decodes it into
`{ menuId, quantity }` lines, resolves each against the **current** menu, rebuilds
the cart and opens checkout.

Two properties fall out of that, and they are the reason this shape is worth
building before the full in-WhatsApp cart:

- **Pricing cannot drift.** The catalogue price is a display value. The charge is
  recomputed from the live menu at checkout, so a stale catalogue entry produces a
  stale *listing*, never a wrong bill. Delivery radius, distance fee, GST, parcel
  charges, offers, the per-order offer cap, loyalty, stock and prebooking all keep
  working because none of them move.
- **`retailer_id` is our own uuid**, so an inbound cart maps back with a plain
  `where id in (...)`. No SKU table, no fuzzy matching.

## Mapping

One catalogue product per live `menu` row.

| Catalogue field | Source |
|---|---|
| `retailer_id` | `menu.id` — load-bearing; the `order` webhook returns it verbatim |
| `name`, `description` | `menu.name`, `menu.description` |
| `price`, `currency` | `deliveryBasePrice(menu)` + partner currency — see below |
| `image_url` | `menu.image_url` (required; skip the row if absent) |
| `availability` | `is_available` and stock → `in stock` / `out of stock` |
| `url` | storefront deep link for the item |

**Price.** A catalogue product holds one number and `price` != `delivery_price`
for 235 partners. Use `deliveryBasePrice()` from `src/lib/deliveryPricing.ts` —
catalogue orders are remote by nature, and that helper already treats a `0` as
"not set", so a `delivery_price: 0` item cannot list at ₹0.

## Build order

### 1. Flag + schema

- `whatsappcatalog` in `src/lib/getFeatures.ts`, `{ access, enabled }`, default off.
- `partners.wa_catalog_id text` — the Meta catalog id.
- A sync-state column or small log table, so a failed push is visible instead of
  silent.

⚠ Reload Hasura metadata after the DDL. A column missing from the metadata passes
`tsc` and `next build` and only fails at runtime.

### 2. Catalog provisioning

On flag enable: create the catalog under the partner's Business Portfolio, connect
it to their WABA, store the id. One-time, superadmin-triggered.

### 3. Menu → catalogue sync

Batch API push, driven off whatever writes `menu` — **not** the admin UI. The 46
Petpooja partners re-sync their menu from the POS, so a UI-level hook would miss
every change they make.

Triggers: item create / update / soft-delete, availability toggle, stock reaching
zero, plus a nightly reconcile so drift cannot accumulate unnoticed.

Skip rows with no image and surface the count in the admin ("12 items are not in
your WhatsApp catalogue — add photos"), rather than pushing a placeholder or
failing the whole batch.

### 4. Send path

Multi-Product / Catalog messages from the flow engine, using the existing
per-number send. The catalogue replaces the plain "here is our menu link" reply
with real dishes, photos and prices in-thread.

### 5. Receive path — the piece that does not exist today

The webhook handles `text | interactive | button | image | audio | document |
location | sticker | video | contacts`. It has **no `order` case**, and a
catalogue with cart enabled *will* produce them.

In Shape A the handler is thin and must not be skipped: decode
`order.product_items[]`, map `product_retailer_id` → `menu.id`, build the `ro`
payload, and reply with an order link carrying the customer's cart. A customer who
builds a cart and gets silence is worse than never having shown them a catalogue.

This is also the natural seam for Shape B later: the same handler stops handing
off and starts placing the order.

## Status — measured on oreodemo, 2026-08-01

Everything below was run against the real account, not reasoned about.

| | |
|---|---|
| Catalogue scopes via Embedded Signup | ❌ **impossible.** A freshly reconnected token is `type=SYSTEM_USER` with only `whatsapp_business_management`, `whatsapp_business_messaging`, `whatsapp_business_manage_events`, `public_profile`. Adding the Catalog API use case to the app does not change it — the use case governs what the APP may request, ES governs what the TOKEN carries. |
| Catalogue under our own portfolio | ✅ works. System user with `catalog_management` on business `1349187156965445`. |
| Catalogue created for oreodemo | ✅ `1425080372783453` |
| Menu → products | ✅ 123 of 123 pushed, 0 failed, 0 skipped |
| Price encoding | ✅ **minor units confirmed.** Sent `18000`, Meta stored `₹180.00`. The assumption flagged in whatsappCatalog.ts was right. |
| Cart + catalogue visible on the number | ✅ `POST {phone_number_id}/whatsapp_commerce_settings` → `{is_cart_enabled: true, is_catalog_visible: true}` |
| Catalogue ↔ WABA link | ❌ `{waba_id}/product_catalogs` → **(#10) This operation can not be performed on SMB business type** — on **GET as well as POST**, with both tokens. |

So the only remaining blocker is the association itself. Everything either side of
it works.

### What `(#10)` actually is — measured, not inferred

An earlier version of this doc blamed the portfolio type. That was wrong, and the
correction matters because it points at a different fix.

oreodemo's WABA and our catalogue are on the **same** portfolio, and it is
verified:

```
WABA 937342682667160  owner=1349187156965445 "Menuthere Test 2"  on_behalf_of type=SELF
catalog 1425080372783453  business=1349187156965445 "Menuthere Test 2"  verified
```

The real discriminator is the **phone number**, not the business:

```
phone 1203546912837921  platform_type=CLOUD_API  is_on_biz_app=TRUE
```

`is_on_biz_app: true` means the number is simultaneously live in the WhatsApp
Business **app** on a handset — coexistence. For those numbers WhatsApp owns the
catalogue surface itself (it is the app's on-device catalogue, edited on the
phone), so Meta closes the Cloud API edge entirely. A *read* being refused is the
proof: this is not a permission we can be granted.

Confirmed against the one non-coexistence number in the fleet — same app, same
call, same day:

| partner | `is_on_biz_app` | `GET {waba}/product_catalogs` |
|---|---|---|
| oreodemo | `true` | `(#10) SMB business type` |
| flaminhotchicken | `false` | `{"data": []}` — edge open |

### Fleet exposure

95 distinct connected numbers: **89 coexistence, 1 not, 5 unreadable.**
`src/components/admin-v2/settings/IntegrationsSettings.tsx:468` pins
`featureType: "whatsapp_business_app_onboarding"` for everyone, so this is by
construction, not drift.

### The second problem, found while proving the first

A real partner's WABA is on **their own** portfolio:

```
flaminhotchicken WABA 1332375285660252 → owner "Brentwood Culinary Concepts LLP" (3342088979277692)
```

oreodemo only linked cleanly because it is our own test account and its WABA sits
on our portfolio. In production the catalogue (ours) and the WABA (theirs) are on
different businesses, so provisioning needs a cross-business answer — share the
catalogue to the partner's business, or hold `catalog_management` on theirs.
Embedded Signup grants neither. **Untested.**

### …and then it connected anyway. (#10) is an API limit, not a capability limit

Second correction, same day. I read `(#10)` as "coexistence numbers cannot hold a
Cloud API catalogue" and sized up a non-coexistence rebuild on the strength of it.
Wrong. WhatsApp Manager → Account tools → Catalogue → **Connect a catalogue**
linked `1425080372783453` to oreodemo's coexistence WABA without complaint, with
both "Show catalogue icon in chat header" and "Add to basket" On.

`(#10)` gates the **`{waba}/product_catalogs` edge**, not the underlying feature.
The UI writes the association through a different path.

The tell I misread: the first UI attempt failed with *"Manage catalogue permission
required"* — an asset-permission error, not a business-type refusal. A closed door
does not ask you for credentials. The catalogue is created by our system user, so
the human admin is not assigned to it and it reads as someone else's asset.
Assigning the human (Business Settings → Data sources → Catalogs → *catalogue* →
People → Add People → Full control) cleared it and the connect went through.

Measured after connecting:

| | |
|---|---|
| UI shows catalogue connected, icon + basket On | ✅ |
| `{waba}/product_catalogs` | ❌ still `(#10)` — **the link is invisible to the API** |
| `{phone}/whatsapp_commerce_settings` | ✅ `is_cart_enabled`, `is_catalog_visible` |
| catalogue contents | ✅ 123 products |

**So the link state cannot be read back for a coexistence partner.** Anything that
wants to show "catalogue connected" must track it in our own DB at the moment a
human does it — the API will never confirm it. Do not build a UI that implies
otherwise.

### What is actually automatable

| step | how |
|---|---|
| create catalogue | ✅ API, system token |
| push menu → products | ✅ API, system token |
| enable cart / visibility | ✅ API, partner token |
| assign human to catalogue | ❌ manual — `assigned_users` refuses a system-user token on every catalogue, including UI-created ones |
| connect catalogue ↔ WABA | ❌ manual — `(#10)` on the API edge; UI only |
| read back the connection | ❌ never, for coexistence |

Two manual clicks per partner. That is the price, and it is a fraction of
re-onboarding 89 numbers off the WhatsApp Business app.

### Still unproven: the cross-business topology

oreodemo connected because its WABA and our catalogue are **both** on Menuthere
Test 2. A real partner's WABA is on their own portfolio
(flaminhotchicken → Brentwood Culinary Concepts LLP), so their WhatsApp Manager
would have to offer a catalogue owned by *us*. Untested, and it is now the last
real unknown.

Candidate: `POST /{catalog_id}/agencies` with the partner's business id, sharing
our catalogue into their business so it appears in their picker. Our system token
holds `business_management` + `catalog_management`, so it may work — but it writes
a business relationship on a live partner and has not been tried.

### Consequences

- Coexistence is **not** disqualifying. No partner has to give up the WhatsApp
  Business app on their counter phone.
- Provisioning ends in a documented two-click handoff, not a dead end.
- Connection state must be stored by us, never inferred from Meta.
- Cart was enabled on oreodemo's number *before* our catalogue was connected, when
  the live catalogue was still the phone app's — whose `product_retailer_id`s are
  not our menu uuids. The `order` webhook handler must tolerate ids that do not
  map rather than assume ours.

## Verify before writing code

One live probe on a pilot partner, because none of it is answerable from the repo:

1. Embedded Signup returns a token carrying `catalog_management` — today's token
   is scoped to `whatsapp_business_manage_events`
   (`src/lib/whatsapp-meta.ts:10-29`).
2. A catalog can be created and connected to the WABA programmatically.
3. India commerce policy permits cart / order messages for restaurant catalogues.

If (1) fails, nothing below it is buildable and the rest of the plan is moot.

## Explicitly out of scope

- Variants and add-on groups.
- The 32 partners sharing `870675129470312` — one WABA means one catalogue.
- Native WhatsApp payments.
- Any second pricing implementation. Checkout stays the single source of truth.
