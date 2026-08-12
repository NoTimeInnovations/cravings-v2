import { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import Image from "next/image";
import {
  ArrowRight,
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
    <main className="min-h-screen bg-white relative">
      <JsonLd data={breadcrumbSchema} />

      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="max-w-[90%] mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 md:gap-40 gap-20 items-center ">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e65a22]/10 text-[#e65a22] rounded-full text-sm font-medium mb-6 border border-[#e65a22]/20">
                <div className="w-5 h-5 relative rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src="/google_business_logo.png"
                    alt="Google Business"
                    fill
                    className="object-cover"
                  />
                </div>
                {c.heroBadge}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-gray-900 leading-[1.1] mb-2 tracking-tight">
                {c.heroTitle}
              </h1>
              <p className="text-base text-gray-600 leading-relaxed mb-8 max-w-xl">
                {c.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#e65a22] rounded-xl hover:bg-[#d14d1a] hover:shadow-lg hover:shadow-[#e65a22]/25 transition-all duration-300"
                >
                  {c.heroPrimaryCta}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  href="/help-center"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-900 bg-white border-2 border-gray-200 rounded-xl hover:border-[#e65a22] hover:text-[#e65a22] transition-all duration-300"
                >
                  {shared.bookDemoCta}
                </Link>
              </div>
            </div>

            {/* Right - Google Business Card Mockup */}
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-400/20 via-green-400/10 to-yellow-400/20 rounded-3xl blur-2xl" />

              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-[#4285F4] to-[#3367D6] p-6">
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
                      <div className="text-blue-100 text-sm">
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
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        156
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {c.mockupStatItemsLabel}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">12</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {c.mockupStatCategoriesLabel}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        98%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {c.mockupStatImagesLabel}
                      </div>
                    </div>
                  </div>

                  {/* Sample Menu Items */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
                        className="flex items-center justify-between py-2 px-3 bg-gray-50/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Utensils className="w-4 h-4 text-orange-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {item.cat}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-700">
                          {item.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -left-4 bottom-12 bg-white rounded-xl shadow-xl p-3 border border-gray-100 hidden md:flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e65a22]/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#e65a22]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">
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
      <section className="py-8 bg-gradient-to-r from-[#e65a22] via-[#d14d1a] to-[#e65a22] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white text-center">
            {STATS.map((stat, idx) => (
              <div key={idx}>
                <div className="text-3xl md:text-4xl font-bold">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base text-orange-100">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="py-24 bg-white/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-[#e65a22]/10 text-[#d14d1a] rounded-full text-sm font-medium mb-4">
              {c.howItWorksBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {c.howItWorksHeading}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {c.howItWorksSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
            {/* Connection line (desktop) */}
            <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-[#e65a22]/30 via-[#e65a22] to-[#e65a22]/30" />

            {HOW_IT_WORKS.map((item, idx) => (
              <div
                key={idx}
                className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center group"
              >
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#e65a22] text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-[#e65a22]/20">
                    <item.icon className="w-8 h-8" />
                  </div>
                  <div className="text-xs font-bold text-[#e65a22] uppercase tracking-widest mb-2">
                    {interpolate(shared.stepLabel, { step: item.step })}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ BENEFITS ═══════════════ */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {c.benefitsHeading}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {c.benefitsSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map((benefit, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-xl bg-[#e65a22]/10 flex items-center justify-center mb-5 group-hover:bg-[#e65a22] group-hover:scale-110 transition-all duration-300">
                  <benefit.icon className="w-7 h-7 text-[#e65a22] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ BEFORE / AFTER ═══════════════ */}
      <section className="py-24 bg-white/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {c.comparisonHeading}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {c.comparisonSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Before */}
            <div className="bg-white rounded-2xl border-2 border-red-100 p-8 relative">
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
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="bg-white rounded-2xl border-2 border-green-100 p-8 relative shadow-lg shadow-green-50">
              <div className="absolute -top-4 left-6">
                <span className="bg-green-100 text-green-700 text-sm font-bold px-4 py-1.5 rounded-full">
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
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES LIST ═══════════════ */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                {c.featuresHeading}
              </h2>
              <p className="text-xl text-gray-600 mb-10">
                {c.featuresSubheading}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FEATURES.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-500" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Box */}
            <div className="bg-gradient-to-br from-[#e65a22] to-[#d14d1a] rounded-2xl p-10 text-white shadow-2xl relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <Globe className="w-16 h-16 mb-6 text-white/80" />
                <h3 className="text-2xl font-bold mb-4">{c.ctaBoxHeading}</h3>
                <p className="text-lg text-orange-100 mb-8 leading-relaxed">
                  {c.ctaBoxBody}
                </p>
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-white text-[#e65a22] rounded-xl hover:bg-gray-50 transition-colors shadow-lg"
                >
                  {c.ctaBoxButton}
                  <ArrowUpRight className="ml-2 w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ COMING SOON ═══════════════ */}
      <section className="py-20 bg-[#e65a22] relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm font-medium mb-5">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white">{c.comingSoonBadge}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {c.comingSoonHeading}
            </h2>
            <p className="text-orange-100 max-w-xl mx-auto">
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
                <h3 className="text-lg font-bold text-white">
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
                <h3 className="text-lg font-bold text-white">
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
      <section className="py-24 bg-white/60 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-[#e65a22] to-[#d14d1a] rounded-2xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-6 h-6 fill-current" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl font-medium leading-relaxed mb-8">
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
      <section className="py-24 bg-white relative">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="geist-font text-3xl md:text-5xl font-semibold text-gray-900 tracking-tight">
              {shared.faqHeading}
            </h2>
            <p className="text-stone-500 mt-4">{c.faqSubheading}</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((faq, index) => (
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

      {/* CTA */}
      <StartFreeTrailSection />

      {/* Footer */}
      <Footer appName="Menuthere" />

      {/* Chat */}
      <WhatsAppButton />
    </main>
  );
}
