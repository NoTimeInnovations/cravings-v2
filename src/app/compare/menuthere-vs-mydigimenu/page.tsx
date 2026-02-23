import { Metadata } from "next";
import Link from "next/link";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Check, X, Minus } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Menuthere vs MyDigiMenu (2025) — Full QR Menu Comparison",
  description:
    "Menuthere vs MyDigiMenu: ₹299/mo vs $39/mo, zero commissions vs 2% fees, Google Business sync vs none. See which QR menu wins.",
  alternates: { canonical: "https://menuthere.com/compare/menuthere-vs-mydigimenu" },
  openGraph: {
    title: "Menuthere vs MyDigiMenu (2025) — Full QR Menu Comparison",
    description:
      "Menuthere vs MyDigiMenu: ₹299/mo vs $39/mo, zero commissions vs 2% fees, Google Business sync vs none. See which QR menu wins.",
    url: "https://menuthere.com/compare/menuthere-vs-mydigimenu",
    type: "website",
  },
};

const comparisonSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Menuthere vs MyDigiMenu Comparison",
  description:
    "A detailed comparison of Menuthere and MyDigiMenu digital menu platforms for restaurants, cafes, and hotels.",
  url: "https://menuthere.com/compare/menuthere-vs-mydigimenu",
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
          "Free QR code digital menu with Google Business sync, real-time updates, and dynamic offers. Trusted by 600+ restaurants.",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "MyDigiMenu",
        url: "https://www.mydigimenu.com",
        description:
          "QR menu platform with video menus starting at $39/month plus 2% transaction fees.",
      },
    ],
  },
};

type FeatureValue = true | false | null | string;

interface Feature {
  name: string;
  menuthere: FeatureValue;
  mydigimenu: FeatureValue;
  highlight?: boolean;
}

const features: Feature[] = [
  { name: "Free plan available", menuthere: true, mydigimenu: false, highlight: true },
  { name: "Starting price", menuthere: "₹299/mo (~$3.60)", mydigimenu: "$39/mo" },
  { name: "Transaction commissions", menuthere: false, mydigimenu: "2% per transaction", highlight: true },
  { name: "QR code digital menu", menuthere: true, mydigimenu: true },
  { name: "Real-time menu updates", menuthere: true, mydigimenu: true },
  { name: "Google Business Profile sync", menuthere: true, mydigimenu: false, highlight: true },
  { name: "Google Maps menu integration", menuthere: true, mydigimenu: false, highlight: true },
  { name: "Dynamic offers & promotions", menuthere: true, mydigimenu: true },
  { name: "Analytics dashboard", menuthere: true, mydigimenu: true },
  { name: "No customer app download required", menuthere: true, mydigimenu: true },
  { name: "Video menus / eMenus", menuthere: false, mydigimenu: true },
  { name: "Multi-language support", menuthere: true, mydigimenu: true },
  { name: "WhatsApp ordering", menuthere: false, mydigimenu: true },
  { name: "Table reservation management", menuthere: false, mydigimenu: true },
  { name: "Loyalty / cashback programs", menuthere: false, mydigimenu: true },
  { name: "Unlimited menu items on free plan", menuthere: true, mydigimenu: false },
  { name: "Setup time", menuthere: "< 5 minutes", mydigimenu: "15–30 minutes" },
  { name: "Free trial", menuthere: "Free forever plan", mydigimenu: "15-day trial" },
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
    <span className="text-stone-700 text-sm font-medium text-center block">
      {value}
    </span>
  );
}

const faqs = [
  {
    q: "Is Menuthere really free?",
    a: "Yes. Menuthere offers a free plan with unlimited menu items, QR code generation, and instant updates — no credit card required. MyDigiMenu has no free plan and starts at $39/month.",
  },
  {
    q: "Does MyDigiMenu charge transaction fees?",
    a: "Yes. MyDigiMenu charges a 2% transaction fee on top of their monthly subscription. Menuthere charges zero commissions on any plan.",
  },
  {
    q: "Which platform syncs with Google Business Profile?",
    a: "Menuthere automatically syncs your menu to Google Business Profile and Google Maps, helping drive more organic footfall. MyDigiMenu does not offer Google Business integration.",
  },
  {
    q: "Does MyDigiMenu have video menus?",
    a: "Yes, MyDigiMenu offers video-based eMenus which Menuthere currently does not. If video menus are your top priority, MyDigiMenu may suit you. However, Menuthere's Google sync, free plan, and zero commissions make it a better value for most restaurants.",
  },
  {
    q: "Which is better for small restaurants?",
    a: "Menuthere is better for small and independent restaurants because of its free plan, low paid pricing (₹299/month), instant setup in under 5 minutes, and zero transaction fees.",
  },
];

export default function MenuthereVsMyDigiMenuPage() {
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
            <span className="text-stone-400 italic">MyDigiMenu</span>
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-xl mx-auto mt-5 leading-relaxed">
            Which QR digital menu platform is right for your restaurant? We
            compare pricing, features, Google Business sync, and more — so you
            don't have to.
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
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Free plan with unlimited items</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Zero transaction commissions</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Google Business Profile sync</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Paid plans from ₹299/month (~$3.60)</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Setup in under 5 minutes</li>
              </ul>
              <p className="text-xs text-stone-500 mt-5 leading-relaxed">
                Best for: Independent restaurants, cafes, hotels and chains looking
                for zero-commission, Google-integrated digital menus.
              </p>
            </div>
            {/* MyDigiMenu card */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                  <Minus className="w-4 h-4 text-stone-500" />
                </div>
                <span className="font-semibold text-stone-900 text-lg">MyDigiMenu</span>
              </div>
              <ul className="space-y-2.5 text-sm text-stone-700">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Video-based eMenus</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Table reservation management</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> No free plan (starts $39/month)</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> 2% transaction commission</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> No Google Business sync</li>
              </ul>
              <p className="text-xs text-stone-500 mt-5 leading-relaxed">
                Best for: Restaurants that specifically need video menus or
                built-in table reservations and are willing to pay higher fees.
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
                  <th className="text-center px-5 py-4 font-semibold text-stone-500 w-1/4">MyDigiMenu</th>
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
                      <FeatureCell value={feature.mydigimenu} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* Pricing Breakdown */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-4">
            Pricing breakdown
          </h2>
          <p className="text-stone-500 mb-10 text-sm leading-relaxed">
            For a restaurant processing ₹1,00,000 (~$1,200) in orders per month:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Menuthere pricing */}
            <div className="rounded-xl border-2 border-orange-300 p-6">
              <h3 className="font-semibold text-stone-900 text-lg mb-4">Menuthere</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Free plan</span>
                  <span className="font-semibold text-green-600">₹0 / month</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Paid plan</span>
                  <span className="font-semibold text-stone-900">₹299 / month</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Transaction fees</span>
                  <span className="font-semibold text-green-600">₹0</span>
                </div>
                <div className="border-t border-stone-200 pt-3 flex justify-between">
                  <span className="font-semibold text-stone-900">Total (paid plan)</span>
                  <span className="font-bold text-orange-600">₹299 / month</span>
                </div>
              </div>
            </div>
            {/* MyDigiMenu pricing */}
            <div className="rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-stone-900 text-lg mb-4">MyDigiMenu</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Basic plan</span>
                  <span className="font-semibold text-stone-900">$39 / month (~₹3,250)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">2% transaction fee on ₹1L</span>
                  <span className="font-semibold text-red-500">₹2,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Free plan</span>
                  <span className="font-semibold text-red-500">Not available</span>
                </div>
                <div className="border-t border-stone-200 pt-3 flex justify-between">
                  <span className="font-semibold text-stone-900">Total (basic plan)</span>
                  <span className="font-bold text-stone-700">~₹5,250 / month</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-4">
            * Pricing estimates based on publicly available data as of 2025. Exchange rate: 1 USD ≈ ₹83.
          </p>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* Why Menuthere Wins */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-10">
            Why restaurants choose Menuthere
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                number: "01",
                title: "Free forever plan",
                desc: "Start with a full-featured free plan — unlimited items, QR code, and live updates. No credit card. No 15-day countdown.",
              },
              {
                number: "02",
                title: "Google Business sync",
                desc: "Your menu automatically appears on Google Maps and Search, driving 7x more clicks and 30% more footfall without any extra work.",
              },
              {
                number: "03",
                title: "Zero commissions",
                desc: "MyDigiMenu charges 2% of every transaction. Menuthere charges nothing. On ₹1 lakh/month that's ₹24,000 saved per year.",
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

      {/* When MyDigiMenu Might Win */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-4">
            When MyDigiMenu might be a better fit
          </h2>
          <p className="text-stone-500 mb-8 text-sm leading-relaxed max-w-2xl">
            We believe in honest comparisons. Here's where MyDigiMenu has an edge:
          </p>
          <ul className="space-y-4">
            {[
              "You want video-based eMenus to showcase food visually (MyDigiMenu's standout feature)",
              "You need built-in table reservation management",
              "Your business requires an in-built loyalty and cashback rewards program",
              "You operate a large hotel chain already partnered with Accor or ITC Hotels",
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
            Ready to switch to a better digital menu?
          </h2>
          <p className="text-stone-500 mb-8 text-sm leading-relaxed max-w-lg mx-auto">
            Join 600+ restaurants already using Menuthere. Start free — no credit
            card, no commissions, no limits on menu items.
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
