import { Metadata } from "next";
import Image from "next/image";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import Chatwoot from "@/components/Chatwoot";
import ownersData from "@/content/solutions/owners.json";
import { Star, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Restaurant Owner Solutions | Menuthere",
  description:
    "Take back control of your restaurant with Menuthere. Manage menu, POS, captains, and inventory from a single dashboard. Zero commissions, maximum profit.",
};

export default function OwnersPage() {
  return (
    <main className="min-h-screen bg-white geist-font">
      {/* Hero Section */}
      <section className="flex items-center justify-center px-5 pb-16 pt-32 md:pt-40 bg-[#fcfbf7]">
        <div className="w-full max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/70 text-orange-600 text-xs font-medium mb-6">
            {ownersData.hero.eyebrow}
          </div>
          <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
            {ownersData.hero.headline}
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-lg mx-auto mt-5 leading-relaxed">
            {ownersData.hero.subheadline}
          </p>
          <div className="flex items-center gap-3 mt-8 justify-center">
            <ButtonV2 href="/get-started" variant="primary">
              Get Started
            </ButtonV2>
            <ButtonV2 href="https://cal.id/menuthere" variant="secondary">
              Book a Demo
            </ButtonV2>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Benefits Section */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-12">
            Why Menuthere{" "}
            <span className="text-stone-500">for Owners?</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ownersData.benefits.map((benefit, index) => (
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
        {ownersData.features.map((feature, index) => {
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

      {/* Reviews Section */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-12 text-center">
            Loved by restaurant{" "}
            <span className="text-stone-500 italic">owners.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ownersData.reviews.map((review, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-stone-200 flex flex-col"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-stone-600 mb-6 text-sm leading-relaxed italic flex-grow">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-stone-100">
                    <Image
                      src={review.avatar}
                      alt={review.author}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">
                      {review.author}
                    </div>
                    <div className="text-xs text-stone-500">
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
      <Chatwoot />
    </main>
  );
}
