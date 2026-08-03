# WhatsApp Catalogue — variants

Variants were scoped OUT of the first cut. WhatsApp does support them, so this
is the plan to add them — and the reasons not to do it first.

Everything below was measured against the live API and prod data on 2026-08-03,
not taken from documentation. The docs are wrong about the field name.

## It works — proven, not assumed

Two products sharing a group id collapse into one selectable product:

```
product_group 1789218432256218 -> 2 variants
  shake-small  ₹180.00  [{'key':'size','value':'Small'}]
  shake-large  ₹240.00  [{'key':'size','value':'Large'}]
```

Run on a throwaway catalogue under our own portfolio, since deleted.

### Three API traps

**1. The grouping field has a different name on each endpoint.** We use `/batch`,
which rejects the documented name outright:

| endpoint | field |
|---|---|
| `{catalog}/batch` | `retailer_product_group_id` |
| `{catalog}/products` | `item_group_id` |

`item_group_id` on `/batch` → `Invalid keys "item_group_id" were found in param
"data"`. Every example you will find online uses `item_group_id`.

**2. `additional_variant_attributes` is asymmetric and its errors contradict.**

```
write:  "additional_variant_attributes": {"size": "Small"}     <- a JSON object
read:   [{"key": "size", "value": "Small"}]                     <- array of pairs
```

An array of objects on write is rejected with *"must be a string"*; a string is
rejected with *"must be a JSON object"*. Only the object form works. Do not
trust either error message to tell you the shape.

**3. `validation_status` IS returned — on synchronous rejections.** A note in
the async-batch commit said this endpoint does not return it. That was true only
of the SUCCESS response. Every trap above surfaced through `validation_status`,
so the branch that reads it in `pushCatalogBatch` is live and load-bearing.

## Mapping

One catalogue product per variant, grouped by the parent menu row.

| catalogue field | source |
|---|---|
| `retailer_id` | `<menu.id>` + separator + variant name — **load-bearing, see below** |
| `retailer_product_group_id` | `menu.id` — groups the variants under one product |
| `additional_variant_attributes` | `{ "option": "<variant name>" }` |
| `price` | `variant.price` — ABSOLUTE, not a delta off the parent |
| everything else | as today, from the parent row |

`variant.price` is the charged price, confirmed in `ReorderHandler`
(`price: cur.price`) — the parent's own `price` is not a base to add to.

## The risk: the checkout handover round trip

This is why variants were deferred, and it has not changed.

`ReorderHandler.tsx:108-118` resolves a variant by **exact name**:

```ts
const cur = (menu.variants || []).find((v: any) => v.name === line.variantName);
if (!cur) { skipped++; continue; }        // silently dropped
```

So the variant NAME has to survive: menu → catalogue product → customer's cart →
`order` webhook → `?ro=` payload → live menu lookup. Rename "Large" to "Large
Size" and every catalogue entry for it becomes unresolvable, and the line
vanishes from the cart with no message.

Consequences for the design:

- `retailer_id` must encode the name, not an index — an index would silently
  point at a different variant after a reorder of the array.
- The `order` webhook handler must split `retailer_id` back into
  `(menuId, variantName)` and emit `[menuId, qty, variantName]`, the third slot
  `ReorderHandler` already reads.
- A variant that no longer resolves must be reported to the customer, not
  dropped. `composeCatalogOrderReply` already has a "sold out" bucket; this
  needs the same treatment, not silence.
- Separator: the cart uses `menuId|variantName` internally. `retailer_id` is
  URL/ID-ish; confirm `|` survives a round trip through Meta before adopting it,
  or pick something known-safe and keep it in ONE constant used by both the
  push and the webhook parse. Getting these out of step breaks every variant
  cart with no error.

## Prod data — what this actually costs

```
variant parent items (live)           8,946   across 480 partners
variant rows                         22,232
  price 0 or null                        201   <- must be skipped, would list at ₹0
  unnamed                                  1   <- unresolvable, must be skipped
parent items WITH an image            5,836   across 351 partners
```

Only 5,836 of 8,946 variant items can be listed at all — WhatsApp refuses a
product without an image, and 3,110 variant parents have none. So variants
roughly triple the catalogue size for the partners that use them (22k rows from
9k items) while a third of them cannot be published regardless.

**oreodemo has ZERO variants** — every item is `variants: []`. This cannot be
tested on the demo account. Proving it needs one of those 351 partners, i.e. a
real store.

### A pre-existing bug this would amplify

**80 items have two variants with the SAME name.** `find(v => v.name === ...)`
returns the first, so today a reorder of such an item can already restore the
wrong price. Pushing both to a catalogue makes it worse: two products would
compete for one `retailer_id`, so the second silently overwrites the first.

Fix the duplicates (or key on something unique) BEFORE shipping variants.

## Order of work — variants are third

1. **Change tracking.** `wa_catalog_synced_at` records when we last pushed, not
   what Meta holds, and nothing clears it on edit. So "Synced" currently means
   "pushed at least once, possibly stale". Store a hash of the pushed fields so
   the card can say "3 items changed" and mean it.
2. **Auto-sync.** Triggers on menu writes (not the admin UI — the 46 Petpooja
   partners re-sync from their POS and a UI hook would miss every change), plus
   a nightly reconcile.
3. **Variants**, on top of both.

Doing variants first would triple the number of rows drifting silently, with no
mechanism to notice. "Oreo Milk Boost" sat unsent and invisible until someone
happened to look at the list; the same failure with three sizes per dish is
three times the wrong prices in customers' chats.

## Out of scope, still

- Add-on groups. Meta has no equivalent; they would have to become variants,
  which multiplies rows combinatorially.
- Any second pricing implementation. Checkout stays the single source of truth;
  a catalogue price remains a shop window, never the number anyone pays.
