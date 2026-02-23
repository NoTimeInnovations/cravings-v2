import { Metadata } from "next";
import Link from "next/link";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Menuthere vs Competitors — Digital Menu Comparisons (2025)",
  description:
    "Compare Menuthere with other digital menu platforms. See how we stack up against MyDigiMenu, and more on pricing, features, and Google Business sync.",
  alternates: { canonical: "https://menuthere.com/compare" },
  openGraph: {
    title: "Menuthere vs Competitors — Digital Menu Comparisons (2025)",
    description:
      "Side-by-side comparisons of Menuthere vs other QR menu platforms. Zero commissions, Google sync.",
    url: "https://menuthere.com/compare",
    type: "website",
  },
};

const comparisons = [
  {
    slug: "menuthere-vs-mydigimenu",
    competitor: "MyDigiMenu",
    tagline: "Free plan vs $39/month + 2% transaction fees",
    verdict: "Menuthere wins on price, Google sync, and zero commissions.",
  },
  {
    slug: "menuthere-vs-yumm",
    competitor: "Yumm",
    tagline: "Growth platform vs basic menu display tool",
    verdict: "Menuthere wins on analytics, Google sync, and promotions.",
  },
  {
    slug: "menuthere-vs-thedigitalmenu",
    competitor: "The Digital Menu",
    tagline: "Free & transparent vs hidden pricing, no social proof",
    verdict: "Menuthere wins on free plan, transparency, and Google sync.",
  },
  {
    slug: "menuthere-vs-menutiger",
    competitor: "MenuTiger",
    tagline: "Unlimited free plan vs 7-item cap; ₹299/mo vs $46/mo",
    verdict: "Menuthere wins on pricing, free plan limits, and Google sync.",
  },
];

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-white geist-font">
      {/* Hero */}
      <section className="flex items-center justify-center px-5 pb-16 pt-32 md:pt-40 bg-[#fcfbf7]">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
            Menuthere vs{" "}
            <span className="text-stone-400 italic">Competitors</span>
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-md mx-auto mt-5 leading-relaxed">
            Honest, detailed comparisons to help you pick the right digital menu
            platform for your restaurant.
          </p>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
        <div className="max-w-3xl mx-auto px-6 md:px-16">
          <div className="space-y-4">
            {comparisons.map((item) => (
              <Link
                key={item.slug}
                href={`/compare/${item.slug}`}
                className="flex items-center justify-between p-6 rounded-xl border border-stone-200 hover:border-orange-300 hover:bg-orange-50/30 transition-colors group"
              >
                <div>
                  <h2 className="font-semibold text-stone-900 text-base mb-1">
                    Menuthere vs {item.competitor}
                  </h2>
                  <p className="text-stone-500 text-sm">{item.tagline}</p>
                  <p className="text-orange-600 text-xs font-medium mt-2">{item.verdict}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-stone-400 group-hover:text-orange-500 flex-shrink-0 ml-4 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <StartFreeTrailSection />
      <Footer appName="Menuthere" />
      <WhatsAppButton />
    </main>
  );
}
