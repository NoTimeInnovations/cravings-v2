import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { getDomainConfig } from "@/lib/domain-utils";
import { SolutionsHero } from "@/components/solutions/SolutionsHero";
import { SolutionsBenefits } from "@/components/solutions/SolutionsBenefits";
import { SolutionsFeatures } from "@/components/solutions/SolutionsFeatures";
import { FAQAccordion } from "@/components/FAQAccordion";
import agenciesData from "@/content/solutions/agencies.json";
import { ArrowRight, Star, Check } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host");
  const config = getDomainConfig(host);

  return {
    title: `Agency Partner Program | Earn Recurring Commissions | ${config.name}`,
    description: `Become an authorized partner for ${config.name}. Earn up to 30% lifetime recurring commissions selling premium digital menu solutions to restaurants.`,
  };
}

interface Feature {
  title: string;
  description: string;
  list: string[];
  image: string;
  imagePosition?: "left" | "right";
}

export default async function AgenciesPage() {
  const headersList = await headers();
  const host = headersList.get("host");
  const config = getDomainConfig(host);
  const appName = config.name;

  // Dynamic Content Replacement
  const dynamicHero = {
    ...agenciesData.hero,
    subheadline: agenciesData.hero.subheadline.replace(/MenuThere/g, appName),
  };

  const dynamicFeatures: Feature[] = agenciesData.features.map(f => ({
    ...f,
    imagePosition: f.imagePosition as "left" | "right",
    description: f.description.replace(/MenuThere/g, appName)
  }));

  const dynamicCta = {
    ...agenciesData.cta,
    title: agenciesData.cta.title.replace(/MenuThere/g, appName),
    description: agenciesData.cta.description.replace(/MenuThere/g, appName)
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <SolutionsHero data={dynamicHero} />

      {/* Problem Section (Custom for Resellers) */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-medium text-gray-900 mb-6 tracking-tight">
              Unlock Revenue for Restaurants, Secure Yours
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Independent restaurants lose sales to static PDFs unable to reflect real-time changes.
              As a {appName} partner, you solve this with our proven $30/month platform –
              instant QR updates trusted by 600+ locations – earning you position as their go-to advisor.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <SolutionsBenefits benefits={agenciesData.benefits} eyebrow="Why Partner with Us?" />

      {/* Features/Solution Section */}
      <SolutionsFeatures features={dynamicFeatures} />

      {/* Earnings/Pricing Table Section */}
      <section id="earnings" className="py-24 bg-gray-900 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-[#e65a22]/20 text-[#e65a22] font-semibold rounded-full text-sm mb-4 border border-[#e65a22]/30">
              High Earning Potential
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-100 to-orange-200">
              Performance-Based Commission Structure
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Payouts align directly with revenue. Monthly via Stripe on the same day we receive subscription funds.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Desktop Table View (Hidden on Mobile) */}
            <div className="hidden md:block bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-900/50 p-6 border-b border-gray-700 font-medium text-gray-300">
                <div>Tier</div>
                <div>Lifetime Referred Revenue</div>
                <div>Commission (Per $30 Sub)</div>
              </div>

              <div className="divide-y divide-gray-700">
                <div className="grid grid-cols-3 p-6 items-center hover:bg-white/5 transition-colors">
                  <div className="font-bold text-emerald-400 text-lg">Starter</div>
                  <div className="text-gray-300">$0 – $1,000</div>
                  <div className="font-bold">20% <span className="text-sm font-normal text-gray-400">($6/month)</span></div>
                </div>
                <div className="grid grid-cols-3 p-6 items-center hover:bg-white/5 transition-colors bg-white/[0.02]">
                  <div className="font-bold text-blue-400 text-lg">Growth</div>
                  <div className="text-gray-300">$1,001 – $5,000</div>
                  <div className="font-bold">25% <span className="text-sm font-normal text-gray-400">($7.50/month)</span></div>
                </div>
                <div className="grid grid-cols-3 p-6 items-center hover:bg-white/5 transition-colors relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent pointer-events-none" />
                  <div className="font-bold text-orange-400 text-lg relative">Elite</div>
                  <div className="text-gray-300 relative">$5,001+</div>
                  <div className="font-bold relative">30% <span className="text-sm font-normal text-gray-400">($9/month)</span></div>
                </div>
              </div>
            </div>

            {/* Mobile Card View (Hidden on Desktop) */}
            <div className="md:hidden space-y-4">
              {/* Starter Card */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-emerald-400 text-xl">Starter</span>
                  <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Tier 1</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline border-b border-gray-700 pb-3">
                    <span className="text-gray-400 text-sm">Revenue</span>
                    <span className="text-white font-medium">$0 – $1,000</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-gray-400 text-sm">Commission</span>
                    <div className="text-right">
                      <span className="text-white font-bold block">20%</span>
                      <span className="text-gray-500 text-sm">$6/month per sub</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Growth Card */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 bg-white/[0.02]">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-blue-400 text-xl">Growth</span>
                  <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Tier 2</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline border-b border-gray-700 pb-3">
                    <span className="text-gray-400 text-sm">Revenue</span>
                    <span className="text-white font-medium">$1,001 – $5,000</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-gray-400 text-sm">Commission</span>
                    <div className="text-right">
                      <span className="text-white font-bold block">25%</span>
                      <span className="text-gray-500 text-sm">$7.50/month per sub</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Elite Card */}
              <div className="bg-gray-800 rounded-xl border border-orange-500/30 p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-orange-400 text-xl">Elite</span>
                    <span className="text-xs uppercase tracking-wider text-orange-500/70 font-bold border border-orange-500/30 px-2 py-0.5 rounded">Top Tier</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline border-b border-gray-700 pb-3">
                      <span className="text-gray-400 text-sm">Revenue</span>
                      <span className="text-white font-medium">$5,001+</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-gray-400 text-sm">Commission</span>
                      <div className="text-right">
                        <span className="text-white font-bold block">30%</span>
                        <span className="text-gray-500 text-sm">$9/month per sub</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-medium text-gray-900 mb-4">Partner Onboarding Process</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-200 -z-10" />

            {[
              {
                step: "01",
                title: "Application Review",
                desc: "Fast approval with reseller portal access (demo links, branded materials)."
              },
              {
                step: "02",
                title: "Field Deployment",
                desc: "Target restaurants, deliver 5-minute demos, and secure commitments."
              },
              {
                step: "03",
                title: "Revenue Share",
                desc: "Automated tracking and same-day payouts on collected funds."
              }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center bg-white">
                <div className="w-24 h-24 rounded-full bg-orange-50 border-4 border-white shadow-sm flex items-center justify-center mb-6 text-2xl font-bold text-orange-600">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm px-4">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal Partner Section */}
      <section className="py-20 bg-orange-50 border-y border-orange-100">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl font-medium text-gray-900 mb-6">Strategic Partners We Seek</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
            Field-tested sales leaders who cultivate restaurant relationships. Selective program for proven performers.
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {[
              "Restaurant Advisors", "B2B Channel Partners", "Sales Executives",
              "Franchise Specialists", "SaaS Resellers", "Business Development Pros"
            ].map((tag, idx) => (
              <span key={idx} className="px-4 py-2 bg-white text-gray-700 rounded-full text-sm font-medium border border-orange-200 shadow-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQAccordion
        title="Partner FAQs"
        items={[
          { question: "Product Overview", answer: `Premium $30/month QR digital menu platform for global restaurants.` },
          { question: "Experience Required", answer: "Field sales expertise; comprehensive assets provided." },
          { question: "Payout Mechanics", answer: "Monthly Stripe disbursements on collection day, lifetime per active sub." },
          { question: "Costs Involved", answer: "Zero – fully commission-driven." },
          { question: "Territory", answer: "Worldwide independents, US prioritized." },
          { question: "Resources", answer: "Portal with videos, scripts, presentations; warm leads available." }
        ]}
        className="bg-white"
      />

      {/* Trust & CTA Section */}
      <section className="py-24 bg-[#e65a22] text-white relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center max-w-4xl">
          <h2 className="text-3xl md:text-5xl font-medium mb-8 tracking-tight">
            {dynamicCta.title}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12 text-left md:text-center">
            {["600+ Live Deployments", "Field-Tested Model", "Revenue-Share Only", "Exclusive Access"].map((item, idx) => (
              <div key={idx} className="flex items-center md:justify-center gap-2 text-white/90">
                <Check className="w-5 h-5 text-white flex-shrink-0" strokeWidth={3} />
                <span className="font-medium whitespace-nowrap">{item}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={agenciesData.cta.buttonLink}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-[#e65a22] bg-white rounded-lg hover:bg-gray-50 transition-all shadow-lg"
            >
              {agenciesData.cta.buttonText}
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </div>

          <div className="mt-16 pt-16 border-t border-white/20 text-left">
            <h4 className="text-lg font-bold text-white mb-4">Partner Program Terms</h4>
            <ul className="grid md:grid-cols-2 gap-x-12 gap-y-4 text-sm text-white/80 list-disc pl-5">
              <li>Income Continuity: Commissions continue for active subscriptions only.</li>
              <li>Termination Rights: {appName} reserves the right to terminate for brand misalignment.</li>
              <li>Payout Timing: Exact day of subscription collection, net of fees.</li>
              <li>Eligibility: Worldwide partners accepted; subject to approval.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
