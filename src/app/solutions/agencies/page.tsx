import { Metadata } from "next";
import Image from "next/image";
import { getT } from "@/lib/i18n/server";
import { getSolutionContent } from "@/lib/i18n/solutionsContent";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import agenciesData from "@/content/solutions/agencies.json";
import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.solutionsAgencies.metaTitle,
    description: t.solutionsAgencies.metaDescription,
    alternates: { canonical: "https://menuthere.com/solutions/agencies" },
    openGraph: {
      title: t.solutionsAgencies.metaTitle,
      description: t.solutionsAgencies.metaDescription,
      url: "https://menuthere.com/solutions/agencies",
      type: "website",
    },
  };
}

export default async function AgenciesPage() {
  const { t, locale } = await getT();
  // Body copy — hero, benefits, features, reviews — lives in JSON rather than
  // JSX, so it cannot be reached by the dictionary. Swap in the translated
  // document for this locale; getSolutionContent falls back to English.
  const content = getSolutionContent("agencies", locale, agenciesData);

  return (
    <main className="min-h-screen bg-white geist-font">
      {/* Hero Section */}
      <section
        className="relative pt-32 md:pt-40 pb-16 md:pb-24 bg-[#FAF7F0]"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 100% 0%, rgba(255,138,66,0.10) 0%, rgba(255,138,66,0.04) 35%, transparent 70%)",
        }}
      >
        <div className="relative mx-auto max-w-3xl px-6 md:px-10 lg:px-12 text-center">
          <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white border border-[rgba(232,93,4,0.18)] text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#E85D04] shadow-[0_2px_8px_-3px_rgba(232,93,4,0.25)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#E85D04] opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E85D04]" />
            </span>
            <span>{t.solutionsAgencies.heroBadge}</span>
          </div>
          <h1
            className="font-bricolage mt-6 text-[#0A0A0B] tracking-tight font-semibold text-[clamp(40px,5.2vw,64px)] leading-[1.05]"
            style={{ letterSpacing: "-0.03em" }}
          >
            {content.hero.headline}
          </h1>
          <p className="text-[15px] sm:text-[17px] text-[#4A4A50] max-w-lg mx-auto mt-5 leading-relaxed">
            {content.hero.subheadline}
          </p>
          <div className="flex items-center gap-3 mt-8 justify-center">
            <ButtonV2 href="mailto:Menuthere@gmail.com" variant="primary">
              {t.solutionsAgencies.heroApplyCta}
            </ButtonV2>
            <ButtonV2 href="https://cal.id/menuthere" variant="secondary">
              {t.solutionsAgencies.heroDemoCta}
            </ButtonV2>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Problem Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto w-full max-w-3xl px-6 md:px-10 lg:px-12 text-center">
          <h2 className="font-bricolage font-semibold text-3xl md:text-[42px] text-[#0A0A0B] tracking-tight leading-[1.1] mb-6">
            {t.solutionsAgencies.problemHeading}{" "}
            <span className="text-[#76767B]">
              {t.solutionsAgencies.problemHeadingAccent}
            </span>
          </h2>
          <p className="text-[#4A4A50] text-[15px] md:text-[17px] leading-relaxed">
            {t.solutionsAgencies.problemBody}
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Benefits Section */}
      <section className="bg-[#FAF7F0] py-16 md:py-24">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
          <h2 className="font-bricolage font-semibold text-3xl md:text-[42px] text-[#0A0A0B] tracking-tight leading-[1.1] mb-12">
            {t.solutionsAgencies.benefitsHeading}{" "}
            <span className="text-[#76767B]">
              {t.solutionsAgencies.benefitsHeadingAccent}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.benefits.map((benefit, index) => (
              <div
                key={index}
                className="rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-6 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E85D04]/10 text-[#E85D04] grid place-items-center mb-4">
                  <span className="font-semibold text-sm">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#0A0A0B] mb-2">
                  {benefit.title}
                </h3>
                <p className="text-[#4A4A50] text-sm leading-relaxed">
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
      <section className="bg-white">
        {content.features.map((feature, index) => {
          const isImageRight = feature.imagePosition
            ? feature.imagePosition === "right"
            : index % 2 === 0;

          return (
            <div
              key={index}
              className="py-16 md:py-24 border-b border-stone-200 last:border-b-0"
            >
              <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
                <div
                  className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-16 ${
                    !isImageRight ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  {/* Text Content */}
                  <div className="flex-1 space-y-5">
                    <h2 className="font-bricolage font-semibold text-2xl md:text-3xl text-[#0A0A0B] tracking-tight leading-[1.1]">
                      {feature.title}
                    </h2>
                    <p className="text-[#4A4A50] text-[15px] md:text-[17px] leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-3 pt-2">
                      {feature.list.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <span className="inline-grid place-items-center h-5 w-5 rounded-full bg-[#E85D04]/12 text-[#E85D04] flex-shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                          <span className="text-[#4A4A50] text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Image */}
                  <div className="flex-1 w-full">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[rgba(11,11,12,0.08)] bg-[#FAF7F0] shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)]">
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
      <section id="earnings" className="bg-[#0A0A0B] py-16 md:py-24">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white/[0.06] border border-[rgba(232,93,4,0.35)] text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#FF8A42] shadow-[0_2px_8px_-3px_rgba(232,93,4,0.25)] mb-6">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF8A42] opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF8A42]" />
              </span>
              <span>{t.solutionsAgencies.earningsBadge}</span>
            </div>
            <h2 className="font-bricolage text-3xl md:text-[42px] font-semibold text-white tracking-tight leading-[1.1] mb-4">
              {t.solutionsAgencies.earningsHeading}{" "}
              <span className="text-stone-400 italic">
                {t.solutionsAgencies.earningsHeadingAccent}
              </span>
            </h2>
            <p className="text-stone-400 text-[15px] md:text-[17px] max-w-2xl mx-auto leading-relaxed">
              {t.solutionsAgencies.earningsSubheading}
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-3 bg-white/[0.04] p-5 border-b border-white/10 font-medium text-stone-400 text-sm">
              <div>{t.solutionsAgencies.earningsTableTierHeader}</div>
              <div>{t.solutionsAgencies.earningsTableRevenueHeader}</div>
              <div>{t.solutionsAgencies.earningsTableCommissionHeader}</div>
            </div>
            <div className="divide-y divide-white/10">
              <div className="grid grid-cols-3 p-5 items-center">
                <div className="font-semibold text-[#FFB380]">{t.solutionsAgencies.tierStarterName}</div>
                <div className="text-stone-300 text-sm">{t.solutionsAgencies.tierStarterRevenue}</div>
                <div className="font-semibold text-white">
                  {t.solutionsAgencies.tierStarterRate} <span className="text-sm font-normal text-stone-400">{t.solutionsAgencies.tierStarterPayout}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 p-5 items-center">
                <div className="font-semibold text-[#FF8A42]">{t.solutionsAgencies.tierGrowthName}</div>
                <div className="text-stone-300 text-sm">{t.solutionsAgencies.tierGrowthRevenue}</div>
                <div className="font-semibold text-white">
                  {t.solutionsAgencies.tierGrowthRate} <span className="text-sm font-normal text-stone-400">{t.solutionsAgencies.tierGrowthPayout}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 p-5 items-center bg-[#E85D04]/12">
                <div className="font-semibold text-[#E85D04]">{t.solutionsAgencies.tierEliteName}</div>
                <div className="text-stone-300 text-sm">{t.solutionsAgencies.tierEliteRevenue}</div>
                <div className="font-semibold text-white">
                  {t.solutionsAgencies.tierEliteRate} <span className="text-sm font-normal text-stone-400">{t.solutionsAgencies.tierElitePayout}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {[
              { tier: t.solutionsAgencies.tierStarterName, color: "text-[#FFB380]", revenue: t.solutionsAgencies.tierStarterRevenue, commission: t.solutionsAgencies.tierStarterRate, amount: t.solutionsAgencies.tierStarterPayoutPerSub },
              { tier: t.solutionsAgencies.tierGrowthName, color: "text-[#FF8A42]", revenue: t.solutionsAgencies.tierGrowthRevenue, commission: t.solutionsAgencies.tierGrowthRate, amount: t.solutionsAgencies.tierGrowthPayoutPerSub },
              { tier: t.solutionsAgencies.tierEliteName, color: "text-[#E85D04]", revenue: t.solutionsAgencies.tierEliteRevenue, commission: t.solutionsAgencies.tierEliteRate, amount: t.solutionsAgencies.tierElitePayoutPerSub },
            ].map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-white/10 p-5">
                <div className="flex justify-between items-center mb-4">
                  <span className={`font-semibold text-lg ${item.color}`}>{item.tier}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                    <span className="text-stone-400 text-sm">{t.solutionsAgencies.tierCardRevenueLabel}</span>
                    <span className="text-white font-medium text-sm">{item.revenue}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-stone-400 text-sm">{t.solutionsAgencies.tierCardCommissionLabel}</span>
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
      <section className="bg-[#FAF7F0] py-16 md:py-24">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
          <h2 className="font-bricolage font-semibold text-3xl md:text-[42px] text-[#0A0A0B] tracking-tight leading-[1.1] mb-12 text-center">
            {t.solutionsAgencies.processHeading}{" "}
            <span className="text-[#76767B] italic">
              {t.solutionsAgencies.processHeadingAccent}
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-stone-200" />

            {[
              { step: "01", title: t.solutionsAgencies.processStepOneTitle, desc: t.solutionsAgencies.processStepOneDescription },
              { step: "02", title: t.solutionsAgencies.processStepTwoTitle, desc: t.solutionsAgencies.processStepTwoDescription },
              { step: "03", title: t.solutionsAgencies.processStepThreeTitle, desc: t.solutionsAgencies.processStepThreeDescription },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-white border border-[rgba(232,93,4,0.18)] shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)] flex items-center justify-center mb-5 font-bricolage text-xl font-semibold text-[#E85D04] relative z-10">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-[#0A0A0B] mb-2">
                  {item.title}
                </h3>
                <p className="text-[#4A4A50] text-sm leading-relaxed px-4">
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
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto w-full max-w-3xl px-6 md:px-10 lg:px-12 text-center">
          <h2 className="font-bricolage font-semibold text-3xl md:text-[42px] text-[#0A0A0B] tracking-tight leading-[1.1] mb-4">
            {t.solutionsAgencies.idealPartnerHeading}{" "}
            <span className="text-[#76767B]">
              {t.solutionsAgencies.idealPartnerHeadingAccent}
            </span>
          </h2>
          <p className="text-[#4A4A50] text-[15px] md:text-[17px] max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.solutionsAgencies.idealPartnerBody}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              t.solutionsAgencies.partnerTypeRestaurantAdvisors,
              t.solutionsAgencies.partnerTypeChannelPartners,
              t.solutionsAgencies.partnerTypeSalesExecutives,
              t.solutionsAgencies.partnerTypeFranchiseSpecialists,
              t.solutionsAgencies.partnerTypeSaasResellers,
              t.solutionsAgencies.partnerTypeBizDevPros,
            ].map((tag, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-white text-[#4A4A50] rounded-full text-sm font-medium border border-[rgba(11,11,12,0.08)] shadow-[0_8px_20px_-14px_rgba(11,11,12,0.18)]"
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
      <section className="py-16 md:py-24 bg-[#FAF7F0]">
        <div className="mx-auto w-full max-w-3xl px-6 md:px-10 lg:px-12">
          <div className="text-center mb-14">
            <h2 className="font-bricolage text-3xl md:text-[42px] font-semibold text-[#0A0A0B] tracking-tight leading-[1.1]">
              {t.solutionsAgencies.faqHeading}{" "}
              <span className="text-[#76767B] italic">
                {t.solutionsAgencies.faqHeadingAccent}
              </span>
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {[
              { question: t.solutionsAgencies.faqProductOverviewQuestion, answer: t.solutionsAgencies.faqProductOverviewAnswer },
              { question: t.solutionsAgencies.faqExperienceRequiredQuestion, answer: t.solutionsAgencies.faqExperienceRequiredAnswer },
              { question: t.solutionsAgencies.faqPayoutMechanicsQuestion, answer: t.solutionsAgencies.faqPayoutMechanicsAnswer },
              { question: t.solutionsAgencies.faqCostsInvolvedQuestion, answer: t.solutionsAgencies.faqCostsInvolvedAnswer },
              { question: t.solutionsAgencies.faqTerritoryQuestion, answer: t.solutionsAgencies.faqTerritoryAnswer },
              { question: t.solutionsAgencies.faqResourcesQuestion, answer: t.solutionsAgencies.faqResourcesAnswer },
            ].map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-[rgba(11,11,12,0.08)] last:border-b-0 py-1"
              >
                <AccordionTrigger className="text-left text-base font-medium text-[#0A0A0B] hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[#4A4A50] text-sm leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 bg-white border-t border-[rgba(11,11,12,0.08)]">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              t.solutionsAgencies.trustBadgeDeployments,
              t.solutionsAgencies.trustBadgeFieldTested,
              t.solutionsAgencies.trustBadgeRevenueShare,
              t.solutionsAgencies.trustBadgeExclusiveAccess,
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center gap-2 text-[#4A4A50]"
              >
                <span className="inline-grid place-items-center h-6 w-6 rounded-full bg-[#E85D04]/12 text-[#E85D04] flex-shrink-0">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                <span className="font-medium text-sm whitespace-nowrap">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Program Terms */}
      <section className="py-12 bg-[#FAF7F0] border-t border-[rgba(11,11,12,0.08)]">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
          <h4 className="font-bricolage text-lg font-semibold text-[#0A0A0B] tracking-tight mb-4">
            {t.solutionsAgencies.termsHeading}
          </h4>
          <ul className="grid md:grid-cols-2 gap-x-12 gap-y-3 text-sm text-[#4A4A50] list-disc pl-5 marker:text-[#E85D04]">
            <li>{t.solutionsAgencies.termsIncomeContinuity}</li>
            <li>{t.solutionsAgencies.termsTerminationRights}</li>
            <li>{t.solutionsAgencies.termsPayoutTiming}</li>
            <li>{t.solutionsAgencies.termsEligibility}</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <StartFreeTrailSection />

      {/* Footer */}
      <Footer appName="Menuthere" />

      {/* Chat */}
      <WhatsAppButton />
    </main>
  );
}
