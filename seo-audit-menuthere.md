# SEO Audit Report: menuthere.com
**Date:** February 23, 2026 | **Stack:** Next.js App Router · Vercel · Cloudflare CDN
**Business Type:** B2B SaaS — QR Code Digital Menu Platform (India-focused)

---

## SEO Health Score: 57 / 100

| Category | Weight | Score | Weighted |
|---|---|---|---|
| Technical SEO | 25% | 59/100 | 14.8 |
| Content Quality & E-E-A-T | 25% | 52/100 | 13.0 |
| On-Page SEO | 20% | 65/100 | 13.0 |
| Schema / Structured Data | 10% | 60/100 | 6.0 |
| Performance (CWV) | 10% | 62/100 | 6.2 |
| Images | 5% | 70/100 | 3.5 |
| AI Search Readiness | 5% | 48/100 | 2.4 |
| **Total** | | | **57/100** |

---

## Critical Issues (Fix Immediately)

### 1. Missing Canonical Tags Site-Wide
All pages except the homepage lack canonical tags — including all 558 restaurant menu pages. This is the single highest-risk indexability issue.

**Fix (Next.js App Router):**
```typescript
// app/pricing/page.tsx
export const metadata: Metadata = {
  alternates: { canonical: 'https://menuthere.com/pricing' },
};

// app/hotels/[name]/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    alternates: {
      canonical: `https://menuthere.com/hotels/${params.name}/${params.id}`,
    },
  };
}
```

### 2. Soft 404s Returning HTTP 200
The 404 page returns HTTP 200 with **two conflicting robots meta tags** simultaneously:
```html
<meta name="robots" content="noindex"/>
<meta name="robots" content="index, follow"/>
```
Google applies the most restrictive rule, but this is an implementation defect. Fix the Next.js not-found page to return a true HTTP 404.

### 3. www Duplicate Content
`https://www.menuthere.com` and `https://menuthere.com` both return HTTP 200 with identical content and no redirect. Add a www → non-www 308 redirect in Vercel project settings.

### 4. About Page is a 404
`/about` returns HTTP 200 with a Next.js shell rendering "Not Found" (10 words). Google Quality Raters explicitly check *Who is responsible for this website*. No About page = critical E-E-A-T failure. Build a real About page with founder story, team, and founding year (minimum 600 words).

### 5. Unverifiable AggregateRating Schema
The `SoftwareApplication` schema declares `ratingValue: 4.8` / `ratingCount: 500` with no visible review widget, no link to a third-party review platform, and no verifiable source. Under Google's QRG this is a trustworthiness red flag. Either connect to a real Trustpilot/G2/Capterra profile and display it visibly, or remove the schema.

---

## High Priority Issues (Fix Within 1 Week)

### 6. Zero Structured Data on 558 Restaurant Menu Pages
The platform's core product pages — restaurant menus — have no schema markup at all. These pages contain rich, indexable data: business name, phone, location, menu items, and prices. This is the largest structured data gap on the site.

**Implement `Restaurant` + `Menu` JSON-LD on every hotel page:**
```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Donut Cafe",
  "telephone": "+918891286868",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Kozhikode",
    "addressCountry": "IN"
  },
  "hasMenu": {
    "@type": "Menu",
    "hasMenuSection": [{
      "@type": "MenuSection",
      "name": "Shawaya",
      "hasMenuItem": [{
        "@type": "MenuItem",
        "name": "Kuboos Plate",
        "offers": { "@type": "Offer", "price": "100", "priceCurrency": "INR" }
      }]
    }]
  }
}
```

### 7. CLS Risk: Hero Images Have No Dimensions
Four above-the-fold images (`brisket.webp`, `burger.webp`, `salmon.webp`) use raw `<img>` tags without `width`/`height` attributes. This causes layout shifts on every page load. Estimated CLS: **0.15–0.25** (fails the ≤0.1 threshold).

**Fix — switch to Next.js `<Image priority>`:**
```tsx
import Image from 'next/image';
<Image
  src="/dashboard/brisket.webp"
  alt="Smoked BBQ Brisket"
  width={800} height={600}
  priority
  className="w-full h-full object-cover"
/>
```

### 8. `Loading $Menuthere...` Rendered as an H2
A Next.js Suspense boundary artifact is writing a loading-state string inside a semantic `<h2>` tag. Googlebot reads this as real heading content. Replace with a visual skeleton:
```tsx
<Suspense fallback={<div className="h-8 w-48 animate-pulse bg-stone-100 rounded" />}>
  <BrandComponent />
</Suspense>
```

### 9. Duplicate H1 on Homepage
Two H1 tags exist: *"Create your restaurant's digital menu in minutes"* (hero) and *"Get your restaurant online in under 2 minutes."* (CTA section). Demote the second to an H2.

### 10. Missing Security Headers
None of the following are present:

| Header | Risk |
|---|---|
| `Content-Security-Policy` | High — no XSS mitigation |
| `X-Frame-Options` | Medium — clickjacking vulnerability |
| `X-Content-Type-Options` | Medium — MIME sniffing |

**Add to `vercel.json`:**
```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
    ]
  }]
}
```

### 11. Social Proof Numbers Are Inconsistent
- Homepage body copy: "600+ restaurants"
- `/solutions/restaurants` meta description: "Trusted by 5000+ restaurants across India"
- Schema `ratingCount`: 500

Pick one accurate number and apply it everywhere: meta descriptions, page copy, schema markup, and structured data.

### 12. Gmail Contact Address
`menuthere@gmail.com` appears in Organization schema and across the site. Quality Raters are explicitly trained to flag this as a low-trust signal for a commercial SaaS. Switch to `support@menuthere.com`.

### 13. FAQPage Schema Must Be Removed
FAQPage rich results were restricted by Google in **August 2023** — they are now only shown for official government and authoritative health sites. A restaurant SaaS does not qualify. This schema block is wasted markup and should be deleted. The FAQ content itself is excellent and should stay on the page — just remove the schema wrapper.

### 14. Test/Sample Pages Are Live and Indexed
`/hotels/sample/...` and `/hotels/newtest/...` are in the sitemap with `robots: index, follow`. Add a quality gate to the sitemap generator:
```typescript
// Exclude test/placeholder accounts from sitemap
if (['sample', 'newtest', 'demo', 'test'].includes(params.name.toLowerCase())) {
  return { robots: { index: false, follow: false } };
}
```

---

## Medium Priority Issues (Fix Within 1 Month)

### 15. JavaScript Bundle Size: 1.2MB Uncompressed
One chunk (`7b94c9e8082423a5.js`) is 512KB alone. Run `@next/bundle-analyzer` and apply dynamic imports for non-critical components:
```tsx
const HeavyComponent = dynamic(() => import('./HeavyComponent'), { ssr: false });
```

### 16. 230KB HTML Document
The homepage HTML is 3–5× larger than optimal. The Next.js RSC payload includes the full logo carousel (16+ images × srcSet variants) serialized into the initial HTML. Defer via Suspense:
```tsx
'use client';
const LogoCarousel = dynamic(() => import('./LogoCarousel'), {
  ssr: false,
  loading: () => <div className="h-24" />,
});
```

### 17. Mixed Case Hotel URL Slugs
Slugs like `Donut-Cafe`, `PADDOCK`, `UC-RESTAURANT` create potential duplicate URL variants. Normalize to lowercase via Next.js middleware:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, { status: 308 });
  }
}
export const config = { matcher: '/hotels/:path*' };
```

### 18. Meta Description Issues
| Page | Length | Issue |
|---|---|---|
| Homepage | 192 chars | Too long — truncated in SERPs |
| `/solutions/restaurants` | 183 chars | Too long — truncated in SERPs |
| `/pricing` | 93 chars | Too short — Google may auto-generate |

Aim for 140–158 characters on all pages.

### 19. Sitemap `lastmod` Are Fake Build Timestamps
All 573 URLs share one of two timestamps differing by 1ms — clearly generated at build time. Google will stop trusting this signal. Use real `updated_at` timestamps from the database per restaurant page.

### 20. Remove `<priority>` and `<changefreq>` from Sitemap
Both tags are completely ignored by Google. They add XML bloat with zero benefit.

### 21. HSTS Missing Preload Directives
Current: `max-age=63072000` only. Required for preload list submission:
```
strict-transport-security: max-age=63072000; includeSubDomains; preload
```
Then submit to [hstspreload.org](https://hstspreload.org).

### 22. Thin Content on Solution Pages
| Page | Word Count | Minimum | Status |
|---|---|---|---|
| `/solutions/owners` | 470 | 800 | FAIL |
| `/solutions/agencies` | 688 | 800 | FAIL |
| `/solutions/restaurants` | 770 | 800 | Borderline |
| `/about` | 10 | 500 | Critical FAIL |

### 23. 38 Touch Targets Below 48×48px (39% Failure Rate)
Both primary CTAs ("Start for free", "Book a Demo") are 42px tall — 6px short of the Google minimum. Fix with `min-height: 48px` across all interactive elements.

### 24. No Hreflang Tags
Organization schema declares English, Hindi, and Malayalam language support, but zero `hreflang` tags exist on any page. If content is available in multiple languages, implement hreflang.

---

## Low Priority / Backlog

### 25. Add WebSite Schema with SearchAction
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Menuthere",
  "url": "https://menuthere.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://menuthere.com/help-center?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### 26. Add BreadcrumbList to All Solution Pages
Unlocks breadcrumb rich results and improves SERP CTR. Apply to all `/solutions/*` and `/hotels/*` pages.

### 27. Add `/get-started` to Sitemap
This conversion-critical page is crawlable, indexed, and `robots.txt`-allowed but absent from the sitemap.

### 28. Cloudflare Not Caching Homepage HTML
`cf-cache-status: DYNAMIC` — every user hits Vercel origin. Add a Cloudflare Cache Rule for `/` with a 60–180 second TTL.

### 29. Static Image Cache TTL Too Short
Hero images have only `max-age=86400` (1 day). Extend to 7–30 days via `next.config.js` headers.

### 30. Remove Meta Keywords Tag
Ignored by Google since 2009.

---

## Content Strategy Recommendations

### Launch a Blog with 4 Foundational Articles
- "What Is a QR Code Menu and How Does It Work?" *(definitional — AI Overview candidate)*
- "How to Sync Your Restaurant Menu to Google Business Profile in 2026" *(high purchase intent)*
- "Digital Menu vs. Printed Menu: The Real Cost for Restaurant Owners" *(comparison)*
- "5 Ways Independent Restaurants Can Compete with Chains Using Digital Tools" *(thought leadership)*

### Reframe the Hero Around the Strongest Differentiator
Google Business Profile menu sync is the most defensible, specific differentiator. Suggested reframe:
> *"The only QR menu platform that syncs directly to Google Business Profile — update once, live everywhere."*

### Build One Named Customer Case Study
A single 600–800 word case study with a real restaurant, real results, and measurable outcomes simultaneously addresses Experience, Expertise, and Authoritativeness.

---

## Quick-Win Checklist

- [ ] Add `metadata.alternates.canonical` to every Next.js page
- [ ] Fix 404 page to return HTTP 404 status; remove duplicate robots meta
- [ ] Add www → non-www 308 redirect in Vercel settings
- [ ] Add security headers to `vercel.json`
- [ ] Add `priority` prop to LCP hero image
- [ ] Replace `Loading $Menuthere...` H2 with visual skeleton
- [ ] Remove or noindex `/hotels/sample/...` and `/hotels/newtest/...`
- [ ] Remove `FAQPage` schema block
- [ ] Fix `ratingCount` from 500 → consistent number across all copy and schema
- [ ] Standardize social proof number site-wide (600+ vs 5000+)
- [ ] Trim homepage meta description to under 160 characters
- [ ] Demote second H1 to H2
- [ ] Remove meta keywords tag
- [ ] Add `<meta name="theme-color" content="#f97316">`
- [ ] Switch contact email from Gmail to branded domain

---

## E-E-A-T Score Breakdown

| Dimension | Score | Assessment |
|---|---|---|
| Experience | 18/40 | Weak: no case studies, anonymous testimonials only |
| Expertise | 20/40 | Moderate: FAQ schema is the strongest asset |
| Authoritativeness | 15/40 | Low: no press, no verifiable third-party recognition |
| Trustworthiness | 22/50 | Moderate: legal pages pass; Gmail + no About page fail |
| **E-E-A-T Overall** | **38/100** | Below threshold for commercial trust |

---

## Core Web Vitals Estimates

| Metric | Estimated | Threshold | Status |
|---|---|---|---|
| LCP | ~2.5–3.5s | ≤2.5s Good | Needs Improvement |
| INP | ~150–250ms | ≤200ms Good | Borderline |
| CLS | ~0.15–0.25 | ≤0.1 Good | Fails |
| TTFB | ~210–260ms | ≤200ms | Acceptable |

---

*Generated by Claude Code SEO Audit — menuthere.com — February 23, 2026*
