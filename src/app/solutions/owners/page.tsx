import { Metadata } from "next";
import Image from "next/image";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ownersData from "@/content/solutions/owners.json";
import { Star, Check } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { getSolutionContent } from "@/lib/i18n/solutionsContent";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();

  return {
    title: t.solutionsOwners.metaTitle,
    description: t.solutionsOwners.metaDescription,
    alternates: { canonical: "https://menuthere.com/solutions/owners" },
    openGraph: {
      title: t.solutionsOwners.metaTitle,
      description: t.solutionsOwners.metaDescription,
      url: "https://menuthere.com/solutions/owners",
      type: "website",
    },
  };
}

export default async function OwnersPage() {
  const { t, locale } = await getT();
  // Body copy — hero, benefits, features, reviews — lives in JSON rather than
  // JSX, so it cannot be reached by the dictionary. Swap in the translated
  // document for this locale; getSolutionContent falls back to English.
  const content = getSolutionContent("owners", locale, ownersData);

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
        <div className="relative mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
          <div className="w-full max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white border border-[rgba(232,93,4,0.18)] text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#E85D04] shadow-[0_2px_8px_-3px_rgba(232,93,4,0.25)] mb-6">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#E85D04] opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E85D04]" />
              </span>
              <span>{content.hero.eyebrow}</span>
            </div>
            <h1
              className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-[clamp(40px,5.2vw,64px)] leading-[1.05]"
              style={{ letterSpacing: "-0.03em" }}
            >
              {content.hero.headline}
            </h1>
            <p className="text-[15px] sm:text-[17px] text-[#4A4A50] max-w-lg mx-auto mt-6 leading-relaxed">
              {content.hero.subheadline}
            </p>
            <div className="flex items-center gap-3 mt-8 justify-center">
              <ButtonV2 href="/get-started" variant="primary">
                {t.solutionsOwners.heroPrimaryCta}
              </ButtonV2>
              <ButtonV2 href="https://cal.id/menuthere" variant="secondary">
                {t.solutionsOwners.heroSecondaryCta}
              </ButtonV2>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Benefits Section */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12 py-16 md:py-24">
          <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1] mb-12">
            {t.solutionsOwners.benefitsHeading}{" "}
            <span className="text-[#76767B]">
              {t.solutionsOwners.benefitsHeadingAccent}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.benefits.map((benefit, index) => (
              <div
                key={index}
                className="rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-6 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E85D04]/10 text-[#E85D04] grid place-items-center mb-4">
                  <span className="font-bricolage font-semibold text-sm">
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
      <section className="bg-[#FAF7F0]">
        {content.features.map((feature, index) => {
          const isImageRight = feature.imagePosition
            ? feature.imagePosition === "right"
            : index % 2 === 0;

          return (
            <div
              key={index}
              className="py-16 md:py-24 border-b border-[rgba(11,11,12,0.08)] last:border-b-0"
            >
              <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12">
                <div
                  className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-16 ${
                    !isImageRight ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  {/* Text Content */}
                  <div className="flex-1 space-y-5">
                    <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-2xl md:text-[32px] leading-[1.1]">
                      {feature.title}
                    </h2>
                    <p className="text-[15px] sm:text-[17px] text-[#4A4A50] leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-3 pt-2">
                      {feature.list.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <span className="inline-grid place-items-center h-5 w-5 rounded-full bg-[#E85D04]/12 text-[#E85D04] flex-shrink-0">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                          <span className="text-[#4A4A50] text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Image */}
                  <div className="flex-1 w-full">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[rgba(11,11,12,0.08)] bg-white shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)]">
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

      {/* Reviews Section */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12 py-16 md:py-24">
          <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1] mb-12 text-center">
            {t.solutionsOwners.reviewsHeading}{" "}
            <span className="text-[#76767B] italic">
              {t.solutionsOwners.reviewsHeadingAccent}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.reviews.map((review, index) => (
              <div
                key={index}
                className="rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-6 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)] flex flex-col"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-[#FF8A42] fill-current"
                    />
                  ))}
                </div>
                <p className="text-[#4A4A50] mb-6 text-sm leading-relaxed italic flex-grow">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#FAF7F0]">
                    <Image
                      src={review.avatar}
                      alt={review.author}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-[#0A0A0B] text-sm">
                      {review.author}
                    </div>
                    <div className="text-xs text-[#76767B]">
                      {review.role}, {review.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
