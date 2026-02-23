import { Metadata } from "next";
import Link from "next/link";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Check, X, Minus } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Menuthere vs Yumm.menu (2025) — Full QR Menu Comparison",
  description:
    "Menuthere vs Yumm: Google Business sync, analytics, and offers vs a basic QR display. See which digital menu platform grows your restaurant.",
  alternates: { canonical: "https://menuthere.com/compare/menuthere-vs-yumm" },
  openGraph: {
    title: "Menuthere vs Yumm.menu (2025) — Full QR Menu Comparison",
    description:
      "Menuthere vs Yumm: Google Business sync, analytics, and offers vs a basic QR display. See which digital menu platform grows your restaurant.",
    url: "https://menuthere.com/compare/menuthere-vs-yumm",
    type: "website",
  },
};

const comparisonSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Menuthere vs Yumm Comparison",
  description:
    "A detailed comparison of Menuthere and Yumm digital menu platforms for restaurants, cafes, and hotels.",
  url: "https://menuthere.com/compare/menuthere-vs-yumm",
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
          "Free QR code digital menu with Google Business sync, real-time updates, analytics, and dynamic offers. Trusted by 600+ restaurants.",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Yumm",
        url: "https://yumm.menu",
        description:
          "Basic QR digital menu builder with allergen management and multilingual support. No analytics, no offers engine, no Google sync.",
      },
    ],
  },
};

type FeatureValue = true | false | null | string;

interface Feature {
  name: string;
  menuthere: FeatureValue;
  yumm: FeatureValue;
  highlight?: boolean;
}

const features: Feature[] = [
  { name: "Free plan available", menuthere: true, yumm: true },
  { name: "Transparent public pricing", menuthere: true, yumm: false, highlight: true },
  { name: "Transaction commissions", menuthere: false, yumm: null },
  { name: "QR code digital menu", menuthere: true, yumm: true },
  { name: "Real-time menu updates", menuthere: true, yumm: true },
  { name: "Google Business Profile sync", menuthere: true, yumm: false, highlight: true },
  { name: "Google Maps menu integration", menuthere: true, yumm: false, highlight: true },
  { name: "Analytics dashboard", menuthere: true, yumm: false, highlight: true },
  { name: "Dynamic offers & promotions", menuthere: true, yumm: false, highlight: true },
  { name: "Scan volume & peak hour insights", menuthere: true, yumm: false },
  { name: "Best-seller / Must-Try badges", menuthere: true, yumm: false },
  { name: "Allergen & dietary info", menuthere: true, yumm: true },
  { name: "Multi-language support", menuthere: true, yumm: true },
  { name: "No customer app download", menuthere: true, yumm: true },
  { name: "Website embed / integration", menuthere: false, yumm: true },
  { name: "Event / popup menus", menuthere: false, yumm: true },
  { name: "Unlimited menu items (free)", menuthere: true, yumm: "Limited" },
  { name: "Setup time", menuthere: "< 5 minutes", yumm: "5–15 minutes" },
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
        <span className="sr-only">Unknown</span>
      </span>
    );
  return (
    <span className="text-stone-700 text-sm font-medium text-center block">
      {value}
    </span>
  );
}

const faqs = [
  {
    q: "Is Yumm.menu free?",
    a: "Yumm.menu has a free tier for basic QR menu creation. However, their pricing page is not publicly accessible, making it hard to compare plans. Menuthere's free plan is fully transparent — unlimited items, QR code, and live updates at no cost.",
  },
  {
    q: "Does Yumm have analytics?",
    a: "No. Yumm.menu is focused on menu display and does not offer analytics, scan tracking, or peak-hour insights. Menuthere includes a full analytics dashboard showing scan volumes, top items, device usage, and busy hours.",
  },
  {
    q: "Does Yumm sync with Google Business Profile?",
    a: "No. Yumm does not integrate with Google Business Profile or Google Maps. Menuthere automatically syncs your menu to Google, helping customers discover your restaurant directly in Search and Maps.",
  },
  {
    q: "Can I run offers or promotions with Yumm?",
    a: "No. Yumm is a menu display tool only — it does not have a promotions or offers engine. Menuthere includes dynamic offers, time-based deals, flash sales, and special badges like Must-Try and Chef's Choice.",
  },
  {
    q: "Which is better for restaurant growth?",
    a: "Menuthere is built for growth — Google sync drives organic footfall, analytics surface what's selling, and the offers engine increases average order value. Yumm is better suited for businesses that only need a simple digital menu display with no marketing features.",
  },
];

export default function MenuthereVsYummPage() {
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
            <span className="text-stone-400 italic">Yumm</span>
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-xl mx-auto mt-5 leading-relaxed">
            Both offer free QR digital menus — but only one drives Google
            traffic, tracks analytics, and runs promotions for you. Here's the
            full picture.
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
            {/* Menuthere card */}
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
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Free plan — transparent &amp; unlimited</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Google Business Profile sync</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Analytics — scans, top items, peak hours</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Dynamic offers &amp; promotions engine</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Zero commissions on any plan</li>
              </ul>
              <p className="text-xs text-stone-500 mt-5 leading-relaxed">
                Best for: Restaurants that want a free menu <em>plus</em> tools
                to grow — Google visibility, analytics, and promotions.
              </p>
            </div>
            {/* Yumm card */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                  <Minus className="w-4 h-4 text-stone-500" />
                </div>
                <span className="font-semibold text-stone-900 text-lg">Yumm</span>
              </div>
              <ul className="space-y-2.5 text-sm text-stone-700">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Free tier available</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Allergen &amp; dietary info built-in</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Website embed support</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> No Google Business sync</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> No analytics or promotions</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> Pricing not publicly listed</li>
              </ul>
              <p className="text-xs text-stone-500 mt-5 leading-relaxed">
                Best for: Businesses that only need a simple, embeddable digital
                menu with no growth or marketing features.
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
                  <th className="text-left px-5 py-4 font-semibold text-stone-600 w-1/2">Feature</th>
                  <th className="text-center px-5 py-4 font-semibold text-orange-600 w-1/4">Menuthere</th>
                  <th className="text-center px-5 py-4 font-semibold text-stone-500 w-1/4">Yumm</th>
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
                      <FeatureCell value={feature.yumm} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-stone-400 mt-3">
            <Minus className="w-3 h-3 inline mr-1" />
            = not publicly disclosed
          </p>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* The Gap: Menu Display vs Growth Tool */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-4">
            Menu display vs restaurant growth tool
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed mb-10 max-w-2xl">
            Yumm and Menuthere both let customers view your menu via QR code for
            free. But they're built for very different goals.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs text-stone-500 font-bold flex-shrink-0">Y</span>
                Yumm — Menu display
              </h3>
              <ul className="space-y-3 text-sm text-stone-600">
                <li className="flex items-start gap-2"><Minus className="w-4 h-4 text-stone-300 mt-0.5 flex-shrink-0" /> Shows your menu when customers scan a QR code</li>
                <li className="flex items-start gap-2"><Minus className="w-4 h-4 text-stone-300 mt-0.5 flex-shrink-0" /> Supports allergen labelling and languages</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> Doesn't help new customers find you</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> No data on what's working or not</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> No way to promote offers or specials</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">M</span>
                Menuthere — Growth tool
              </h3>
              <ul className="space-y-3 text-sm text-stone-600">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Shows your menu when customers scan a QR code</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Syncs to Google Maps — drives new footfall</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Analytics show top items, scan volume, peak hours</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Offers engine for deals, flash sales, specials</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Google Reviews prompts to build your reputation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* Why Menuthere */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-10">
            Why restaurants choose Menuthere over Yumm
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                number: "01",
                title: "Google drives customers to you",
                desc: "Menuthere syncs your menu directly to Google Business Profile and Google Maps. Restaurants with complete profiles get 7x more clicks and 30% more footfall.",
              },
              {
                number: "02",
                title: "Know what's selling",
                desc: "Yumm has no analytics. Menuthere shows you scan volumes, top-selling items, peak hours, and device data — so you can make smarter menu decisions.",
              },
              {
                number: "03",
                title: "Promote without extra tools",
                desc: "Run time-based deals, flash offers, and badge items as Must-Try or Chef's Choice — all from the same dashboard. Yumm offers none of this.",
              },
            ].map((item) => (
              <div key={item.number} className="bg-stone-50 rounded-xl p-6 border border-stone-200">
                <div className="w-10 h-10 rounded-lg bg-orange-100/70 flex items-center justify-center mb-4">
                  <span className="text-orange-600 font-semibold text-sm">{item.number}</span>
                </div>
                <h3 className="font-semibold text-stone-900 mb-2">{item.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* When Yumm Might Win */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-4">
            When Yumm might be a better fit
          </h2>
          <p className="text-stone-500 mb-8 text-sm leading-relaxed max-w-2xl">
            Yumm has a couple of specific strengths worth noting:
          </p>
          <ul className="space-y-4">
            {[
              "You need to embed a menu directly into your existing website (Yumm supports iFrame/embed; Menuthere does not currently)",
              "You run one-off events or popups and want a temporary, pay-per-period menu",
              "You run a non-restaurant business (sports centre, wine bar) and only need menu display — nothing more",
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
              <div key={i} className="border-b border-stone-100 pb-6 last:border-b-0 last:pb-0">
                <h3 className="font-semibold text-stone-900 mb-2 text-base">{faq.q}</h3>
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
            More than a menu — a growth tool for your restaurant
          </h2>
          <p className="text-stone-500 mb-8 text-sm leading-relaxed max-w-lg mx-auto">
            Join 600+ restaurants using Menuthere to get found on Google,
            understand their customers, and run promotions — all from one free
            dashboard.
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
