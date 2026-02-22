import { Metadata } from "next";
import Image from "next/image";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import Chatwoot from "@/components/Chatwoot";
import agenciesData from "@/content/solutions/agencies.json";
import { Check, CheckCircle2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Agency Partner Program | Earn Recurring Commissions | Menuthere",
  description:
    "Become an authorized partner for Menuthere. Earn up to 30% lifetime recurring commissions selling premium digital menu solutions to restaurants.",
};

export default function AgenciesPage() {
  return (
    <main className="min-h-screen bg-white geist-font">
      {/* Hero Section */}
      <section className="flex items-center justify-center px-5 pb-16 pt-32 md:pt-40 bg-[#fcfbf7]">
        <div className="w-full max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/70 text-orange-600 text-xs font-medium mb-6">
            Agency Partner Program
          </div>
          <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
            {agenciesData.hero.headline}
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-lg mx-auto mt-5 leading-relaxed">
            {agenciesData.hero.subheadline}
          </p>
          <div className="flex items-center gap-3 mt-8 justify-center">
            <ButtonV2 href="mailto:Menuthere@gmail.com" variant="primary">
              Apply Now
            </ButtonV2>
            <ButtonV2 href="https://cal.id/menuthere" variant="secondary">
              Book a Demo
            </ButtonV2>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Problem Section */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-3xl mx-auto px-6 md:px-16 text-center">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-6">
            Unlock Revenue for Restaurants,{" "}
            <span className="text-stone-500">Secure Yours</span>
          </h2>
          <p className="text-stone-500 leading-relaxed">
            Independent restaurants lose sales to static PDFs unable to reflect
            real-time changes. As a Menuthere partner, you solve this with our
            proven $30/month platform, instant QR updates trusted by 600+
            locations, earning you position as their go-to advisor.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Benefits Section */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-12">
            Why partner{" "}
            <span className="text-stone-500">with us?</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {agenciesData.benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-stone-200"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-100/70 flex items-center justify-center mb-4">
                  <span className="text-orange-600 font-semibold text-sm">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-stone-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Features Sections */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%]">
        {agenciesData.features.map((feature, index) => {
          const isImageRight = feature.imagePosition
            ? feature.imagePosition === "right"
            : index % 2 === 0;

          return (
            <div key={index} className="py-20 border-b border-stone-200 last:border-b-0">
              <div className="max-w-5xl mx-auto px-6 md:px-16">
                <div
                  className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-16 ${
                    !isImageRight ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  {/* Text Content */}
                  <div className="flex-1 space-y-5">
                    <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 leading-tight">
                      {feature.title}
                    </h2>
                    <p className="text-stone-500 leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-3 pt-2">
                      {feature.list.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
                          <span className="text-stone-600 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Image */}
                  <div className="flex-1 w-full">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-stone-200 bg-stone-50">
                      {feature.image && (
                        <Image
                          src={feature.image}
                          alt={feature.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Earnings/Pricing Table Section */}
      <section id="earnings" className="bg-stone-900 py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/20 text-orange-100 text-xs font-medium mb-6">
              High Earning Potential
            </div>
            <h2 className="geist-font text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
              Performance-Based Commission{" "}
              <span className="text-stone-400 italic">Structure.</span>
            </h2>
            <p className="text-stone-400 max-w-2xl mx-auto">
              Payouts align directly with revenue. Monthly via Stripe on the
              same day we receive subscription funds.
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-stone-700 overflow-hidden">
            <div className="grid grid-cols-3 bg-stone-800/50 p-5 border-b border-stone-700 font-medium text-stone-400 text-sm">
              <div>Tier</div>
              <div>Lifetime Referred Revenue</div>
              <div>Commission (Per $30 Sub)</div>
            </div>
            <div className="divide-y divide-stone-700">
              <div className="grid grid-cols-3 p-5 items-center">
                <div className="font-semibold text-emerald-400">Starter</div>
                <div className="text-stone-300 text-sm">$0 to $1,000</div>
                <div className="font-semibold text-white">
                  20% <span className="text-sm font-normal text-stone-400">($6/month)</span>
                </div>
              </div>
              <div className="grid grid-cols-3 p-5 items-center">
                <div className="font-semibold text-blue-400">Growth</div>
                <div className="text-stone-300 text-sm">$1,001 to $5,000</div>
                <div className="font-semibold text-white">
                  25% <span className="text-sm font-normal text-stone-400">($7.50/month)</span>
                </div>
              </div>
              <div className="grid grid-cols-3 p-5 items-center bg-orange-600/10">
                <div className="font-semibold text-orange-100">Elite</div>
                <div className="text-stone-300 text-sm">$5,001+</div>
                <div className="font-semibold text-white">
                  30% <span className="text-sm font-normal text-stone-400">($9/month)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {[
              { tier: "Starter", color: "text-emerald-400", revenue: "$0 to $1,000", commission: "20%", amount: "$6/month per sub" },
              { tier: "Growth", color: "text-blue-400", revenue: "$1,001 to $5,000", commission: "25%", amount: "$7.50/month per sub" },
              { tier: "Elite", color: "text-orange-100", revenue: "$5,001+", commission: "30%", amount: "$9/month per sub" },
            ].map((item, idx) => (
              <div key={idx} className="rounded-xl border border-stone-700 p-5">
                <div className="flex justify-between items-center mb-4">
                  <span className={`font-semibold text-lg ${item.color}`}>{item.tier}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline border-b border-stone-700 pb-3">
                    <span className="text-stone-400 text-sm">Revenue</span>
                    <span className="text-white font-medium text-sm">{item.revenue}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-stone-400 text-sm">Commission</span>
                    <div className="text-right">
                      <span className="text-white font-semibold block">{item.commission}</span>
                      <span className="text-stone-500 text-xs">{item.amount}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* How It Works Section */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-12 text-center">
            Partner onboarding{" "}
            <span className="text-stone-500 italic">process.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-stone-200" />

            {[
              { step: "01", title: "Application Review", desc: "Fast approval with reseller portal access (demo links, branded materials)." },
              { step: "02", title: "Field Deployment", desc: "Target restaurants, deliver 5-minute demos, and secure commitments." },
              { step: "03", title: "Revenue Share", desc: "Automated tracking and same-day payouts on collected funds." },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-orange-100/70 flex items-center justify-center mb-5 text-xl font-semibold text-orange-600 relative z-10">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-stone-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed px-4">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Ideal Partner Section */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20 bg-[#fcfbf7]">
        <div className="max-w-3xl mx-auto px-6 md:px-16 text-center">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            Strategic Partners{" "}
            <span className="text-stone-500">We Seek</span>
          </h2>
          <p className="text-stone-500 max-w-2xl mx-auto mb-10">
            Field-tested sales leaders who cultivate restaurant relationships.
            Selective program for proven performers.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Restaurant Advisors",
              "B2B Channel Partners",
              "Sales Executives",
              "Franchise Specialists",
              "SaaS Resellers",
              "Business Development Pros",
            ].map((tag, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-white text-stone-700 rounded-full text-sm font-medium border border-stone-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* FAQ Section */}
      <section className="py-24 bg-white sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto border-r border-l border-stone-200">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="geist-font text-3xl md:text-5xl font-semibold text-gray-900 tracking-tight">
              Partner{" "}
              <span className="text-gray-400 italic">FAQs.</span>
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {[
              { question: "Product Overview", answer: "Premium $30/month QR digital menu platform for global restaurants." },
              { question: "Experience Required", answer: "Field sales expertise; comprehensive assets provided." },
              { question: "Payout Mechanics", answer: "Monthly Stripe disbursements on collection day, lifetime per active sub." },
              { question: "Costs Involved", answer: "Zero, fully commission-driven." },
              { question: "Territory", answer: "Worldwide independents, US prioritized." },
              { question: "Resources", answer: "Portal with videos, scripts, presentations; warm leads available." },
            ].map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-gray-200 last:border-b-0 py-1"
              >
                <AccordionTrigger className="text-left text-base font-medium text-gray-900 hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-sm leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 bg-white border-t border-stone-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              "600+ Live Deployments",
              "Field-Tested Model",
              "Revenue-Share Only",
              "Exclusive Access",
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center gap-2 text-stone-700"
              >
                <Check
                  className="w-5 h-5 text-orange-600 flex-shrink-0"
                  strokeWidth={3}
                />
                <span className="font-medium text-sm whitespace-nowrap">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Program Terms */}
      <section className="py-12 bg-stone-50 border-t border-stone-200">
        <div className="max-w-4xl mx-auto px-6">
          <h4 className="text-lg font-semibold text-stone-900 mb-4">
            Partner Program Terms
          </h4>
          <ul className="grid md:grid-cols-2 gap-x-12 gap-y-3 text-sm text-stone-600 list-disc pl-5">
            <li>Income Continuity: Commissions continue for active subscriptions only.</li>
            <li>Termination Rights: Menuthere reserves the right to terminate for brand misalignment.</li>
            <li>Payout Timing: Exact day of subscription collection, net of fees.</li>
            <li>Eligibility: Worldwide partners accepted; subject to approval.</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <StartFreeTrailSection />

      {/* Footer */}
      <Footer appName="Menuthere" />

      {/* Chat */}
      <Chatwoot />
    </main>
  );
}
