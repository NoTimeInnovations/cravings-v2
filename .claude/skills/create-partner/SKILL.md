---
name: create-partner
description: Create (onboard) a new Menuthere/Cravings partner restaurant end-to-end from a name, email, menu, and optional logo — the same end state as the /signup-from-google flow, but driven by supplied inputs instead of a Google listing. Digitises the menu, sets the brand colour from the logo, and — when the partner is an outlet under an existing brand/branch — copies the parent's WhatsApp integration + flows. Use when the user says "create a partner", "onboard this restaurant", "make a new partner from this logo/menu", "add a new outlet/branch for <brand>", or gives a name + email + menu (and maybe a logo).
---

# Create Partner

Provisions a fully set-up partner directly against **production Hasura**
(`hasura-prod-v2.cravings.live`), mirroring what `onBoardUserSignup` +
`quickSignupFromGoogle` produce for a `/signup-from-google` signup:

- a `partners` row with the canonical new-partner defaults (v3 storefront + v2
  checkout theme, `ordering/delivery/whatsappOrdering` flags, the country's free
  trial, default delivery pricing/windows) — see `src/lib/newPartnerDefaults.ts`
- categories + menu items (digitised from the supplied menu)
- a default table-1 QR code
- **brand colour derived from the logo** (set on both `theme.brandColor` and the
  legacy `theme.colors.accent`)
- the logo uploaded to S3 as the storefront hero (`store_banner` +
  `storefront_settings.bannerLogo`)
- **branch handling:** if it's an outlet under an existing brand, links it to the
  brand's `branch` and copies the parent's `whatsapp_business_integrations` +
  `whatsapp_flows` onto it (same logic as the superadmin "copy main branch's
  WhatsApp to outlets" feature)
- fires the `mail-to-thrisha` ops webhook

The heavy lifting is in `scripts/create-partner.mjs`; Claude's job is to collect
inputs, digitise the menu, pick the brand colour, assemble a spec JSON, preview
with `--dry-run`, confirm, then run for real.

## Inputs

| Input | Required | Notes |
|-------|----------|-------|
| **name** | yes | Restaurant/partner name → also the `store_name` and the basis for the username. |
| **email** | yes | Login email. The script refuses to create a duplicate for an email that already exists (override with `--force`). |
| **menu** | yes | One or more images / a PDF / photos, or already-structured text. Claude reads it directly (vision) and produces categories + items. |
| **logo** | no | Image file. Claude looks at it to pick the brand hex; it's uploaded to S3 as the storefront hero. |
| **branch parent** | no | Only when the user says this is an outlet "under" a brand. A store name, `@username`, or partner id — the parent whose branch + WhatsApp are inherited. |

Defaults when not supplied: country **India** (₹, `+91`, `in_trial_100` trial),
password **`123456`**, phone empty. For a branch, country/currency/district are
inherited from the parent.

## Steps

1. **Gather the inputs.** Confirm name + email. Ask for the branch parent only if
   the user indicated it's an outlet/branch.
   - If the menu or logo was pasted into chat rather than given as a path, it is
     not a readable file — pull it off the macOS clipboard first
     (`osascript` → PNG, see the `pasted-image-from-clipboard` memory) and save
     to the scratchpad, then `Read` that file.

2. **Digitise the menu.** `Read` each menu file (images render; use the `pages`
   param for PDFs). Produce an ordered `categories` array and an `items` array:
   - `items[]`: `{ name, price (number), category, description?, is_veg?, variants? }`
   - Group items under their menu section as `category`; keep `categories` in menu
     order. Prices numeric (strip currency symbols). Set `is_veg: true` only when
     the menu clearly marks it (green dot / "veg"), else `false`. Capture sizes as
     `variants: [{ name, price }]`. Preserve the parent item `price` as the base.

3. **Pick the brand colour (if a logo was given).** Look at the logo and choose
   its dominant *brand* hex — the signature colour of the mark, **not** a white/
   transparent background. Put it in `brandColorHex` (e.g. `"#e85d04"`). If no
   logo, omit it (the partner gets the default Charcoal Noir).

4. **Write the spec JSON** to the scratchpad (schema below).

5. **Preview (read-only).** From the repo root:
   ```bash
   node .claude/skills/create-partner/scripts/create-partner.mjs <spec>.json --dry-run
   ```
   This resolves the username, the branch parent, and how much WhatsApp would be
   copied — **without writing anything**. Show the plan to the user.

6. **Confirm, then create.** This writes to **production**. After the user
   approves, run the same command **without** `--dry-run`:
   ```bash
   node .claude/skills/create-partner/scripts/create-partner.mjs <spec>.json
   ```
   Add `--force` only to override the duplicate-email guard, `--no-webhook` to
   skip the ops notification.

7. **Report** the printed result: storefront URL (`https://menuthere.com/<username>`),
   login email + password, counts, and (for branches) how many WhatsApp
   integrations/flows were copied.

## Spec JSON schema

```jsonc
{
  "name": "The Pizza Place",           // required
  "email": "owner@pizzaplace.com",     // required
  "storeName": "The Pizza Place",       // optional (defaults to name)
  "phone": "",                          // optional (digits only, no + / country code)
  "country": "India",                   // optional (default India; inherited from parent for branches)
  "location": "",                       // optional human-readable address
  "district": "", "state": "",          // optional
  "password": "123456",                 // optional (default)

  "brandColorHex": "#e85d04",           // optional; from the logo. Omit for the default.
  "logoPath": "/abs/path/to/logo.png",  // optional local file → uploaded to S3
  "logoScale": 100,                     // optional (50–500, storefront hero zoom %)
  "logoBgColor": "#ffffff",             // optional hero tile background

  "categories": ["Pizzas", "Sides"],    // ordered
  "items": [
    { "name": "Margherita", "price": 299, "category": "Pizzas",
      "description": "Classic", "is_veg": true,
      "variants": [{ "name": "Regular", "price": 299 }, { "name": "Large", "price": 399 }] }
  ],

  "branchParent": "Some Brand"          // optional: store name / @username / partner uuid
}
```

## What the script does (for reference)

- Credentials come from the project's `.env.local` (`NEXT_PUBLIC_HASURA_*` for the
  prod-v2 endpoint/secret, `NEXT_PUBLIC_S3_*` for the logo upload) — the same
  values `src/lib/hasuraClient.ts` and `src/app/actions/aws-s3.js` use. No extra
  setup needed.
- Username uniqueness replicates `generateUniqueUsername` (slugify → append a
  numeric suffix if taken).
- New-partner defaults (feature flags, trial subscription, delivery rules, theme)
  mirror `src/lib/newPartnerDefaults.ts` — **if that file changes, update the
  constants at the top of the script.**
- Branch: finds (or creates + links) the parent's `branches` row, sets the new
  partner's `branch_id`, then copies WhatsApp via the exact `COPY_TO_OUTLET`
  mutation from `src/app/actions/branchWhatsapp.ts`. `phone_number_id` is shared
  by design (not unique in prod). If the parent has no WhatsApp connected, the
  copy is skipped with a warning.

## Cautions

- **Production writes.** Always `--dry-run` and confirm first. Creation is not
  transactional across tables — if it fails mid-way you may get a partner with no
  menu; re-running would need `--force` (duplicate email) and would create a
  second partner, so prefer to fix forward (add the missing menu) rather than
  blindly re-run.
- The welcome email that the app's `onBoardUserSignup` sends is **not** sent here
  (it needs the app's Resend server context). The partner still gets login
  details in the printed result — hand those to them, or trigger the email from
  the app if needed.
- Only pass a `branchParent` when the user actually says it's an outlet under a
  brand — it copies the parent's live WhatsApp access token onto the new row.
