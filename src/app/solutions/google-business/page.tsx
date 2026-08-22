import { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import Image from "next/image";
import {
  Check,
  Globe,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Search,
  MapPin,
  Star,
  Shield,
  Clock,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  Send,
  Utensils,
  Zap,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/dictionaries";
import { ButtonV2 } from "@/components/ui/ButtonV2";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();

  return {
    title: t.solutionsRest.googleBusiness.metaTitle,
    description: t.solutionsRest.googleBusiness.metaDescription,
    alternates: { canonical: "https://menuthere.com/solutions/google-business" },
    openGraph: {
      title: t.solutionsRest.googleBusiness.metaTitle,
      description: t.solutionsRest.googleBusiness.ogDescription,
      type: "website",
      url: "https://menuthere.com/solutions/google-business",
    },
  };
}

export default async function GoogleBusinessPage() {
  const { t } = await getT();
  const c = t.solutionsRest.googleBusiness;
  const shared = t.solutionsRest.shared;
  const appName = "Menuthere";

  // Copy lives in the dictionary, so these lists are built inside the
  // component — a module-level const cannot read the request's locale.
  const HOW_IT_WORKS = [
    {
      step: "01",
      title: c.step1Title,
      description: c.step1Body,
      icon: Utensils,
    },
    {
      step: "02",
      title: c.step2Title,
      description: c.step2Body,
      icon: Globe,
    },
    {
      step: "03",
      title: c.step3Title,
      description: c.step3Body,
      icon: Zap,
    },
  ];

  const BENEFITS = [
    {
      icon: Search,
      title: c.benefit1Title,
      description: c.benefit1Body,
    },
    {
      icon: MapPin,
      title: c.benefit2Title,
      description: c.benefit2Body,
    },
    {
      icon: RefreshCw,
      title: c.benefit3Title,
      description: c.benefit3Body,
    },
    {
      icon: Clock,
      title: c.benefit4Title,
      description: c.benefit4Body,
    },
    {
      icon: TrendingUp,
      title: c.benefit5Title,
      description: c.benefit5Body,
    },
    {
      icon: Shield,
      title: c.benefit6Title,
      description: c.benefit6Body,
    },
  ];

  const FEATURES = [
    c.feature1,
    c.feature2,
    c.feature3,
    c.feature4,
    c.feature5,
    c.feature6,
    c.feature7,
    c.feature8,
    c.feature9,
    c.feature10,
  ];

  const FAQ = [
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
    { value: c.statSyncingValue, label: c.statSyncingLabel },
    { value: c.statClicksValue, label: c.statClicksLabel },
    { value: c.statSyncTimeValue, label: c.statSyncTimeLabel },
    { value: c.statFootfallValue, label: c.statFootfallLabel },
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
        item: "https://menuthere.com/solutions/google-business",
      },
    ],
  };

  return (
    <main className="geist-font min-h-screen bg-white relative">
      <JsonLd data={breadcrumbSchema} />

      {/* ═══════════════ HERO ═══════════════ */}
      <section
        className="relative pt-32 md:pt-40 pb-16 md:pb-24 bg-[#FAF7F0] overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 100% 0%, rgba(255,138,66,0.10) 0%, rgba(255,138,66,0.04) 35%, transparent 70%)",
        }}
      >
        <div className="relative mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white border border-[rgba(232,93,4,0.18)] text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#E85D04] shadow-[0_2px_8px_-3px_rgba(232,93,4,0.25)] mb-6">
                <div className="w-4 h-4 relative rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src="/google_business_logo.png"
                    alt="Google Business"
                    fill
                    className="object-cover"
                  />
                </div>
                {c.heroBadge}
              </div>
              <h1
                className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-[clamp(40px,5.2vw,64px)] leading-[1.05] mb-4"
                style={{ letterSpacing: "-0.03em" }}
              >
                {c.heroTitle}
              </h1>
              <p className="text-[16px] text-[#4A4A50] leading-relaxed mb-8 max-w-xl">
                {c.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <ButtonV2 href="/get-started" variant="primary" className="justify-center sm:justify-start">
                  {c.heroPrimaryCta}
                </ButtonV2>
                <ButtonV2 href="/help-center" variant="secondary" className="justify-center sm:justify-start">
                  {shared.bookDemoCta}
                </ButtonV2>
              </div>
            </div>

            {/* Right - Google Business Card Mockup */}
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-4 bg-[#FF8A42]/15 rounded-3xl blur-2xl" />

              <div className="relative bg-white rounded-2xl shadow-[0_24px_60px_-24px_rgba(11,11,12,0.28)] border border-[rgba(11,11,12,0.08)] overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-[#E85D04] to-[#d15503] p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                      <div className="w-9 h-9 relative">
                        <Image
                          src="/google_business_logo.png"
                          alt="Google Business"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">
                        {c.mockupCardTitle}
                      </div>
                      <div className="text-orange-100 text-sm">
                        {c.mockupCardSubtitle}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4">
                  {/* Sync Status */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-green-800">
                          {c.mockupSyncStatusTitle}
                        </div>
                        <div className="text-xs text-green-600">
                          {c.mockupSyncStatusMeta}
                        </div>
                      </div>
                    </div>
                    <div className="text-green-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#FAF7F0] rounded-xl p-3 text-center">
                      <div className="font-bricolage tracking-tight text-2xl font-semibold text-[#0A0A0B]">
                        156
                      </div>
                      <div className="text-xs text-[#76767B] mt-1">
                        {c.mockupStatItemsLabel}
                      </div>
                    </div>
                    <div className="bg-[#FAF7F0] rounded-xl p-3 text-center">
                      <div className="font-bricolage tracking-tight text-2xl font-semibold text-[#0A0A0B]">12</div>
                      <div className="text-xs text-[#76767B] mt-1">
                        {c.mockupStatCategoriesLabel}
                      </div>
                    </div>
                    <div className="bg-[#FAF7F0] rounded-xl p-3 text-center">
                      <div className="font-bricolage tracking-tight text-2xl font-semibold text-[#0A0A0B]">
                        98%
                      </div>
                      <div className="text-xs text-[#76767B] mt-1">
                        {c.mockupStatImagesLabel}
                      </div>
                    </div>
                  </div>

                  {/* Sample Menu Items */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[#8E8E94] uppercase tracking-wider">
                      {c.mockupRecentlySyncedLabel}
                    </div>
                    {[
                      {
                        name: c.mockupItem1Name,
                        price: "₹349",
                        cat: c.mockupItem1Category,
                      },
                      {
                        name: c.mockupItem2Name,
                        price: "₹279",
                        cat: c.mockupItem2Category,
                      },
                      {
                        name: c.mockupItem3Name,
                        price: "₹129",
                        cat: c.mockupItem3Category,
                      },
                    ].map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between py-2 px-3 bg-[#FAF7F0]/60 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#E85D04]/10 rounded-lg flex items-center justify-center">
                            <Utensils className="w-4 h-4 text-[#E85D04]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#0A0A0B]">
                              {item.name}
                            </div>
                            <div className="text-xs text-[#8E8E94]">
                              {item.cat}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-[#4A4A50]">
                          {item.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -left-4 bottom-12 bg-white rounded-xl shadow-[0_12px_32px_-16px_rgba(11,11,12,0.28)] p-3 border border-[rgba(11,11,12,0.08)] hidden md:flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E85D04]/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#E85D04]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0A0A0B]">
                    {c.mockupBadgeTitle}
                  </div>
                  <div className="text-xs text-green-600 font-semibold">
                    {c.mockupBadgeValue}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ STATS BAR ═══════════════ */}
      <section className="py-10 bg-[#E85D04] relative">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white text-center">
            {STATS.map((stat, idx) => (
              <div key={idx}>
                <div className="font-bricolage tracking-tight font-semibold text-3xl md:text-4xl">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base text-orange-100 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="py-16 md:py-24 bg-[#FAF7F0] relative">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white border border-[rgba(232,93,4,0.18)] text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#E85D04] shadow-[0_2px_8px_-3px_rgba(232,93,4,0.25)] mb-5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#E85D04] opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E85D04]" />
              </span>
              <span>{c.howItWorksBadge}</span>
            </div>
            <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1] mb-4">
              {c.howItWorksHeading}
            </h2>
            <p className="text-[17px] text-[#4A4A50] max-w-2xl mx-auto leading-relaxed">
              {c.howItWorksSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
            {/* Connection line (desktop) */}
            <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-[#E85D04]/30 via-[#E85D04] to-[#E85D04]/30" />

            {HOW_IT_WORKS.map((item, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-8 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)] hover:shadow-[0_20px_44px_-18px_rgba(11,11,12,0.22)] transition-all duration-300 hover:-translate-y-1 text-center group"
              >
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E85D04] text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_12px_24px_-10px_rgba(232,93,4,0.5)]">
                    <item.icon className="w-8 h-8" />
                  </div>
                  <div className="text-xs font-bold text-[#E85D04] uppercase tracking-widest mb-2">
                    {interpolate(shared.stepLabel, { step: item.step })}
                  </div>
                  <h3 className="font-bricolage text-xl font-semibold tracking-tight text-[#0A0A0B] mb-3">
                    {item.title}
                  </h3>
                  <p className="text-[#4A4A50] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ BENEFITS ═══════════════ */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1] mb-4">
              {c.benefitsHeading}
            </h2>
            <p className="text-[17px] text-[#4A4A50] max-w-2xl mx-auto leading-relaxed">
              {c.benefitsSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map((benefit, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-8 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)] hover:shadow-[0_20px_44px_-18px_rgba(11,11,12,0.22)] transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-[#E85D04]/10 grid place-items-center mb-5 group-hover:bg-[#E85D04] group-hover:scale-110 transition-all duration-300">
                  <benefit.icon className="w-6 h-6 text-[#E85D04] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-bricolage text-xl font-semibold tracking-tight text-[#0A0A0B] mb-3">
                  {benefit.title}
                </h3>
                <p className="text-[#4A4A50] leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ BEFORE / AFTER ═══════════════ */}
      <section className="py-16 md:py-24 bg-[#FAF7F0] relative">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1] mb-4">
              {c.comparisonHeading}
            </h2>
            <p className="text-[17px] text-[#4A4A50] max-w-2xl mx-auto leading-relaxed">
              {c.comparisonSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Before */}
            <div className="bg-white rounded-2xl border border-[rgba(11,11,12,0.08)] p-8 relative shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)]">
              <div className="absolute -top-4 left-6">
                <span className="bg-red-100 text-red-700 text-sm font-bold px-4 py-1.5 rounded-full">
                  {c.comparisonWithoutBadge}
                </span>
              </div>
              <ul className="space-y-4 mt-4">
                {[
                  c.comparisonWithout1,
                  c.comparisonWithout2,
                  c.comparisonWithout3,
                  c.comparisonWithout4,
                  c.comparisonWithout5,
                  c.comparisonWithout6,
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-red-400 text-lg mt-0.5">✕</span>
                    <span className="text-[#4A4A50]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="bg-white rounded-2xl border border-[#E85D04]/25 p-8 relative shadow-[0_20px_44px_-18px_rgba(232,93,4,0.28)]">
              <div className="absolute -top-4 left-6">
                <span className="bg-[#E85D04]/12 text-[#E85D04] text-sm font-bold px-4 py-1.5 rounded-full">
                  {c.comparisonWithBadge}
                </span>
              </div>
              <ul className="space-y-4 mt-4">
                {[
                  c.comparisonWith1,
                  c.comparisonWith2,
                  c.comparisonWith3,
                  c.comparisonWith4,
                  c.comparisonWith5,
                  c.comparisonWith6,
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="inline-grid place-items-center h-5 w-5 rounded-full bg-[#E85D04]/12 text-[#E85D04] flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                    <span className="text-[#4A4A50]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ FEATURES LIST ═══════════════ */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1] mb-6">
                {c.featuresHeading}
              </h2>
              <p className="text-[17px] text-[#4A4A50] mb-10 leading-relaxed">
                {c.featuresSubheading}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FEATURES.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="inline-grid place-items-center h-5 w-5 rounded-full bg-[#E85D04]/12 text-[#E85D04] flex-shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                    <span className="text-[#4A4A50]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Box */}
            <div className="bg-gradient-to-br from-[#E85D04] to-[#d15503] rounded-2xl p-10 text-white shadow-[0_28px_60px_-24px_rgba(232,93,4,0.5)] relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <Globe className="w-16 h-16 mb-6 text-white/80" />
                <h3 className="font-bricolage text-2xl font-semibold tracking-tight mb-4">{c.ctaBoxHeading}</h3>
                <p className="text-lg text-orange-100 mb-8 leading-relaxed">
                  {c.ctaBoxBody}
                </p>
                <Link
                  href="/get-started"
                  className="inline-flex items-center gap-1.5 bg-[#0A0A0B] hover:bg-[#1A1A1C] text-white rounded-[12px] px-5 py-3 text-sm font-semibold transition-all duration-300 active:scale-[0.98] shadow-[0_8px_20px_-10px_rgba(11,11,12,0.45)]"
                >
                  {c.ctaBoxButton}
                  <ArrowUpRight className="ml-1 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ COMING SOON ═══════════════ */}
      <section className="py-16 md:py-20 bg-[#E85D04] relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#d15503]/40 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-12 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm font-medium mb-5">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white">{c.comingSoonBadge}</span>
            </div>
            <h2 className="font-bricolage text-white tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1] mb-4">
              {c.comingSoonHeading}
            </h2>
            <p className="text-orange-100 max-w-xl mx-auto leading-relaxed">
              {c.comingSoonBody}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1: Auto-Post to Google */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bricolage text-lg font-semibold tracking-tight text-white">
                  {c.autoPostTitle}
                </h3>
              </div>
              <p className="text-orange-100 text-sm leading-relaxed mb-5">
                {c.autoPostBody}
              </p>
              <div className="space-y-2.5">
                {[
                  c.autoPostPoint1,
                  c.autoPostPoint2,
                  c.autoPostPoint3,
                  c.autoPostPoint4,
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                    <span className="text-sm text-orange-50">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 2: AI Auto-Reply to Reviews */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bricolage text-lg font-semibold tracking-tight text-white">
                  {c.reviewRepliesTitle}
                </h3>
              </div>
              <p className="text-orange-100 text-sm leading-relaxed mb-5">
                {c.reviewRepliesBody}
              </p>
              <div className="space-y-2.5">
                {[
                  c.reviewRepliesPoint1,
                  c.reviewRepliesPoint2,
                  c.reviewRepliesPoint3,
                  c.reviewRepliesPoint4,
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                    <span className="text-sm text-orange-50">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIAL ═══════════════ */}
      <section className="py-16 md:py-24 bg-[#FAF7F0] relative">
        <div className="max-w-4xl mx-auto px-6 md:px-10 lg:px-12">
          <div className="bg-gradient-to-br from-[#E85D04] to-[#d15503] rounded-2xl p-8 md:p-12 text-white shadow-[0_28px_60px_-24px_rgba(232,93,4,0.5)] relative overflow-hidden">
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-6 h-6 fill-current" />
                ))}
              </div>
              <blockquote className="font-bricolage tracking-tight text-xl md:text-2xl font-medium leading-relaxed mb-8">
                {c.testimonialQuote}
              </blockquote>
              <div>
                <div className="font-bold text-lg">{c.testimonialAuthor}</div>
                <div className="opacity-80">{c.testimonialRole}</div>
                <div className="opacity-60 text-sm">{c.testimonialLocation}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="max-w-3xl mx-auto px-6 md:px-10 lg:px-12">
          <div className="text-center mb-14">
            <h2 className="font-bricolage text-[#0A0A0B] text-3xl md:text-[42px] font-semibold tracking-tight leading-[1.1]">
              {shared.faqHeading}
            </h2>
            <p className="text-[#76767B] mt-4">{c.faqSubheading}</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((faq, index) => (
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

      {/* CTA */}
      <StartFreeTrailSection />

      {/* Footer */}
      <Footer appName="Menuthere" />

      {/* Chat */}
      <WhatsAppButton />
    </main>
  );
}
