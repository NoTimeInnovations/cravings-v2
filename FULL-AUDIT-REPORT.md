# Full SEO Audit Report — menuthere.com

**Audit Date:** 2026-02-23
**Site:** https://menuthere.com
**Framework:** Next.js 16 (Turbopack) on Vercel
**Business Type:** SaaS — Restaurant Digital Menu Platform (India + International)

---

## Executive Summary

### Overall SEO Health Score: **54 / 100**

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Technical SEO | 61/100 | 25% | 15.25 |
| Content Quality (E-E-A-T) | 51/100 | 25% | 12.75 |
| On-Page SEO | 60/100 | 20% | 12.00 |
| Schema / Structured Data | 45/100 | 10% | 4.50 |
| Performance (CWV) | 70/100 | 10% | 7.00 |
| Images | 65/100 | 5% | 3.25 |
| AI Search Readiness | 28/100 | 5% | 1.40 |
| **TOTAL** | | | **56.15** |

---

### Top 5 Critical Issues

1. **1,006 hotel/restaurant pages in sitemap are unindexable** — subscription-expired pages render thin error content with `robots: index:true`, wasting crawl budget and risking thin-content penalties
2. **Trust-breaking inconsistencies** — customer count claims range from 600+ to 5,000+ across pages; pricing shown in ₹299 on /pricing but $30 on /agencies
3. **Gmail contact email** (`menuthere@gmail.com`) in Organization schema and on-site — fails Google's Quality Rater trustworthiness criteria for a paid SaaS product
4. **FAQ.tsx marked `"use client"`** — Google cannot reliably index the homepage FAQ in first crawl pass; 11 FAQ items invisible in initial crawl
5. **No HSTS or CSP security headers** — Strict-Transport-Security and Content-Security-Policy missing from `vercel.json`

### Top 5 Quick Wins (< 1 day each)

1. **Fix sitemap**: Remove 1,006 hotel URLs immediately — drops sitemap to ~20 real indexable pages, stops crawl budget waste today
2. **Fix `/compare` title**: Change `(2025)` → `(2026)` in `src/app/compare/page.tsx:9`
3. **Add HSTS header** to `vercel.json`: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
4. **Normalize customer count**: Pick one number (actual), update across all pages
5. **Replace gmail contact**: Use `support@menuthere.com` across site and all schema blocks

---

## 1. Technical SEO — Score: 61/100

### 1.1 Crawlability

**CRITICAL — Subscription-expired hotel pages indexed as thin content**
`/src/app/hotels/[...id]/page.tsx:382–389` — when a partner's subscription expires, the server renders `<SubscriptionExpiredCard />` but `generateMetadata()` still sets `robots: { index: true }`. Google indexes these as thin content pages.

```tsx
// FIX: Add subscription status check to generateMetadata
if (isExpired || status === "inactive") {
  return { ...base, robots: { index: false, follow: false } };
}
```

**CRITICAL — Broken schema on edge-case hotel routes**
`/src/app/hotels/[...id]/page.tsx:40` — if the URL pattern doesn't resolve a valid UUID, canonical becomes `https://menuthere.com/hotels/undefined/undefined`. Fix: add null-guard before computing `hotelId`.

**MEDIUM — `FAQ.tsx` is `"use client"` (line 1)**
`/src/components/home/FAQ.tsx:1` — the FAQ component is dynamically imported on the homepage but marked as a client component. Google's first-wave crawl won't see 11 FAQ items. Fix: extract the static FAQ data to a server component wrapper; keep only the accordion interaction client-side.

### 1.2 Sitemap Quality — Score: 50/100

- **1,021 total URLs** — 1,006 are hotel pages that should not be in the sitemap
- **All lastmod identical** (`2026-02-22`) — batch-fabricated date, Google will stop trusting it
- **Missing pages**: `/refund-policy`, `/tutorials`, `/compare` (parent hub page)
- **Should NOT be added**: `/login`, `/profile`, `/reel-analytics` (authenticated pages)

Source: `/src/app/sitemap.ts:43,49` — hardcoded `new Date("2026-02-22")` for all entries

### 1.3 Canonical Implementation — Score: 85/100

All major pages have correct canonicals. One risk: hotel page canonical encoding is implemented independently in `sitemap.ts` and `hotels/[...id]/page.tsx` — URL drift possible with special characters in restaurant names. Extract to a shared utility.

### 1.4 Security Headers — Score: 65/100

**Present** (in `vercel.json`): `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`

**Missing**:
- `Strict-Transport-Security` — **HIGH**
- `Content-Security-Policy` — **HIGH** (site loads PostHog, GTM, Google Ads, Apollo.io)
- `X-DNS-Prefetch-Control` — MEDIUM

### 1.5 Core Web Vitals Signals — Score: 70/100

**CLS risks:**
- 5 Google Fonts loaded with `font-display: swap` in `layout.tsx:74–100` — Geist appears to be the only production font; Inter, Poppins, Roboto, Dancing Script may be unused
- SuisseIntl loaded from third-party CDN `db.onlinewebfonts.com` via `requestIdleCallback` — unreliable source

**LCP risk:**
- `DashboardAnimation` in dynamic import without `priority` on hero image

**INP risk:**
- PostHog session recording runs at hydration time, adds main-thread cost

**Good:** All analytics scripts use `strategy="lazyOnload"`. `next/image` in use across product pages.

### 1.6 robots.txt — Score: 88/100

Good configuration. Disallows `/admin/`, `/superadmin/`, API routes. Sitemap declared correctly. Missing: explicit AI crawler directives (`GPTBot`, `ClaudeBot`, `PerplexityBot`).

---

## 2. Content Quality & E-E-A-T — Score: 51/100

### 2.1 E-E-A-T Composite: 39/100

| Factor | Score | Key Issue |
|---|---|---|
| Experience | 38/100 | Logo wall present but no verifiable first-hand case studies, no founder story |
| Expertise | 44/100 | No named authors on any page, no author bios or credentials anywhere |
| Authoritativeness | 35/100 | No third-party press mentions, G2/Capterra reviews, or industry recognition |
| Trustworthiness | 40/100 | Gmail contact, no Privacy Policy/Terms linked, no physical address |

### 2.2 Critical Factual Inconsistencies

These are trust-breaking, not cosmetic:

| Claim | Homepage | /solutions/restaurants | /solutions/agencies |
|---|---|---|---|
| Restaurant count | 600+ | 5,000+ | 600+ |
| Pricing currency | ₹299/mo | ₹299/mo | $30/mo |

A quality rater encountering these discrepancies will flag the entire domain as unreliable. AI systems cross-reference claims — both numbers will be discounted.

### 2.3 Content Depth by Page

| Page | Est. Words | Assessment |
|---|---|---|
| /solutions/restaurants | 1,800–2,100 | ✓ Good depth |
| /solutions/google-business | ~1,500 | ✓ Strong structure |
| /compare/menuthere-vs-mydigimenu | 2,100–2,400 | ✓ Adequate |
| /pricing | ~400 | ⚠ Thin — no feature comparison table, no billing FAQ |
| /solutions/agencies | ~800 | ⚠ Grammar error in H1, USD/INR conflict |
| /solutions/owners | ~600 | ⚠ Claims POS/inventory but likely underdeveloped |
| /solutions/cafes | Unknown | ⚠ High thin content risk |
| /help-center | ~600 | ✗ 10 FAQs insufficient for a multi-feature SaaS |

### 2.4 Trust Infrastructure Gaps

| Gap | Impact | Fix effort |
|---|---|---|
| Gmail contact email | High — quality rater red flag | 1 hour |
| No Privacy Policy linked in footer | High — legal + trust signal | 1 day |
| No Terms of Service | High | 1 day |
| No physical address | Medium | 30 mins |
| Unattributed "7x more profile clicks" stat | Medium — quality rater flag | 1 hour |
| No third-party review platform presence | High | Ongoing |

### 2.5 AI Citation Readiness Score: 28/100

The primary blockers are factual inconsistencies (AI systems discard contradictory data as unreliable sources) and missing Organization schema (primary mechanism for AI knowledge panel identification). Resolving inconsistencies alone would move this score to ~50.

---

## 3. Schema / Structured Data — Score: 45/100

### 3.1 Current Implementation

| Page | Schema Present | Issues |
|---|---|---|
| Homepage | SoftwareApplication, Organization, WebSite | `ratingCount` is string not number; `contactType` wrong value; Gmail email |
| /solutions/google-business | BreadcrumbList | FAQPage missing (8 FAQ items present) |
| /solutions/restaurants | BreadcrumbList | FAQPage, Service schema missing |
| /solutions/cafes | BreadcrumbList | FAQPage missing |
| /solutions/agencies | **None** | BreadcrumbList, FAQPage missing |
| /solutions/owners | **None** | BreadcrumbList missing |
| /pricing | **None** | WebPage + Offer schema missing |
| /help-center | **None** | FAQPage missing (11 FAQ items present) |
| /compare/* | WebPage + ItemList | `url` on ListItem should be `item` |
| /hotels/* | Restaurant (SSR) | MenuSection name bug: always shows first category name for all sections |

### 3.2 Hotel Page MenuSection Bug

`/src/app/hotels/[...id]/page.tsx:483` — The `.find()` call searches globally across all menu items instead of per-category. Every `MenuSection` gets the same incorrect name.

```typescript
// CURRENT (WRONG) — all sections get first category name found
name: filteredMenus.find((m) => m.category?.name)?.category?.name

// FIX — use the category key from the reduce grouping
Object.entries(grouped).map(([categoryName, items]) => ({
  "@type": "MenuSection",
  name: categoryName,
  hasMenuItem: items,
}))
```

### 3.3 High-Priority Missing Schema

**FAQPage for /help-center** — 11 items, server-rendered, immediate rich result opportunity:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "url": "https://menuthere.com/help-center",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I stop customers finding old menus on Google or apps?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "All changes are applied instantly to your digital menu. Verify by clicking View Menu from your dashboard; no delays or reprints needed."
      }
    },
    {
      "@type": "Question",
      "name": "Can I cancel my subscription at any time?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes — cancel anytime from your account. Your plan stays active until the current billing period ends, with no further charges unless you renew."
      }
    }
    // ... remaining 9 items (see schema specialist report for full JSON)
  ]
}
```

**Offer schema for /pricing:**

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://menuthere.com/pricing",
  "mainEntity": {
    "@type": "SoftwareApplication",
    "name": "Menuthere",
    "offers": [
      {
        "@type": "Offer",
        "name": "Pro Plan",
        "price": "299",
        "priceCurrency": "INR",
        "billingIncrement": "P1M"
      }
    ]
  }
}
```

**Fix ratingCount type in SoftwareApplication:**

```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.8",
  "ratingCount": 600,
  "bestRating": "5",
  "worstRating": "1"
}
```

---

## 4. On-Page SEO — Score: 60/100

### Title Tags

| Page | Title | Issue |
|---|---|---|
| Homepage | "Menuthere \| QR Code Digital Menu for Restaurants, Cafes & Hotels" | Good |
| /pricing | "Pricing \| Menuthere — Plans for Restaurants" | Good |
| /solutions/restaurants | "Restaurant Digital Menu Solution \| QR Code Menus \| Menuthere" | Good |
| /solutions/google-business | "Sync Restaurant Menu to Google Business \| Menuthere" | Good |
| /solutions/agencies | "Agency Partner Program \| Earn Recurring Commissions \| Menuthere" | OK |
| /solutions/owners | "Restaurant Owner Solutions \| Menuthere" | Weak — no keyword |
| /compare | "Menuthere vs Competitors — Digital Menu Comparisons **(2025)**" | Stale year |

### Meta Descriptions

- `/solutions/restaurants` claims "5000+ restaurants" — contradicts homepage
- `/solutions/agencies` references "$30/month" — contradicts ₹299 pricing page
- `/solutions/owners` is generic, misses specific keyword opportunity

### Heading Structure

- `/solutions/agencies` H1: "Earn Up to 30% Month Per Sale, Lifetime Recurring Commissions" — grammatically broken
- All major pages have a single H1 ✓
- FAQ sections exist on most solution pages — none have FAQPage schema

### Internal Linking

- No `/solutions/` hub/index page to consolidate authority
- `/tutorials`, `/refund-policy`, `/download-app` are orphaned or weakly linked
- Compare pages link to each other but no inbound from solution pages

---

## 5. Performance — Score: 70/100

Based on code signals (no direct CWV measurement available):

| Signal | Status |
|---|---|
| `next/image` in use | ✓ Good |
| Analytics lazy-loaded (`strategy="lazyOnload"`) | ✓ Good |
| Suspense fallbacks for dynamic imports | ✓ Good |
| 5 Google Fonts with font-display:swap | ⚠ CLS risk |
| SuisseIntl from `db.onlinewebfonts.com` | ⚠ CDN reliability risk |
| PostHog at hydration time | ⚠ INP risk |
| No `priority` on hero/LCP image | ⚠ LCP risk |

**Recommendation:** Run PageSpeed Insights on the live site to get actual LCP/CLS/INP scores. Focus first on font rationalization (remove unused fonts) and hosting SuisseIntl locally.

---

## 6. Images — Score: 65/100

- `next/image` in use — automatic WebP, lazy loading, sizing ✓
- Customer logos on homepage have descriptive alt text ✓
- Icon images in benefit/feature grids may lack alt text (not confirmed)
- No evidence of oversized images, but hero images in `/images/solutions/` are referenced but unverified
- OG image: `https://menuthere.com/og_image.png` — format should be JPG/WebP for better compression

---

## 7. AI Search Readiness — Score: 28/100

| Factor | Score | Notes |
|---|---|---|
| Quotable statistics | 15/40 | Present but unattributed/inconsistent |
| Structured data coverage | 8/20 | Minimal — no Organization on most pages |
| Content hierarchy | 10/15 | H1/H2 structure generally sound |
| Factual consistency | 3/15 | Contradictions across pages |
| Freshness signals | 5/10 | No last-updated dates; "(2025)" in titles |

The factual inconsistencies are the primary blocker. AI systems trained on the web will encounter "600+" and "5,000+" and discard both as unreliable. Organization schema is the single highest-leverage action for AI Overviews visibility.

---

## Files Requiring Changes (Complete Reference)

| File | Issues |
|---|---|
| `/src/app/hotels/[...id]/page.tsx` | Noindex expired pages; MenuSection name bug; fix undefined URL edge case |
| `/src/app/sitemap.ts` | Remove hotel URLs; fix lastmod; add missing pages |
| `/src/components/home/FAQ.tsx` | Remove `"use client"` or split server/client |
| `/src/app/layout.tsx` | Remove unused fonts; host SuisseIntl locally |
| `/src/app/help-center/page.tsx` | Add FAQPage JSON-LD |
| `/src/app/compare/page.tsx` | Update title year 2025 → 2026 |
| `/src/app/solutions/agencies/page.tsx` | Add BreadcrumbList + FAQPage schema; fix H1 grammar; fix currency context |
| `/src/app/solutions/owners/page.tsx` | Add BreadcrumbList schema |
| `/src/app/pricing/page.tsx` | Add Offer/WebPage schema |
| `/src/app/(root)/page.tsx` | Add FAQPage JSON-LD server-side; fix ratingCount type |
| `/vercel.json` | Add HSTS + CSP headers |
| All pages | Normalize customer count claim; resolve USD/INR inconsistency |
| Contact/Organization | Replace gmail with domain email |
