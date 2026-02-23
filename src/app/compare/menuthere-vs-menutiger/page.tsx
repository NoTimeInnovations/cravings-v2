import { Metadata } from "next";
import Link from "next/link";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Check, X, Minus } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Menuthere vs MenuTiger (2025) — Full QR Menu Comparison",
  description:
    "Menuthere vs MenuTiger: unlimited plan vs 7-item cap, ₹299/mo vs $46/mo, Google Business sync vs none. Best for Indian restaurants.",
  alternates: { canonical: "https://menuthere.com/compare/menuthere-vs-menutiger" },
  openGraph: {
    title: "Menuthere vs MenuTiger (2025) — Full QR Menu Comparison",
    description:
      "Menuthere vs MenuTiger: unlimited plan vs 7-item cap, ₹299/mo vs $46/mo, Google Business sync vs none. Best for Indian restaurants.",
    url: "https://menuthere.com/compare/menuthere-vs-menutiger",
    type: "website",
  },
};

const comparisonSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Menuthere vs MenuTiger Comparison",
  description:
    "A detailed comparison of Menuthere and MenuTiger QR menu platforms for restaurants, cafes, and hotels.",
  url: "https://menuthere.com/compare/menuthere-vs-menutiger",
  mainEntity: {
    "@type": "ItemList",
    name: "Digital Menu Platform Comparison",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Menuthere",
        url: "https://menuthere.com",
        description:
          "Free QR code digital menu with Google Business sync, real-time updates, analytics, and dynamic offers. Trusted by 600+ restaurants. INR pricing from ₹299/month.",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "MenuTiger",
        url: "https://www.menutiger.com",
        description:
          "Global QR ordering platform starting at $17/month with a heavily restricted free tier (7 items max). No Google Business sync.",
      },
    ],
  },
};

type FeatureValue = true | false | null | string;

interface Feature {
  name: string;
  menuthere: FeatureValue;
  menutiger: FeatureValue;
  highlight?: boolean;
}

const features: Feature[] = [
  {
    name: "Free plan — unlimited menu items",
    menuthere: true,
    menutiger: "7 items max",
    highlight: true,
  },
  {
    name: "Paid plan starting price",
    menuthere: "₹299/mo (~$3.60)",
    menutiger: "$17/mo (Regular)",
  },
  {
    name: "Most popular paid tier",
    menuthere: "₹299/mo",
    menutiger: "$46/mo (Advanced)",
    highlight: true,
  },
  { name: "Transaction commissions", menuthere: false, menutiger: false },
  { name: "QR code digital menu", menuthere: true, menutiger: true },
  { name: "Real-time menu updates", menuthere: true, menutiger: true },
  {
    name: "Google Business Profile sync",
    menuthere: true,
    menutiger: false,
    highlight: true,
  },
  {
    name: "Google Maps menu integration",
    menuthere: true,
    menutiger: false,
    highlight: true,
  },
  { name: "Analytics dashboard", menuthere: true, menutiger: true },
  { name: "Dynamic offers & promotions", menuthere: true, menutiger: false },
  { name: "Kitchen Display System (KDS)", menuthere: false, menutiger: "From $46/mo" },
  { name: "POS integration (Loyverse)", menuthere: false, menutiger: true },
  {
    name: "Multi-payment gateways (Stripe, PayPal)",
    menuthere: false,
    menutiger: true,
  },
  { name: "Multi-language support", menuthere: true, menutiger: true },
  { name: "No customer app download", menuthere: true, menutiger: true },
  { name: "INR / India pricing", menuthere: true, menutiger: false, highlight: true },
  { name: "White-label / branding", menuthere: false, menutiger: "Premium only ($119/mo)" },
  { name: "Free marketing templates", menuthere: false, menutiger: true },
  { name: "Setup time", menuthere: "< 5 minutes", menutiger: "15–30 minutes" },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true)
    return (
      <span className="flex items-center justify-center">
        <Check className="w-5 h-5 text-green-500" />
      </span>
    );
  if (value === false)
    return (
      <span className="flex items-center justify-center">
        <X className="w-5 h-5 text-red-400" />
      </span>
    );
  if (value === null)
    return (
      <span className="flex items-center justify-center">
        <Minus className="w-4 h-4 text-stone-400" />
      </span>
    );
  return (
    <span className="text-stone-700 text-sm font-medium text-center block leading-snug">
      {value}
    </span>
  );
}

const faqs = [
  {
    q: "Is MenuTiger's free plan actually free?",
    a: "MenuTiger has a free tier, but it's heavily restricted — only 7 menu categories and 7 items maximum. That's not enough for most real restaurants. Menuthere's free plan has unlimited menu items and categories with no such caps.",
  },
  {
    q: "How does Menuthere pricing compare to MenuTiger?",
    a: "MenuTiger's most popular 'Advanced' plan costs $46/month (~₹3,800). Menuthere's paid plan starts at ₹299/month (~$3.60) — over 10x cheaper. For Indian restaurants especially, Menuthere is far more affordable.",
  },
  {
    q: "Does MenuTiger sync with Google Business Profile?",
    a: "No. MenuTiger does not offer Google Business Profile or Google Maps integration. Menuthere automatically syncs your menu to Google, helping your restaurant appear in local searches and driving more footfall.",
  },
  {
    q: "Does MenuTiger have a Kitchen Display System?",
    a: "Yes — MenuTiger includes a KDS from their $46/month Advanced plan. Menuthere does not currently offer a KDS. If kitchen display is critical to your operations, MenuTiger's Advanced tier may be worth considering.",
  },
  {
    q: "Which is better for restaurants in India?",
    a: "Menuthere is built for India — INR pricing at ₹299/month, India-based support, Google Business sync for local discovery, and a genuinely unlimited free plan. MenuTiger is a US-dollar-priced global platform with no INR option.",
  },
];

export default function MenuthereVsMenuTigerPage() {
  return (
    <main className="min-h-screen bg-white geist-font">
      <JsonLd data={comparisonSchema} />

      {/* Hero */}
      <section className="flex items-center justify-center px-5 pb-16 pt-32 md:pt-40 bg-[#fcfbf7]">
        <div className="w-full max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/70 text-orange-600 text-xs font-medium mb-6">
            Comparison · 2025
          </div>
          <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
            Menuthere vs{" "}
            <span className="text-stone-400 italic">MenuTiger</span>
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-xl mx-auto mt-5 leading-relaxed">
            Both claim a free plan and no commissions — but one caps you at 7
            menu items and costs $46/month to unlock basic features. Here's the
            full comparison.
          </p>
          <div className="flex items-center gap-3 mt-8 justify-center">
            <ButtonV2 href="/get-started" variant="primary">
              Try Menuthere Free
            </ButtonV2>
            <ButtonV2 href="/pricing" variant="secondary">
              See Pricing
            </ButtonV2>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* Quick Verdict */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-8">
            Quick verdict
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Menuthere */}
            <div className="rounded-xl border-2 border-orange-400 bg-orange-50/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-stone-900 text-lg">Menuthere</span>
                <span className="ml-auto text-xs font-medium bg-orange-500 text-white px-2.5 py-1 rounded-full">
                  Recommended
                </span>
              </div>
              <ul className="space-y-2.5 text-sm text-stone-700">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Truly unlimited free plan</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Paid from ₹299/month (~$3.60) — 10x cheaper</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Google Business Profile sync</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> INR pricing — built for India</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Dynamic offers &amp; promotions engine</li>
              </ul>
              <p className="text-xs text-stone-500 mt-5 leading-relaxed">
                Best for: Indian restaurants, cafes, and hotels wanting an
                affordable, genuinely unlimited free plan with Google
                visibility.
              </p>
            </div>
            {/* MenuTiger */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                  <Minus className="w-4 h-4 text-stone-500" />
                </div>
                <span className="font-semibold text-stone-900 text-lg">MenuTiger</span>
              </div>
              <ul className="space-y-2.5 text-sm text-stone-700">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Kitchen Display System (from $46/mo)</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Multiple payment gateways</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Loyverse POS integration</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> Free plan capped at 7 items</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> Popular tier costs $46/month</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> No Google Business sync</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> USD pricing only (no INR)</li>
              </ul>
              <p className="text-xs text-stone-500 mt-5 leading-relaxed">
                Best for: Restaurants that need a Kitchen Display System or
                POS integration and are willing to pay $46+/month for those
                features.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* Feature Comparison Table */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-10">
            Feature comparison
          </h2>
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-5 py-4 font-semibold text-stone-600 w-1/2">
                    Feature
                  </th>
                  <th className="text-center px-5 py-4 font-semibold text-orange-600 w-1/4">
                    Menuthere
                  </th>
                  <th className="text-center px-5 py-4 font-semibold text-stone-500 w-1/4">
                    MenuTiger
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, i) => (
                  <tr
                    key={i}
                    className={`border-b border-stone-100 last:border-b-0 ${
                      feature.highlight ? "bg-orange-50/30" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5 text-stone-700 font-medium">
                      {feature.name}
                      {feature.highlight && (
                        <span className="ml-2 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
                          Key
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <FeatureCell value={feature.menuthere} />
                    </td>
                    <td className="px-5 py-3.5">
                      <FeatureCell value={feature.menutiger} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* Pricing breakdown */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-4">
            Pricing breakdown
          </h2>
          <p className="text-stone-500 mb-10 text-sm leading-relaxed">
            Annual cost comparison for a typical Indian restaurant:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border-2 border-orange-300 p-6">
              <h3 className="font-semibold text-stone-900 text-lg mb-4">Menuthere</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600">Free plan</span>
                  <span className="font-semibold text-green-600">₹0 / year</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Paid plan (annual)</span>
                  <span className="font-semibold text-stone-900">₹2,999 / year</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Transaction fees</span>
                  <span className="font-semibold text-green-600">₹0</span>
                </div>
                <div className="border-t border-stone-200 pt-3 flex justify-between">
                  <span className="font-semibold text-stone-900">Annual cost (paid)</span>
                  <span className="font-bold text-orange-600">₹2,999 / year</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-stone-900 text-lg mb-4">MenuTiger</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600">Free plan</span>
                  <span className="font-semibold text-stone-600">7 items only</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Regular plan ($17/mo)</span>
                  <span className="font-semibold text-stone-900">~₹16,900 / year</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Advanced plan ($46/mo)</span>
                  <span className="font-semibold text-red-500">~₹45,700 / year</span>
                </div>
                <div className="border-t border-stone-200 pt-3 flex justify-between">
                  <span className="font-semibold text-stone-900">Popular tier (annual)</span>
                  <span className="font-bold text-stone-700">~₹45,700 / year</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-4">
            * Exchange rate: 1 USD ≈ ₹83. MenuTiger pricing in USD only.
          </p>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* The Free Plan Trap */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-4">
            Not all free plans are equal
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed mb-10 max-w-2xl">
            MenuTiger advertises a free plan, but the limits make it unusable
            for most real restaurants.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-xs text-stone-500 font-bold flex-shrink-0">
                  T
                </span>
                MenuTiger free plan limits
              </h3>
              <ul className="space-y-3 text-sm text-stone-600">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  Max 7 menu categories
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  Max 7 menu items total
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  Max 200–250 orders/month
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  1 store, 10 tables only
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  Effectively forces upgrade immediately
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                  M
                </span>
                Menuthere free plan
              </h3>
              <ul className="space-y-3 text-sm text-stone-600">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Unlimited menu categories
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Unlimited menu items
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  QR code generation included
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Instant real-time updates
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Free forever — no expiry
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* When MenuTiger Wins */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-4">
            When MenuTiger might be worth it
          </h2>
          <p className="text-stone-500 mb-8 text-sm leading-relaxed max-w-2xl">
            MenuTiger has genuine strengths for specific use cases:
          </p>
          <ul className="space-y-4">
            {[
              "You need a Kitchen Display System (KDS) integrated with your QR ordering — MenuTiger includes this from $46/month",
              "You require Loyverse POS integration for your front-of-house operations",
              "You need multi-gateway payment processing (Stripe, PayPal, Adyen, Apple Pay) built into the ordering flow",
              "You want white-label branding on all customer-facing menus (available on their $119/month Premium plan)",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-stone-500 text-xs font-bold">{i + 1}</span>
                </div>
                <span className="text-stone-600 text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* FAQ */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-3xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-10">
            Common questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border-b border-stone-100 pb-6 last:border-b-0 last:pb-0"
              >
                <h3 className="font-semibold text-stone-900 mb-2 text-base">
                  {faq.q}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* Final CTA */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-3xl mx-auto px-6 md:px-16 text-center">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-4">
            A free plan that's actually free — and 10x cheaper when you upgrade
          </h2>
          <p className="text-stone-500 mb-8 text-sm leading-relaxed max-w-lg mx-auto">
            No 7-item cap. No $46/month to unlock basics. Join 600+
            restaurants using Menuthere to manage menus, grow on Google, and
            run promotions from ₹299/month.
          </p>
          <div className="flex items-center gap-3 justify-center">
            <ButtonV2 href="/get-started" variant="primary">
              Get Started Free
            </ButtonV2>
            <ButtonV2 href="/pricing" variant="secondary">
              View Pricing
            </ButtonV2>
          </div>
          <p className="text-xs text-stone-400 mt-4">
            Also compare:{" "}
            <Link href="/compare" className="underline hover:text-stone-600">
              All comparisons
            </Link>
          </p>
        </div>
      </section>

      <StartFreeTrailSection />
      <Footer appName="Menuthere" />
      <WhatsAppButton />
    </main>
  );
}
