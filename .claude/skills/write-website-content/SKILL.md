---
name: write-website-content
description: Research a partner restaurant and populate their public Website page (`/<username>/home`) by writing the `partners.website_config` JSON in Hasura. Use when the user asks to "write website content for", "fill in the website for", "research and add website content for", or "set up the home page for" a specific partner / hotel / store name.
---

# Write Website Content for a Partner

End-to-end recipe: pull the partner row from Hasura → research the business on the web → draft section copy → update `partners.website_config` (jsonb), `partners.description`, and `partners.location_details`.

The Website page is rendered by `src/screens/WebsitePage.tsx`. Its config shape lives in `src/types/website.ts` and is merged with `DEFAULT_WEBSITE_CONFIG` at runtime, so any missing keys fall back to defaults — but **fill them all** for a complete-looking page.

---

## 1. Find the partner

Hasura admin endpoint and secret are in `/Users/abhinks/Documents/Claude Skills/credentials.env` (Mac) — source it inline (the bundled scripts hardcode a Linux source path):

```bash
set -a && source "/Users/abhinks/Documents/Claude Skills/credentials.env" && set +a
```

Search by name/username/email/phone:

```bash
curl -s -X POST "${HASURA_GRAPHQL_ENDPOINT_HASURA}/v2/query" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $HASURA_GRAPHQL_ADMIN_SECRET" \
  -d '{"type":"run_sql","args":{"sql":"SELECT id, store_name, username, email, phone, location, location_details, description, currency, social_links, theme FROM public.partners WHERE store_name ILIKE '\''%<term>%'\'' OR username ILIKE '\''%<term>%'\'' LIMIT 20;"}}' \
  | python3 -m json.tool
```

Capture from the row:
- `id` (UUID for the update)
- `store_name`, `username` — used in copy
- `phone`, `location`, `location_details` — fallbacks for visit section
- `theme.colors.accent` — the partner's brand color (the website's `var(--wb-accent)`)
- `social_links` — already wired into the footer Follow column

If `website_config` already has content, **read it first and decide** whether to overwrite or merge. Don't trample a partner's existing edits without asking.

Also fetch coordinates if you plan to verify them (the website's Mapbox preview uses `partner.geo_location`):

```sql
SELECT ST_AsGeoJSON(geo_location) FROM public.partners WHERE id = '<id>';
```

---

## 2. Research the business

Use `WebSearch` + `WebFetch`. Good queries:

- `"<store_name>" "<city>" Kerala menu` (or whatever region)
- `"<store_name>" "<street/area>"` to disambiguate branches (don't trust the user's free-text address — confirm against multiple sources)
- Zomato, Tripadvisor, Google reviews, Wanderlog, EvideApp pages tend to have the structured info you need

What to extract:
- Founding year / heritage angle
- Cuisine and 4–8 signature dishes
- Operating hours (cross-check 2 sources — Tripadvisor often lists an outdated subset)
- Tagline / atmosphere descriptors
- Anything seasonal (Ramadan thali, festival specials)

If the user's stated location and the DB row differ, **trust the DB row** — that's what the partner registered. Note the discrepancy in your final response so they can fix if wrong.

---

## 3. Draft the JSON

The full shape (from `src/types/website.ts`):

```ts
interface WebsiteConfig {
  enabled: boolean;
  theme: { bg_color: string; ink_color: string };
  hero: {
    enabled: boolean;
    eyebrow: string;
    headline: string;
    headline_accent: string;          // italic + brand color
    subheadline: string;
    cta_text: string;
    cta_link: string;                 // empty → defaults to /<username>?back=true
    collage_images: string[4];
    collage_labels: string[4];
    hours_label: string;              // e.g., "Hours" | "Open daily"
    hours_value: string;
    address_label: string;            // e.g., "Address" | "Find us"
    address_value: string;
  };
  marquee: { enabled: boolean; tags: { text: string; accent: boolean }[] };
  story: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    title_accent: string;             // italic + brand color
    paragraphs: string[];             // first paragraph renders larger
    image_url: string;
    image_label: string;
  };
  menu: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    title_accent: string;
    category_ids: string[];           // leave [] — partner curates from admin
    item_ids_by_category: Record<string, string[]>;  // leave {}
    note: string;
    cta_text: string;
  };
  visit: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    title_accent: string;
    address_lines: string;            // multi-line, "\n"-separated
    address_note: string;             // landmark / parking hint
    hours: { label: string; value: string }[];
    getting_here: string;
    contact_phone: string;
    contact_email: string;
    map_image_url: string;            // unused (map comes from geo_location now)
    map_link: string;                 // unused (derived from geo_location now)
  };
  footer: {
    enabled: boolean;
    policies: { label: string; url: string }[];   // leave [] — Quick Links column is hardcoded
    copyright: string;
  };
}
```

### Copy guidelines

- **Voice**: warm but not flowery. Specific over generic. Reference dishes / streets / years rather than adjectives like "best" or "amazing".
- **Headline**: 2–6 words, accent italicized as second line.
  - ✅ `"Old Kochi on a / plantain leaf."`
  - ❌ `"Welcome to our restaurant"`
- **Subheadline**: one sentence, ≤ 30 words, includes 2–3 concrete dishes.
- **Story paragraphs**: 3 paragraphs is the sweet spot. First is the lead (renders larger). Tell a place-specific anecdote, not a generic origin story.
- **Marquee tags**: 5–9 short phrases. Mix dish names and identity beats (e.g., `"Since 1952"`). Mark every other one `accent: true`.
- **Hours**: use the `Mon – Sat`, `Sunday` format with en-dashes. Include sub-rows for breakfast/lunch windows when meaningful.
- **CTA text**: `"Order online"` is the default; only change for something specifically warmer ("Book a table", "Reserve").
- **Theme**: warm cream `#FAF6EC` + dark ink `#1A1714` works for nearly every restaurant. Only override for strongly modern brands.
- Don't fabricate phone numbers, hours, or addresses. If unsure, use what's in the partner row and flag uncertainty in your response to the user.

---

## 4. Push to Hasura

Write the drafted JSON to `/tmp/<partner>_website_config.json`, then update via GraphQL (parameterised — safer than escaping into v2/query):

```bash
set -a && source "/Users/abhinks/Documents/Claude Skills/credentials.env" && set +a
python3 <<'PY'
import json, urllib.request, os
cfg = json.load(open('/tmp/<partner>_website_config.json'))
q = """mutation Update($id: uuid!, $cfg: jsonb!, $desc: String!, $loc: String!) {
  update_partners_by_pk(pk_columns: {id: $id}, _set: {
    website_config: $cfg, description: $desc, location_details: $loc
  }) { id store_name }
}"""
payload = {"query": q, "variables": {
  "id": "<partner-id>",
  "cfg": cfg,
  "desc": "<short tagline used in SEO + storefront>",
  "loc": "<full address with landmark>",
}}
req = urllib.request.Request(
  os.environ["HASURA_GRAPHQL_ENDPOINT"],
  data=json.dumps(payload).encode(),
  headers={
    "Content-Type": "application/json",
    "x-hasura-admin-secret": os.environ["HASURA_GRAPHQL_ADMIN_SECRET"],
  },
)
print(urllib.request.urlopen(req, timeout=30).read().decode())
PY
```

Set `enabled: true` on the root config object so the page goes live (otherwise `/<username>/home` falls back to the "coming soon" stub in `src/app/[username]/home/page.tsx`).

If `partner.description` is empty, fill it — it's reused in OG metadata and storefront SEO. Same for `partner.location_details` if blank.

---

## 5. Verify

After the update succeeds, the page is live at `/<username>/home` (no revalidation needed for jsonb reads).

Tell the user explicitly:
- Which fields you sourced from research vs. plausibly inferred
- Any conflicts between the DB and what they said (address mismatches, multiple branches under the same name)
- That the **menu section's `category_ids` are intentionally empty** — it auto-pulls the first 8 items from the first 4 categories until the partner curates from the Website admin tab.
- Cite your web sources at the end (Tripadvisor / Zomato / etc.).
