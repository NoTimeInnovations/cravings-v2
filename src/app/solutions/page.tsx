import { Metadata } from "next";
import Link from "next/link";
import {
  Utensils,
  Coffee,
  Cake,
  ChefHat,
  Truck,
  Building2,
  Wine,
  PartyPopper,
  ArrowRight,
  QrCode,
  Globe,
  TrendingUp,
  Clock,
  CheckCircle2,
  Briefcase,
  ShieldAlert,
  MessageCircle,
} from "lucide-react";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import RestaurantMarquee from "@/components/international/RestaurantMarquee";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.solutionsIndex.metaTitle,
    description: t.solutionsIndex.metaDescription,
    keywords:
      "digital menu, QR code menu, restaurant technology, cafe menu, bakery menu, cloud kitchen, food truck menu, hotel dining, bar menu, catering menu, contactless ordering",
    openGraph: {
      title: t.solutionsIndex.ogTitle,
      description: t.solutionsIndex.ogDescription,
      type: "website",
      url: "https://menuthere.com/solutions",
    },
  };
}

const SOLUTIONS = [
  {
    slug: "restaurants",
    titleKey: "cardRestaurantsTitle",
    shortDescKey: "cardRestaurantsDesc",
    icon: Utensils,
  },
  {
    slug: "cafes",
    titleKey: "cardCafesTitle",
    shortDescKey: "cardCafesDesc",
    icon: Coffee,
  },
  {
    slug: "bakeries",
    titleKey: "cardBakeriesTitle",
    shortDescKey: "cardBakeriesDesc",
    icon: Cake,
  },
  {
    slug: "cloud-kitchens",
    titleKey: "cardCloudKitchensTitle",
    shortDescKey: "cardCloudKitchensDesc",
    icon: ChefHat,
  },
  {
    slug: "hotels",
    titleKey: "cardHotelsTitle",
    shortDescKey: "cardHotelsDesc",
    icon: Building2,
  },
  {
    slug: "food-trucks",
    titleKey: "cardFoodTrucksTitle",
    shortDescKey: "cardFoodTrucksDesc",
    icon: Truck,
  },
  {
    slug: "bars",
    titleKey: "cardBarsTitle",
    shortDescKey: "cardBarsDesc",
    icon: Wine,
  },
  {
    slug: "catering",
    titleKey: "cardCateringTitle",
    shortDescKey: "cardCateringDesc",
    icon: PartyPopper,
  },
  {
    slug: "owners",
    titleKey: "cardOwnersTitle",
    shortDescKey: "cardOwnersDesc",
    icon: Briefcase,
  },
  {
    slug: "agencies",
    titleKey: "cardAgenciesTitle",
    shortDescKey: "cardAgenciesDesc",
    icon: Briefcase,
  },
  {
    slug: "petpooja",
    titleKey: "cardPetpoojaTitle",
    shortDescKey: "cardPetpoojaDesc",
    icon: ShieldAlert,
  },
  {
    slug: "whatsapp-ordering",
    titleKey: "cardWhatsappOrderingTitle",
    shortDescKey: "cardWhatsappOrderingDesc",
    icon: MessageCircle,
  },
] as const;

const FEATURES = [
  {
    icon: QrCode,
    titleKey: "featureQrTitle",
    descriptionKey: "featureQrDesc",
  },
  {
    icon: Clock,
    titleKey: "featureRealtimeTitle",
    descriptionKey: "featureRealtimeDesc",
  },
  {
    icon: Globe,
    titleKey: "featureGoogleSyncTitle",
    descriptionKey: "featureGoogleSyncDesc",
  },
  {
    icon: TrendingUp,
    titleKey: "featureAnalyticsTitle",
    descriptionKey: "featureAnalyticsDesc",
  },
] as const;

export default async function SolutionsPage() {
  const { t } = await getT();

  return (
    <main className="min-h-screen w-full bg-white geist-font">
      {/* Hero Section */}
      <section
        className="relative pt-32 md:pt-40 pb-16 md:pb-24 bg-[#FAF7F0]"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 100% 0%, rgba(255,138,66,0.10) 0%, rgba(255,138,66,0.04) 35%, transparent 70%)",
        }}
      >
        <div className="relative mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
          <div className="w-full max-w-2xl mx-auto text-center">
            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white border border-[rgba(232,93,4,0.18)] text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#E85D04] shadow-[0_2px_8px_-3px_rgba(232,93,4,0.25)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#E85D04] opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E85D04]" />
              </span>
              <span>{t.solutionsIndex.heroTitleEmphasis}</span>
            </div>
            <h1
              className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-[clamp(40px,5.2vw,64px)] leading-[1.05] mt-6"
              style={{ letterSpacing: "-0.03em" }}
            >
              {t.solutionsIndex.heroTitleLead}{" "}
              <span className="text-[#E85D04]">
                {t.solutionsIndex.heroTitleEmphasis}
              </span>{" "}
              {t.solutionsIndex.heroTitleTail}
            </h1>
            <p className="text-[15px] sm:text-[17px] text-[#4A4A50] max-w-lg mx-auto mt-6 leading-relaxed">
              {t.solutionsIndex.heroSubtitle}
            </p>
            <div className="flex items-center gap-3 mt-8 justify-center">
              <ButtonV2 href="/get-started" variant="primary">
                {t.solutionsIndex.heroPrimaryCta}
              </ButtonV2>
              <ButtonV2 href="https://cal.id/menuthere" variant="secondary">
                {t.solutionsIndex.heroSecondaryCta}
              </ButtonV2>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Solutions Grid */}
      <section className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-bricolage font-semibold text-3xl md:text-[42px] text-[#0A0A0B] tracking-tight leading-[1.1] mb-4">
            {t.solutionsIndex.industriesHeadingLead}{" "}
            <span className="text-[#E85D04]">
              {t.solutionsIndex.industriesHeadingEmphasis}
            </span>
          </h2>
          <p className="text-[15px] md:text-[17px] text-[#4A4A50] max-w-xl leading-relaxed mb-12">
            {t.solutionsIndex.industriesIntro}
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SOLUTIONS.map((solution) => (
            <Link
              key={solution.slug}
              href={`/solutions/${solution.slug}`}
              className="group relative rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-6 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)] hover:border-[rgba(232,93,4,0.35)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E85D04]/10 text-[#E85D04] grid place-items-center mb-4 group-hover:bg-[#E85D04] transition-colors duration-300">
                <solution.icon className="w-5 h-5 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-base font-semibold text-[#0A0A0B] mb-1 group-hover:text-[#E85D04] transition-colors">
                {t.solutionsIndex[solution.titleKey]}
              </h3>
              <p className="text-[#76767B] text-sm leading-relaxed">
                {t.solutionsIndex[solution.shortDescKey]}
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#E85D04] opacity-0 group-hover:opacity-100 transition-opacity">
                {t.solutionsIndex.cardLearnMoreLink}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[#FAF7F0] border-y border-[rgba(11,11,12,0.08)]">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12 py-16 md:py-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-bricolage font-semibold text-3xl md:text-[42px] text-[#0A0A0B] tracking-tight leading-[1.1] mb-12">
              {t.solutionsIndex.featuresHeadingLead}{" "}
              <span className="text-[#E85D04]">
                {t.solutionsIndex.featuresHeadingEmphasis}
              </span>
            </h2>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feature, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-6 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E85D04]/10 text-[#E85D04] grid place-items-center mb-4">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[#0A0A0B] mb-2">
                  {t.solutionsIndex[feature.titleKey]}
                </h3>
                <p className="text-[#76767B] text-sm leading-relaxed">
                  {t.solutionsIndex[feature.descriptionKey]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Google Business Section */}
      <section className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12 py-16 md:py-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center px-3 py-1.5 bg-[#E85D04]/10 text-[#E85D04] rounded-full text-xs font-semibold uppercase tracking-[0.06em] mb-6">
              {t.solutionsIndex.googleBadge}
            </span>
            <h2 className="font-bricolage font-semibold text-2xl md:text-3xl text-[#0A0A0B] tracking-tight leading-[1.1] mb-4">
              {t.solutionsIndex.googleHeading}
            </h2>
            <p className="text-[15px] md:text-[17px] text-[#4A4A50] mb-6 leading-relaxed">
              {t.solutionsIndex.googleBody}
            </p>
            <ul className="space-y-3 mb-6">
              {[
                t.solutionsIndex.googleBenefitOneClickSync,
                t.solutionsIndex.googleBenefitRealtimeUpdates,
                t.solutionsIndex.googleBenefitLocalSeo,
                t.solutionsIndex.googleBenefitMoreCustomers,
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <span className="inline-grid place-items-center h-5 w-5 rounded-full bg-[#E85D04]/12 text-[#E85D04] flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[#4A4A50] text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/solutions/google-business"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#E85D04] hover:text-[#d15503] transition-colors group"
            >
              {t.solutionsIndex.googleManagerLink}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="bg-[#0A0A0B] rounded-2xl p-8 text-white shadow-[0_24px_60px_-24px_rgba(11,11,12,0.5)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <div>
                <div className="font-semibold">
                  {t.solutionsIndex.googleCardTitle}
                </div>
                <div className="text-[#FF8A42] text-sm">
                  {t.solutionsIndex.googleCardSubtitle}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-sm text-[#B2B2B7] mb-1">
                  {t.solutionsIndex.googleCardSyncedLabel}
                </div>
                <div className="font-bricolage text-2xl font-semibold tracking-tight text-[#FF8A42]">
                  247
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-sm text-[#B2B2B7] mb-1">
                  {t.solutionsIndex.googleCardLastSyncLabel}
                </div>
                <div className="text-lg font-semibold">
                  {t.solutionsIndex.googleCardLastSyncValue}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <RestaurantMarquee />

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
