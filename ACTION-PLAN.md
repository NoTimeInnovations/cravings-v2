# SEO Action Plan — menuthere.com

**Generated:** 2026-02-23
**Overall SEO Health Score:** 54/100

---

## CRITICAL — Fix Immediately (Blocking indexing or causing active harm)

### C1. Remove hotel pages from sitemap
**File:** `src/app/sitemap.ts`
**Impact:** Stops wasting crawl budget on 1,006 unindexable pages today
```typescript
// Remove or comment out the hotel pages section in sitemap.ts
// Only add back after SSR is confirmed working for hotel pages
```

### C2. Noindex expired/inactive hotel pages
**File:** `src/app/hotels/[...id]/page.tsx:83–97`
**Impact:** Prevents thin "subscription expired" pages from being indexed
```typescript
// In generateMetadata, after fetching subscription status:
if (isExpired || hoteldata?.status === "inactive") {
  return {
    ...baseMetadata,
    robots: { index: false, follow: false },
  };
}
```

### C3. Fix undefined URL edge case in hotel page schema
**File:** `src/app/hotels/[...id]/page.tsx:40`
**Impact:** Eliminates broken `"url": "https://menuthere.com/hotels//undefined"` schema
```typescript
const hotelId = isUUID(hotelIds?.[0] || "") ? hotelIds?.[0] : hotelIds?.[1];
// Add null guard:
if (!hotelId || !slugName) return null; // or redirect to 404
```

### C4. Add HSTS security header
**File:** `vercel.json`
**Impact:** Enforces HTTPS; ranking signal; removes security gap
```json
{ "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" }
```

---

## HIGH — Fix Within 1 Week (Significant ranking or trust impact)

### H1. Fix sitemap lastmod dates
**File:** `src/app/sitemap.ts:43,49`
**Impact:** Restores Google's trust in lastmod signal for crawl prioritization
- Store real page modification dates (in a config file or CMS field)
- Never use `new Date()` or a hardcoded date for all entries
- Add `/refund-policy`, `/tutorials`, `/compare` (parent hub) to sitemap
- Remove `/login`, `/profile`, `/reel-analytics` if present

### H2. Fix FAQ.tsx client-side rendering issue
**File:** `src/components/home/FAQ.tsx:1`
**Impact:** Makes 11 FAQ items indexable on first crawl; enables FAQ rich result on homepage
- Remove `"use client"` directive
- Move state management (accordion) to a separate `FAQAccordion` client component
- Keep the FAQ question/answer data in the server component

### H3. Add FAQPage schema to /help-center
**File:** `src/app/help-center/page.tsx`
**Impact:** Immediate FAQ rich result eligibility for 11 FAQ items (server-rendered)
- Use the full JSON-LD from the schema audit report
- Add as a `<JsonLd>` component at the top of the page

### H4. Add FAQPage schema to /solutions/google-business
**File:** `src/app/solutions/google-business/page.tsx`
**Impact:** FAQ rich results for high-intent "Google menu sync" queries
- 8 FAQ items present in the page source — use the JSON-LD from the schema audit

### H5. Update /compare title year
**File:** `src/app/compare/page.tsx:9`
**Impact:** Removes stale freshness signal; 5-second fix
```typescript
title: "Menuthere vs Competitors — Digital Menu Comparisons (2026)",
```

### H6. Normalize customer count across all pages
**Files:** All pages with customer count claims
**Impact:** Eliminates quality rater trust flag; improves AI citation reliability
- Decide on one accurate number (verify with actual data)
- Update homepage, /solutions/restaurants, /solutions/agencies, all schema blocks
- Add "as of [Month Year]" qualifier

### H7. Replace gmail contact email
**Files:** `src/app/(root)/page.tsx` (Organization schema), help-center, footer
**Impact:** Removes quality rater E-E-A-T red flag; signals professional operation
- Register `support@menuthere.com` or `hello@menuthere.com`
- Update all schema blocks and on-page contact references

### H8. Fix /solutions/agencies H1 grammar
**File:** `src/app/solutions/agencies/page.tsx`
**Impact:** Removes editorial quality signal flagged by quality raters
```
// BROKEN: "Earn Up to 30% Month Per Sale, Lifetime Recurring Commissions"
// FIX: "Earn Up to 30% Recurring Commission Per Sale, For Life"
```

### H9. Resolve USD/INR currency inconsistency
**File:** `src/app/solutions/agencies/page.tsx`
**Impact:** Eliminates factual contradiction between /pricing (₹299) and /agencies ($30)
- Add a note explaining: "International partners billed in USD; India pricing in INR — see pricing page"
- Or align to one currency with a converter note

---

## MEDIUM — Fix Within 1 Month

### M1. Add BreadcrumbList + FAQPage to /solutions/agencies
**File:** `src/app/solutions/agencies/page.tsx`
- Full JSON-LD available in the schema audit report

### M2. Add BreadcrumbList to /solutions/owners
**File:** `src/app/solutions/owners/page.tsx`

### M3. Add Offer/WebPage schema to /pricing
**File:** `src/app/pricing/page.tsx`
- Include both INR and USD offer blocks (geolocation-aware if possible)

### M4. Fix MenuSection name bug in hotel pages
**File:** `src/app/hotels/[...id]/page.tsx:483`
- All menu sections currently receive the name of the first category in the entire menu
- Fix the reduce/map logic to use the category key as the section name

### M5. Add FAQPage JSON-LD to homepage (server-side)
**File:** `src/app/(root)/page.tsx`
- Must be injected as a server-side `<JsonLd>` block, NOT inside the `FAQ.tsx` component
- The FAQ.tsx `"use client"` issue (H2) must be fixed first or done independently

### M6. Remove unused Google Fonts
**File:** `src/app/layout.tsx:74–100`
- Audit which font is actually applied to `body` (likely Geist)
- Remove unused: Inter, Poppins, Roboto, Dancing Script
- Reduces CLS risk and network requests

### M7. Host SuisseIntl fonts locally
**File:** `src/app/layout.tsx:118–136`
- Move fonts from `db.onlinewebfonts.com` to `/public/fonts/`
- Use `next/font/local` for consistent loading behavior

### M8. Fix ratingCount type in SoftwareApplication schema
**File:** `src/app/(root)/page.tsx`
```json
"ratingCount": 600  // number, not "600" string
```

### M9. Fix contactType in Organization schema
**File:** `src/app/(root)/page.tsx`
```json
"contactType": "customer support"  // not "customer service"
```

### M10. Fix ListItem URL property in compare pages
**Files:** `src/app/compare/menuthere-vs-*/page.tsx`
```json
// WRONG:
{ "@type": "ListItem", "url": "https://..." }
// FIX:
{ "@type": "ListItem", "item": { "@type": "Thing", "@id": "https://..." } }
```

### M11. Add CSP header to vercel.json
**File:** `vercel.json`
- Enumerate all allowed script sources: Google GTM, PostHog (us.i.posthog.com), Apollo (assets.apollo.io), SuisseIntl CDN
- Use `report-only` mode first to validate before enforcing

### M12. Add Privacy Policy and Terms of Service
- These are required for E-E-A-T trust signals under September 2025 QRG
- Link from footer on all pages
- Add to sitemap

### M13. Implement SSR for hotel pages (major fix)
**File:** `src/app/hotels/[...id]/page.tsx`
- Hotel pages are a significant long-tail SEO opportunity (`"[Restaurant Name] menu"` queries)
- Ensure SSR is confirmed working before re-adding to sitemap
- Add `noindex` to closed/inactive restaurant pages (see C2)
- After SSR is confirmed: re-add hotel pages to a separate `sitemap-hotels.xml`

---

## LOW — Backlog

### L1. Add AI crawler directives to robots.txt
```
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /
```
(or allow — make explicit policy decision)

### L2. Add `servesCuisine` and `priceRange` to Restaurant schema
**File:** `src/app/hotels/[...id]/page.tsx`
- Improves Restaurant rich result eligibility in Google Knowledge Panels

### L3. Evaluate SearchAction in WebSite schema
**File:** `src/app/(root)/page.tsx`
- Current target is `/help-center?q=` — Google's Sitelinks Search Box requires site-wide search
- Either implement site-wide search or remove the SearchAction

### L4. Add hreflang for international markets
- Site serves India (INR) and international (USD) with geolocation detection
- No hreflang annotations — Google may attribute content to wrong region
- Implement x-default + en-IN + en at minimum

### L5. Implement sitemap index structure (after hotel SSR)
```xml
<sitemapindex>
  <sitemap><loc>https://menuthere.com/sitemap-core.xml</loc></sitemap>
  <sitemap><loc>https://menuthere.com/sitemap-hotels.xml</loc></sitemap>
</sitemapindex>
```

### L6. Add last-updated dates to compare pages
- Visible "Last updated: February 2026" line on each comparison page
- Freshness signal for quality raters and AI systems

### L7. Add third-party review platform presence
- Create and populate G2 or Capterra profile
- Even 10–15 verified reviews creates external authority signals

### L8. Add `priority` prop to hero LCP image
**File:** `src/app/(root)/page.tsx`
- The primary above-fold image should use `<Image priority />` in Next.js

### L9. Expand help center to 30+ FAQ items
- Current 11 items insufficient for platform complexity
- Add: billing questions, Google sync troubleshooting, analytics guide, QR customization

### L10. Add author attribution to content pages
- Even a single named author per page with a brief bio
- Improves Expertise signal in E-E-A-T assessment

---

## Scoring Impact Estimate

If all Critical and High items are resolved:

| Category | Current | After C+H fixes |
|---|---|---|
| Technical SEO | 61 | ~80 |
| Content Quality | 51 | ~68 |
| On-Page SEO | 60 | ~72 |
| Schema | 45 | ~70 |
| AI Readiness | 28 | ~52 |
| **Overall** | **54** | **~72** |
