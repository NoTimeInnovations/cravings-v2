import { Metadata } from "next";
import Link from "next/link";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Check, X, Minus } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Menuthere vs The Digital Menu — Best QR Menu India?",
  description:
    "Menuthere vs thedigitalmenu.in: transparent pricing vs hidden pricing, Google sync, 600+ restaurant proof vs zero testimonials. Best QR menu for India.",
  alternates: { canonical: "https://menuthere.com/compare/menuthere-vs-thedigitalmenu" },
  openGraph: {
    title: "Menuthere vs The Digital Menu — Best QR Menu India?",
    description:
      "Menuthere vs thedigitalmenu.in: transparent pricing vs hidden pricing, Google sync, 600+ restaurant proof vs zero testimonials. Best QR menu for India.",
    url: "https://menuthere.com/compare/menuthere-vs-thedigitalmenu",
    type: "website",
  },
};

const comparisonSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Menuthere vs The Digital Menu Comparison",
  description:
    "A detailed comparison of Menuthere and The Digital Menu (thedigitalmenu.in) QR menu platforms for Indian restaurants, cafes, and hotels.",
  url: "https://menuthere.com/compare/menuthere-vs-thedigitalmenu",
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
          "Free QR code digital menu with Google Business sync, real-time updates, analytics, and dynamic offers. Trusted by 600+ restaurants in India.",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "The Digital Menu",
        url: "https://thedigitalmenu.in",
        description:
          "India-based contactless QR ordering system with hidden pricing, no free plan, and no published social proof.",
      },
    ],
  },
};

type FeatureValue = true | false | null | string;

interface Feature {
  name: string;
  menuthere: FeatureValue;
  tdm: FeatureValue;
  highlight?: boolean;
}

const features: Feature[] = [
  { name: "Free plan available", menuthere: true, tdm: false, highlight: true },
  { name: "Transparent public pricing", menuthere: true, tdm: false, highlight: true },
  { name: "Self-serve signup (no sales call)", menuthere: true, tdm: false, highlight: true },
  { name: "QR code digital menu", menuthere: true, tdm: true },
  { name: "Real-time menu updates", menuthere: true, tdm: true },
  { name: "Google Business Profile sync", menuthere: true, tdm: false, highlight: true },
  { name: "Google Maps menu integration", menuthere: true, tdm: false },
  { name: "Analytics dashboard", menuthere: true, tdm: false, highlight: true },
  { name: "Dynamic offers & promotions", menuthere: true, tdm: false },
  { name: "Customer social proof / reviews", menuthere: "600+ restaurants, 4.8★", tdm: "None published", highlight: true },
  { name: "Multi-language support", menuthere: true, tdm: true },
  { name: "Digital payments integration", menuthere: false, tdm: true },
  { name: "Contactless ordering", menuthere: true, tdm: true },
  { name: "Instagram linking", menuthere: false, tdm: true },
  { name: "No customer app download", menuthere: true, tdm: true },
  { name: "India-based support", menuthere: true, tdm: true },
  { name: "Setup time", menuthere: "< 5 minutes", tdm: "Requires consultation" },
  { name: "Free trial", menuthere: "Free forever plan", tdm: "None listed" },
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
    q: "Does The Digital Menu have a free plan?",
    a: "No. The Digital Menu does not offer a free plan and requires you to contact their sales team before seeing pricing. Menuthere offers a free forever plan with unlimited menu items, QR code generation, and instant updates — no sales call needed.",
  },
  {
    q: "Is The Digital Menu pricing transparent?",
    a: "No. Their pricing page requires you to fill out a contact form. Menuthere's pricing is fully public at menuthere.com/pricing — starting at ₹299/month for paid features, with a free tier always available.",
  },
  {
    q: "Does The Digital Menu integrate with Google Business Profile?",
    a: "No. The Digital Menu does not mention any Google Business Profile or Google Maps integration. Menuthere automatically syncs your menu to Google, helping new customers discover your restaurant directly in Search and Maps.",
  },
  {
    q: "How many restaurants use The Digital Menu?",
    a: "The Digital Menu publishes no customer count, testimonials, or case studies. Menuthere is trusted by 600+ restaurants and cafes with a 4.8-star rating from 500+ reviews.",
  },
  {
    q: "Which is better for restaurants in India?",
    a: "Menuthere is built for the Indian market — INR pricing from ₹299/month, India-based support, Google Business sync for local discovery, and a free plan to get started instantly. The Digital Menu targets India too but requires a sales consultation before you can even start.",
  },
];

export default function MenuthereVsTheDigitalMenuPage() {
  return (
    <main className="min-h-screen bg-white geist-font">
      <JsonLd data={comparisonSchema} />

      {/* Hero */}
      <section className="flex items-center justify-center px-5 pb-16 pt-32 md:pt-40 bg-[#fcfbf7]">
        <div className="w-full max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/70 text-orange-600 text-xs font-medium mb-6">
            Comparison · 2025 · India
          </div>
          <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
            Menuthere vs{" "}
            <span className="text-stone-400 italic">The Digital Menu</span>
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-xl mx-auto mt-5 leading-relaxed">
            Two India-focused QR menu platforms — but only one has a free plan,
            transparent pricing, Google sync, and 600+ restaurants to back it
            up.
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
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Free plan — start in under 5 minutes</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Transparent pricing from ₹299/month</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Google Business Profile sync</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Analytics, offers, and real-time updates</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> 600+ restaurants, 4.8★ rating</li>
              </ul>
              <p className="text-xs text-stone-500 mt-5 leading-relaxed">
                Best for: Indian restaurants, cafes, hotels, and food businesses
                that want to get started free and grow with Google visibility and
                analytics.
              </p>
            </div>
            {/* The Digital Menu card */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                  <Minus className="w-4 h-4 text-stone-500" />
                </div>
                <span className="font-semibold text-stone-900 text-lg">The Digital Menu</span>
              </div>
              <ul className="space-y-2.5 text-sm text-stone-700">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Contactless QR ordering</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Digital payments integration</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> No free plan</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> Pricing hidden — requires contact</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> No social proof or testimonials</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> No Google Business sync</li>
              </ul>
              <p className="text-xs text-stone-500 mt-5 leading-relaxed">
                Best for: Restaurants that specifically need integrated digital
                payment collection in the QR ordering flow and are comfortable
                with a sales-led onboarding process.
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
                  <th className="text-center px-5 py-4 font-semibold text-stone-500 w-1/4">The Digital Menu</th>
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
                      <FeatureCell value={feature.tdm} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* The Trust Problem */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-4">
            The trust gap
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed mb-10 max-w-2xl">
            Choosing a platform your restaurant depends on is a big decision.
            Here's how the two compare on transparency and social proof.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                label: "Restaurants using platform",
                menuthere: "600+",
                tdm: "Not published",
                win: "menuthere",
              },
              {
                label: "Customer rating",
                menuthere: "4.8★ (500+ reviews)",
                tdm: "No reviews listed",
                win: "menuthere",
              },
              {
                label: "Pricing visibility",
                menuthere: "Public from ₹299/mo",
                tdm: "Hidden — contact required",
                win: "menuthere",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-stone-200 p-5">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">
                  {item.label}
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-stone-900">{item.menuthere}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-stone-300 flex-shrink-0" />
                    <span className="text-sm text-stone-500">{item.tdm}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* Why Menuthere */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-10">
            Why Indian restaurants choose Menuthere
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                number: "01",
                title: "Start free, upgrade when ready",
                desc: "No sales call. No hidden pricing. Sign up, build your menu, and go live in under 5 minutes. Upgrade to paid features only when you need them.",
              },
              {
                number: "02",
                title: "Get found on Google Maps",
                desc: "Menuthere syncs your menu directly to Google Business Profile — so customers searching nearby can see your full menu before they even walk in.",
              },
              {
                number: "03",
                title: "Prove it with 600+ restaurants",
                desc: "Menuthere is trusted by 600+ restaurants and cafes across India with a 4.8-star rating. The Digital Menu publishes zero testimonials or customer counts.",
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

      {/* When The Digital Menu Might Win */}
      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 mb-4">
            When The Digital Menu might suit you
          </h2>
          <p className="text-stone-500 mb-8 text-sm leading-relaxed max-w-2xl">
            We believe in honest comparisons. Here's where The Digital Menu has
            an edge:
          </p>
          <ul className="space-y-4">
            {[
              "You specifically need integrated digital payment collection within the QR ordering flow (Menuthere is currently menu display and management focused)",
              "You prefer a managed onboarding with a dedicated sales consultant to set everything up for you",
              "Your establishment needs Instagram menu linking for social media-heavy promotions",
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
            The digital menu your Indian restaurant actually needs
          </h2>
          <p className="text-stone-500 mb-8 text-sm leading-relaxed max-w-lg mx-auto">
            Free to start. Transparent pricing. Google sync. Loved by 600+
            restaurants across India. No sales call required.
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
