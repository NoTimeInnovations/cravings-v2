---
name: set-menu-images
description: Fill in missing menu item photos for a Menuthere/Cravings partner — finds an image for every item that has none, uploads it to the partner's S3, and updates Hasura. Use when the user says "set images for partner X", "add images for X's menu", "fetch item images for X", "X's items have no photos", or asks to re-image a menu. Runs the same pipeline as the admin "Get all images" button, but from the CLI and without the paid Apify actor.
---

# Set Menu Images for a Partner

One command fills every image-less item on a partner's menu:

```bash
node .claude/skills/set-menu-images/scripts/menu-images.mjs "<partner>"
```

`<partner>` is a store-name substring, `@username`, or a partner uuid.

It mirrors the admin **"Get all images"** flow (`src/components/admin-v2/AdminV2Menu.tsx`
→ `src/app/actions/googleImageFallback.ts`) — image bank first, search as
fallback, re-host on our own S3 — but replaces the paid Apify actor with
**Google Images via Serper**, and runs entirely from Node.

**Engines.** With `SERPER_API_KEY` in `.env.local` the default engine is
`google` and it is *exclusive*: an empty result is reported as empty rather than
quietly backfilled from another engine, so "sourced from Google" stays true.
Serper's free tier is 2,500 queries (no card); check the balance with
`curl -X POST https://google.serper.dev/account -H "X-API-KEY: $KEY" -d '{}'`.
Google itself cannot be scraped — it serves no server-rendered HTML, and a
browser tab earns HTTP 429 + CAPTCHA after ~40 queries. Use `--engine ddg|bing|auto`
to fall back to the free engines (lower quality, DDG throttles past ~200 queries).

## Steps

> **Keep it fast.** The script does the whole job in one process. Most wasted
> time is avoidable agent overhead, so run this skill with **minimal
> deliberation**:
> - **Don't pre-query Hasura** to find the partner, count the menu, or check
>   which items lack images — the script resolves the partner itself and prints
>   all of that. If the name is ambiguous it exits 2 and lists the matches.
> - **Don't run verification queries afterwards.** The summary already reports
>   rows updated and `still_missing`; trust it.
> - **Don't fetch or inspect images one by one.** Every candidate is already
>   validated (magic bytes + size) before upload.
> - Only use `--dry-run` when the user asks what it *would* do, or when the menu
>   is in a language whose search terms you want to eyeball first.

1. Run it. For a first-time partner just pass the name.
2. Report the printed summary, and send the user the **review sheet** it writes
   (`menu-images-<slug>.html`) — a grid of the whole menu with newly imaged
   items outlined green. This is the only real accuracy check, so always offer it.
3. Call out anything in `failed` (no image found) or `skipped_non_food`.

## Flags

| Flag | Use |
|------|-----|
| `--dry-run` | Resolve partner + print the search term for each item. No writes. |
| `--overwrite` | Re-image items that **already** have a photo (default is fill-only). |
| `--limit N` | Only the first N items — good for sampling quality on a huge menu. |
| `--cuisine "<hint>"` | Override the auto cuisine hint, e.g. `--cuisine "kerala indian"`. |
| `--concurrency N` | Search/upload workers, default 8. Lower it if DDG starts 429ing. |
| `--sheet <file>` | Where to write the review sheet. |
| `--json` | Machine-readable summary only. |
| `--engine google\|ddg\|bing\|auto` | Search engine. Defaults to `google` when `SERPER_API_KEY` is set. |
| `--no-bank` | Skip the image bank so every image is sourced fresh from the chosen engine. |
| `--gl <cc>` | Google country for results (default `in`). |
| `--audit` | Report duplicate photos (URL **and** byte level). No writes. |
| `--redo-duplicates` | Re-image every dish that shares a photo with a *differently named* dish. |
| `--emit-queries <f>` / `--candidates <f>` | Browser-mode handoff, below. |

## What makes it accurate

These are the levers that actually change the result — adjust these rather than
hand-picking images:

- **Image bank first.** `item_images` is checked before any search: free,
  instant, and already curated. Every search result is written *back* to the
  bank, so each run makes the next partner cheaper.
- **Bilingual names use the Latin half.** `كبسة عربي لحم شوا (Arabic Kapsa Mutton Shuwa)`
  searches as `Arabic Kapsa Mutton Shuwa`. Searching the Arabic/Malayalam script
  returns menus and signage, not plated food.
- **Cuisine hint from the partner's country** (`+91` → indian, `+968` → arabic
  omani, `+60` → malaysian …). Without it, "Masak Merah Ayam" returns generic
  chicken. Override with `--cuisine` when the country is wrong for the food
  (e.g. an Italian place in Oman).
- **Category decides the noun.** Drinks categories append `drink glass`, cake
  categories `bakery dessert`, soups `soup bowl`. This is why a `KitKat` in a
  *milkshakes* category returns a milkshake and not a chocolate bar.
- **Watermarked stock hosts are excluded** (shutterstock, alamy, getty,
  dreamstime, freepik…) along with social/video junk. A watermarked photo on a
  live menu is worse than no photo.
- **Magic-byte validation**, not Content-Type. An HTML error page served as
  `image/jpeg` would otherwise become a broken tile.
- **Google's own content filters do the hard part.** Every Serper query sends
  `safe=active` (SafeSearch — no explicit/vulgar imagery), `tbs=itp:photo`
  (photographs only: no clipart, lineart, drawings, logos) and `tbs=ift:jpg`
  (JPEG only, which structurally excludes GIFs). These are passed straight
  through to Google, so the filtering happens at the source rather than being
  guessed at afterwards.
- **Engine use is always reported** as `[google N / ddg N / bing N / none N]`.
  This matters because search engines fail *silently* — DDG starts returning
  empty result sets past ~200 queries rather than erroring, which is
  indistinguishable from "this dish has no photo" unless the counts are shown.
- **Every image is unique.** Each item claims a candidate no other item is
  using, matched on both source URL and **SHA-256 of the bytes** (the same photo
  is often served from several hosts). Without this, obscure or misspelled names
  — `POTH GINGER -GRAVY`, `CHILLY MUSHHOUM-DRY` — all fall back to the same
  generic results and a dozen dishes end up sharing one picture. When a run
  genuinely runs out of distinct candidates it reuses one and reports it under
  `not_unique` rather than leaving a blank tile.
- **Non-food items are skipped** (tissue, mineral water, packing charge…) and
  reported, instead of getting a nonsense photo.

## Checking uniqueness

Duplicate photos are the most common quality complaint after a bulk fill, and
they cannot be judged from URLs — a partner imaged across several runs gets a
fresh S3 key each time, so identical pictures hide behind distinct URLs.

```bash
node scripts/menu-images.mjs "<partner>" --audit             # report only
node scripts/menu-images.mjs "<partner>" --redo-duplicates   # report + fix
```

Both hash the bytes of every image on the menu and group by hash. Items that
share a name are left alone (the same dish listed in two categories is *meant*
to share a photo); only differently-named dishes count as a collision. The fix
seeds the run's used-hash set with **every existing image**, so a replacement
can't collide with something already on the menu — which is exactly the trap
when a partner is filled over multiple runs.

Run `--audit` after any large fill.

**Uniqueness has limits.** When a menu carries many near-identical dishes
(`POTH/BUFFALO ROAST` / `PIRATTU` / `PEPPER ROAST`), Google returns one shared
result set and the candidate pool genuinely runs out — the run then reuses a
photo and reports it under `not_unique`. Fix those by hand with a distinct,
specific query rather than re-running the dedup, which cannot invent new
candidates.

## Safety

- **Never overwrites an existing image** unless `--overwrite`: each row's update
  re-checks `image_url IS NULL OR = ''`, so an item that gained a photo since the
  read is left alone.
- Writes go to **production** Hasura (`hasura-prod-v2`) and the live
  `cravingsbucket`. There is no staging path — use `--dry-run` / `--limit` first
  when unsure.
- Credentials are read from the repo's `.env.local` (`NEXT_PUBLIC_HASURA_*`,
  `NEXT_PUBLIC_S3_*`); nothing is hardcoded.
- Images are re-hosted on our own bucket, never hotlinked, using the same
  `{partner_id}/menu/google_{NAME}_{ts}.{ext}` key convention as the app.
- **The ISR cache is busted automatically** after a successful write, via
  `GET /api/revalidate-tag?tag=<partner_id>` (the HTTP face of the
  `revalidateTag(partnerId)` server action that `CLAUDE.md` requires after any
  partner mutation). Without it the storefront keeps serving the *old* menu and
  the run looks like it did nothing. Override the host with `NEXT_PUBLIC_SITE_URL`;
  if the call fails the script prints the exact `curl` to run by hand.
  Note this also submits the partner URL to **IndexNow** (Bing re-crawl), which
  is an outward-facing side effect of the app's own action, not of this skill.

## Google mode (required when the images must come from Google)

Google Images serves **no server-rendered HTML and has no free API**, so it
cannot be scraped from Node — a plain fetch returns a JS shell with zero image
data. It must run inside a real browser tab, where the session's cookies make
Google return the full payload to a same-origin `fetch`.

This is also the only mode that can apply Google's own content filters:

| Parameter | Effect |
|-----------|--------|
| `safe=active` | SafeSearch — filters explicit / vulgar imagery |
| `tbs=itp:photo` | **photographs only** — no clipart, lineart, drawings, logos |
| `tbs=ift:jpg` | JPEG only — structurally excludes GIFs |

```bash
# 1. what to search for  (--no-bank forces every item through Google rather
#    than reusing whatever the image bank already has)
node scripts/menu-images.mjs "<partner>" --no-bank --emit-queries queries.json

# 2. bridge: stages the queries in, takes the results out
node scripts/google-bridge.mjs queries.json candidates.json 8899 &
```

3. Navigate the browser tab to `http://localhost:8899/load` (stages the queries
   into `window.name`), then to `https://www.google.com/search?q=food&tbm=isch`.
4. In the page, install and start the paced runner — see
   `references/google-runner.js`. **Pace it: one query at a time with a ~1.5s
   gap.** Google starts serving its "unusual traffic" page within seconds at
   concurrency 4, and those responses look like empty results, not errors. The
   runner detects `unusual traffic|/sorry/|captcha`, backs off 8s+, and retries.
5. It is a long job (~2s/query, so ~20 min for 550 items) and exceeds the 30s
   tool timeout, so start it **fire-and-forget** and poll `window.__stat`.
6. Navigate to `http://localhost:8899/` to write `candidates.json`, then apply:

```bash
node scripts/menu-images.mjs "<partner>" --no-bank --candidates candidates.json
```

> **Be careful with the user's IP.** Sustained scraping can push their
> residential address into a Google CAPTCHA that affects their normal browsing.
> Keep the pacing, and stop if `sorry` climbs steadily.

## Browser mode (DuckDuckGo fallback)

Same handoff, but DDG can be fetched from inside any page without the pacing
problem, so it is far faster when Google is not a requirement. See
`references/ddg-runner.js`.

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| exit 2, "Ambiguous" | Several partners match; re-run with the exact store name or uuid. |
| Many names in `failed` | Terms too literal. Try `--cuisine`, or rename the items — house specials ("Cafe X special roll") have no stock photo and need a real one. |
| All searches empty | DDG throttled it; Bing should have taken over — if both are empty use **browser mode**. |
| Storefront still shows the old menu | Revalidation failed; re-run the `curl` the script printed, or hit `/api/revalidate-tag?tag=<partner_id>`. |
| Images look wrong for drinks/desserts | The item's **category** drives the noun; fix the category, or run those items with a `--cuisine` hint. |
| `Missing NEXT_PUBLIC_S3_*` | `.env.local` is incomplete — the same vars the app uses for uploads. |

## Related

- `src/app/actions/googleImageFallback.ts` — the in-app equivalent (Apify).
- `src/app/api/image-bank/route.ts` — the image-DB proxy the admin gallery uses.
- `.claude/skills/create-partner` — onboarding; run this **after** a menu import.
