import { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import {
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  IndianRupee,
  Users,
  ShieldAlert,
  BarChart3,
  Store,
  Percent,
  XCircle,
  CreditCard,
  Truck,
  Database,
  Megaphone,
  Lock,
  Heart,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();

  return {
    title: t.solutionsRest.petpooja.metaTitle,
    description: t.solutionsRest.petpooja.metaDescription,
    alternates: {
      canonical: "https://menuthere.com/solutions/petpooja",
    },
    openGraph: {
      title: t.solutionsRest.petpooja.ogTitle,
      description: t.solutionsRest.petpooja.ogDescription,
      type: "website",
      url: "https://menuthere.com/solutions/petpooja",
    },
  };
}

export default async function PetPoojaPage() {
  const { t } = await getT();
  const c = t.solutionsRest.petpooja;
  const shared = t.solutionsRest.shared;

  // Copy lives in the dictionary, so these lists are built inside the
  // component — a module-level const cannot read the request's locale.
  const COMMISSION_BREAKDOWN = [
    {
      label: c.commissionRow1Label,
      aggregator: c.commissionRow1Aggregator,
      menuthere: shared.zeroPercentValue,
    },
    {
      label: c.commissionRow2Label,
      aggregator: c.commissionRow2Aggregator,
      menuthere: shared.zeroPercentValue,
    },
    {
      label: c.commissionRow3Label,
      aggregator: c.commissionRow3Aggregator,
      menuthere: c.commissionRow3Menuthere,
    },
    {
      label: c.commissionRow4Label,
      aggregator: c.commissionRow4Aggregator,
      menuthere: c.commissionRow4Menuthere,
    },
    {
      label: c.commissionRow5Label,
      aggregator: c.commissionRow5Aggregator,
      menuthere: shared.zeroPercentValue,
    },
    {
      label: c.commissionRow6Label,
      aggregator: c.commissionRow6Aggregator,
      menuthere: c.commissionRow6Menuthere,
    },
  ];

  const AGGREGATOR_PROBLEMS = [
    {
      icon: Percent,
      title: c.problem1Title,
      description: c.problem1Body,
    },
    {
      icon: ShieldAlert,
      title: c.problem2Title,
      description: c.problem2Body,
    },
    {
      icon: Database,
      title: c.problem3Title,
      description: c.problem3Body,
    },
    {
      icon: Megaphone,
      title: c.problem4Title,
      description: c.problem4Body,
    },
    {
      icon: Lock,
      title: c.problem5Title,
      description: c.problem5Body,
    },
    {
      icon: AlertTriangle,
      title: c.problem6Title,
      description: c.problem6Body,
    },
  ];

  const OUR_SOLUTION = [
    {
      icon: IndianRupee,
      title: c.solution1Title,
      description: c.solution1Body,
    },
    {
      icon: Users,
      title: c.solution2Title,
      description: c.solution2Body,
    },
    {
      icon: Store,
      title: c.solution3Title,
      description: c.solution3Body,
    },
    {
      icon: BarChart3,
      title: c.solution4Title,
      description: c.solution4Body,
    },
    {
      icon: Heart,
      title: c.solution5Title,
      description: c.solution5Body,
    },
    {
      icon: TrendingUp,
      title: c.solution6Title,
      description: c.solution6Body,
    },
  ];

  const REAL_NUMBERS = [
    {
      metric: c.realNumbersRow1Metric,
      aggregator: c.realNumbersRow1Aggregator,
      direct: c.realNumbersRow1Direct,
    },
    {
      metric: c.realNumbersRow2Metric,
      aggregator: c.realNumbersRow2Aggregator,
      direct: c.realNumbersRow2Direct,
    },
    {
      metric: c.realNumbersRow3Metric,
      aggregator: c.realNumbersRow3Aggregator,
      direct: c.realNumbersRow3Direct,
    },
    {
      metric: c.realNumbersRow4Metric,
      aggregator: c.realNumbersRow4Aggregator,
      direct: c.realNumbersRow4Direct,
    },
    {
      metric: c.realNumbersRow5Metric,
      aggregator: c.realNumbersRow5Aggregator,
      direct: c.realNumbersRow5Direct,
    },
    {
      metric: c.realNumbersRow6Metric,
      aggregator: c.realNumbersRow6Aggregator,
      direct: c.realNumbersRow6Direct,
    },
    {
      metric: c.realNumbersRow7Metric,
      aggregator: c.realNumbersRow7Aggregator,
      direct: c.realNumbersRow7Direct,
    },
  ];

  const FAQ_DATA = [
    { question: c.faq1Question, answer: c.faq1Answer },
    { question: c.faq2Question, answer: c.faq2Answer },
    { question: c.faq3Question, answer: c.faq3Answer },
    { question: c.faq4Question, answer: c.faq4Answer },
    { question: c.faq5Question, answer: c.faq5Answer },
    { question: c.faq6Question, answer: c.faq6Answer },
    { question: c.faq7Question, answer: c.faq7Answer },
    { question: c.faq8Question, answer: c.faq8Answer },
  ];

  const STATS = [
    { value: shared.zeroPercentValue, label: c.statCommissionLabel },
    { value: c.value35Percent, label: c.statQuitLabel },
    { value: c.statFeeValue, label: c.statFeeLabel },
    { value: c.statDataValue, label: c.statDataLabel },
  ];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: shared.breadcrumbHome,
        item: "https://menuthere.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: shared.breadcrumbSolutions,
        item: "https://menuthere.com/solutions",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: c.breadcrumbCurrent,
        item: "https://menuthere.com/solutions/petpooja",
      },
    ],
  };

  return (
    <main className="min-h-screen w-full bg-white geist-font">
      <JsonLd data={breadcrumbSchema} />

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="flex items-center justify-center px-5 pb-16 pt-32 md:pt-40 bg-[#fcfbf7]">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
            {c.heroTitle}
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-lg mx-auto mt-5 leading-relaxed">
            {c.heroSubtitle}
          </p>
          <div className="flex items-center gap-3 mt-8 justify-center">
            <ButtonV2 href="https://wa.me/918590115462?text=Hi%2C%20I%27m%20interested%20in%20PetPooja%20%2B%20Menuthere" variant="primary" className="text-nowrap">
              {c.heroPrimaryCta}
            </ButtonV2>
            <ButtonV2 href="https://cal.id/menuthere" variant="secondary" className="text-nowrap">
              {shared.bookDemoCta}
            </ButtonV2>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-orange-600 py-8 border-t border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white text-center">
            {STATS.map((stat, idx) => (
              <div key={idx}>
                <div className="text-2xl md:text-3xl font-semibold">
                  {stat.value}
                </div>
                <div className="text-sm opacity-80 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-3xl mx-auto px-6 md:px-16">
          <p className="text-stone-600 leading-relaxed text-base mb-6">
            {c.introParagraph1}
          </p>
          <p className="text-stone-600 leading-relaxed text-base">
            {c.introParagraph2}
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ THE PROBLEM ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            {c.problemsHeading}
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            {c.problemsSubheading}
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGGREGATOR_PROBLEMS.map((problem, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-6 border border-stone-200"
            >
              <div className="w-10 h-10 rounded-lg bg-red-100/70 flex items-center justify-center mb-4">
                <problem.icon className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-2">
                {problem.title}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ COMMISSION BREAKDOWN TABLE ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            {c.commissionHeading}
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            {c.commissionSubheading}
          </p>

          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-stone-900 text-white">
              <div className="p-4 md:p-5 text-sm font-medium">
                {c.commissionColCharge}
              </div>
              <div className="p-4 md:p-5 text-sm font-medium text-center border-l border-stone-700">
                {c.commissionColPlatforms}
              </div>
              <div className="p-4 md:p-5 text-sm font-medium text-center border-l border-stone-700">
                Menuthere
              </div>
            </div>

            {/* Table Rows */}
            {COMMISSION_BREAKDOWN.map((row, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-3 ${idx < COMMISSION_BREAKDOWN.length - 1 ? "border-b border-stone-100" : ""}`}
              >
                <div className="p-4 md:p-5 text-sm text-stone-900 font-medium">
                  {row.label}
                </div>
                <div className="p-4 md:p-5 text-sm text-center border-l border-stone-100 text-red-600 font-semibold">
                  {row.aggregator}
                </div>
                <div className="p-4 md:p-5 text-sm text-center border-l border-stone-100 text-green-600 font-semibold">
                  {row.menuthere}
                </div>
              </div>
            ))}

            {/* Total Row */}
            <div className="grid grid-cols-3 bg-stone-900 text-white">
              <div className="p-4 md:p-5 text-sm font-semibold">
                {c.commissionTotalLabel}
              </div>
              <div className="p-4 md:p-5 text-sm text-center border-l border-stone-700 font-semibold text-red-400">
                {c.commissionTotalAggregator}
              </div>
              <div className="p-4 md:p-5 text-sm text-center border-l border-stone-700 font-semibold text-green-400">
                {c.commissionTotalMenuthere}
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-400 mt-4">{c.commissionFootnote}</p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ OUR SOLUTION ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            {c.solutionHeading}
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            {c.solutionSubheading}
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {OUR_SOLUTION.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-6 border border-stone-200"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-100/70 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-2">
                {item.title}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ BEFORE / AFTER COMPARISON ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            {c.realNumbersHeading}
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            {c.realNumbersSubheading}
          </p>

          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-stone-900 text-white text-sm">
              <div className="p-4 font-medium"></div>
              <div className="p-4 font-medium text-center border-l border-stone-700">
                {c.realNumbersColAggregators}
              </div>
              <div className="p-4 font-medium text-center border-l border-stone-700">
                Menuthere
              </div>
            </div>

            {/* Table Rows */}
            {REAL_NUMBERS.map((row, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-3 text-sm ${idx < REAL_NUMBERS.length - 1 ? "border-b border-stone-100" : ""}`}
              >
                <div className="p-4 text-stone-900 font-medium">
                  {row.metric}
                </div>
                <div className="p-4 text-center border-l border-stone-100 flex items-center justify-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <span className="text-red-600 font-medium text-xs sm:text-sm">{row.aggregator}</span>
                </div>
                <div className="p-4 text-center border-l border-stone-100 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-green-600 font-medium text-xs sm:text-sm">
                    {row.direct}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ IMPORTANT NOTES (Delivery & Payment) ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            {c.transparencyHeading}
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            {c.transparencySubheading}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery Note */}
            <div className="bg-amber-50/50 rounded-xl p-6 border border-amber-200/60">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
                <Truck className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-2">
                {c.deliveryTitle}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">
                {c.deliveryBody}
              </p>
              <ul className="space-y-2.5">
                {[
                  c.deliveryPoint1,
                  c.deliveryPoint2,
                  c.deliveryPoint3,
                  c.deliveryPoint4,
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="text-stone-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 mt-4 font-medium">
                {c.deliveryNote}
              </p>
            </div>

            {/* Payment Integration Note */}
            <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-200/60">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <CreditCard className="w-5 h-5 text-blue-700" />
              </div>
              <div className="flex items-center gap-2.5 mb-2">
                <h3 className="text-base font-semibold text-stone-900">
                  {c.paymentTitle}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[11px] font-semibold border border-green-200">
                  <Sparkles className="w-3 h-3" />
                  {c.paymentBadge}
                </span>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">
                {c.paymentBody}
              </p>
              <ul className="space-y-2.5">
                {[
                  c.paymentPoint1,
                  c.paymentPoint2,
                  c.paymentPoint3,
                  c.paymentPoint4,
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-stone-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-blue-700 mt-4 font-medium">
                {c.paymentNote}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ INDUSTRY FACTS ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            {c.factsHeading}
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            {c.factsSubheading}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                stat: c.value35Percent,
                text: c.fact1Text,
              },
              {
                stat: c.fact2Value,
                text: c.fact2Text,
              },
              {
                stat: c.fact3Value,
                text: c.fact3Text,
              },
              {
                stat: c.fact4Value,
                text: c.fact4Text,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-6 border border-stone-200"
              >
                <div className="text-2xl md:text-3xl font-semibold text-orange-600 mb-2">
                  {item.stat}
                </div>
                <p className="text-stone-500 text-sm leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            {c.howItWorksHeading}
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            {c.howItWorksSubheading}
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-16 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              icon: Store,
              title: c.step1Title,
              description: c.step1Body,
            },
            {
              step: "02",
              icon: TrendingUp,
              title: c.step2Title,
              description: c.step2Body,
            },
            {
              step: "03",
              icon: Users,
              title: c.step3Title,
              description: c.step3Body,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-6 border border-stone-200 text-center"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100/70 mb-4">
                <item.icon className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">
                {interpolate(shared.stepLabel, { step: item.step })}
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-2">
                {item.title}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ SAVINGS CTA ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <div className="bg-orange-600 rounded-xl p-8 md:p-12 text-white">
            <h2 className="geist-font font-semibold text-2xl md:text-3xl mb-4">
              {c.savingsHeading}
            </h2>
            <p className="text-white/70 mb-6 max-w-xl leading-relaxed">
              {c.savingsBody}
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonV2 href="https://wa.me/918590115462?text=Hi%2C%20I%27m%20interested%20in%20PetPooja%20%2B%20Menuthere" variant="primary" className="bg-stone-900 text-white border-stone-700 hover:bg-stone-800 hover:text-white text-nowrap">
                {c.heroPrimaryCta}
              </ButtonV2>
              <ButtonV2 href="/pricing#plan-petpooja" variant="secondary" className="border-white/40 text-white hover:bg-white/10 hover:text-white hover:border-white/60 text-nowrap">
                {c.savingsSecondaryCta}
              </ButtonV2>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-3xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            {shared.faqHeading}
          </h2>
          <p className="text-base text-stone-500 mb-12">{c.faqSubheading}</p>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_DATA.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-stone-200 last:border-b-0 py-1"
              >
                <AccordionTrigger className="text-left text-base font-medium text-stone-900 hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-stone-500 text-sm leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* CTA */}
      <StartFreeTrailSection />

      {/* Footer */}
      <Footer appName="Menuthere" />

      {/* Chat */}
      <WhatsAppButton />
    </main>
  );
}
