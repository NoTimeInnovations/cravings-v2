import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SolutionsHero } from "@/components/solutions/SolutionsHero";
import { SolutionsBenefits } from "@/components/solutions/SolutionsBenefits";
import { SolutionsFeatures } from "@/components/solutions/SolutionsFeatures";
import ownersData from "@/content/solutions/owners.json";
import { ArrowRight, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Restaurant Owner Solutions | Menuthere",
  description:
    "Take back control of your restaurant with Menuthere. Manage menu, POS, captains, and inventory from a single dashboard. Zero commissions, maximum profit.",
};

export default function OwnersPage() {
  const features = ownersData.features.map((f) => ({
    ...f,
    imagePosition: f.imagePosition as "left" | "right" | undefined,
  }));

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <SolutionsHero data={ownersData.hero} />

      {/* Benefits Section */}
      <SolutionsBenefits
        benefits={ownersData.benefits}
        eyebrow="Why Menuthere for Owners?"
      />

      {/* Features Section */}
      <SolutionsFeatures features={features} />

      {/* Reviews Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-medium text-gray-900 mb-4 tracking-tight">
              Loved by Restaurant Owners
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {ownersData.reviews.map((review, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 text-lg italic flex-grow">
                  "{review.text}"
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                    <Image
                      src={review.avatar}
                      alt={review.author}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">
                      {review.author}
                    </div>
                    <div className="text-sm text-gray-500">
                      {review.role}, {review.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-4 md:px-6 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-medium mb-6 tracking-tight">
            {ownersData.cta.title}
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            {ownersData.cta.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={ownersData.cta.buttonLink}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-black bg-white rounded-lg hover:bg-gray-100 transition-all"
            >
              {ownersData.cta.buttonText}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href={ownersData.cta.secondaryButtonLink}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white border border-gray-700 rounded-lg hover:bg-gray-900 transition-all"
            >
              {ownersData.cta.secondaryButtonText}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
