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
} from "lucide-react";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import RestaurantMarquee from "@/components/international/RestaurantMarquee";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import Chatwoot from "@/components/Chatwoot";

export const metadata: Metadata = {
  title: "Digital Menu Solutions for Every Food Business | Menuthere",
  description:
    "Transform your food business with smart digital menus. Perfect for restaurants, cafes, bakeries, cloud kitchens, hotels, food trucks, bars, and catering services. QR code menus, real-time updates, Google Business Profile sync.",
  keywords:
    "digital menu, QR code menu, restaurant technology, cafe menu, bakery menu, cloud kitchen, food truck menu, hotel dining, bar menu, catering menu, contactless ordering",
  openGraph: {
    title: "Digital Menu Solutions | Menuthere",
    description:
      "Smart digital menus for restaurants, cafes, bakeries, and more. Real-time updates, beautiful designs, zero printing costs.",
    type: "website",
    url: "https://menuthere.com/solutions",
  },
};

const SOLUTIONS = [
  {
    slug: "restaurants",
    title: "Restaurants",
    shortDesc: "Smart digital menus for dine-in excellence",
    icon: Utensils,
  },
  {
    slug: "cafes",
    title: "Cafes & Coffee Shops",
    shortDesc: "Modern menus for the perfect brew experience",
    icon: Coffee,
  },
  {
    slug: "bakeries",
    title: "Bakeries & Pastry Shops",
    shortDesc: "Showcase your fresh bakes beautifully",
    icon: Cake,
  },
  {
    slug: "cloud-kitchens",
    title: "Cloud Kitchens",
    shortDesc: "Multi-brand menu management made easy",
    icon: ChefHat,
  },
  {
    slug: "hotels",
    title: "Hotels & Resorts",
    shortDesc: "Elegant dining experiences for guests",
    icon: Building2,
  },
  {
    slug: "food-trucks",
    title: "Food Trucks",
    shortDesc: "Mobile menus that go wherever you go",
    icon: Truck,
  },
  {
    slug: "bars",
    title: "Bars & Pubs",
    shortDesc: "Dynamic drink menus with style",
    icon: Wine,
  },
  {
    slug: "catering",
    title: "Catering Services",
    shortDesc: "Professional menus for every event",
    icon: PartyPopper,
  },
  {
    slug: "owners",
    title: "Restaurant Owners",
    shortDesc: "Take back control of your restaurant operations",
    icon: Briefcase,
  },
  {
    slug: "agencies",
    title: "Agencies & Consultants",
    shortDesc: "Manage multiple client accounts with ease",
    icon: Briefcase,
  },
];

const FEATURES = [
  {
    icon: QrCode,
    title: "QR Code Menus",
    description:
      "Instant access via smartphone scan. No app downloads required.",
  },
  {
    icon: Clock,
    title: "Real-Time Updates",
    description: "Change prices, add items, mark sold-out instantly.",
  },
  {
    icon: Globe,
    title: "Google Business Sync",
    description: "Auto-update your Google Business Profile menu.",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Insights",
    description: "Track popular items and customer preferences.",
  },
];

export default async function SolutionsPage() {
  return (
    <main className="min-h-screen w-full bg-white geist-font">
      {/* Hero Section */}
      <section className="flex items-center justify-center px-5 pb-16 pt-32 md:pt-40 bg-[#fcfbf7]">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
            Digital menus that{" "}
            <span className="text-stone-500 italic">transform</span> your
            business.
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-lg mx-auto mt-5 leading-relaxed">
            Whether you run a cozy cafe, a bustling restaurant, or a cloud
            kitchen empire - our platform adapts to your unique needs.
          </p>
          <div className="flex items-center gap-3 mt-8 justify-center">
            <ButtonV2 href="/get-started" variant="primary">
              Get Started Free
            </ButtonV2>
            <ButtonV2 href="https://cal.id/menuthere" variant="secondary">
              Book a Demo
            </ButtonV2>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Solutions Grid */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            Choose your industry,{" "}
            <span className="text-stone-500">get started.</span>
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            Tailored digital menu solutions designed specifically for your type
            of food business.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SOLUTIONS.map((solution) => (
            <Link
              key={solution.slug}
              href={`/solutions/${solution.slug}`}
              className="group relative bg-white rounded-xl border border-stone-200 p-6 hover:border-stone-400 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-100/70 flex items-center justify-center mb-4 group-hover:bg-orange-600 transition-colors duration-300">
                <solution.icon className="w-5 h-5 text-orange-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-1 group-hover:text-orange-600 transition-colors">
                {solution.title}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                {solution.shortDesc}
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Features Section */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-12">
            Powerful features,{" "}
            <span className="text-stone-500">every business.</span>
          </h2>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-6 border border-stone-200"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-100/70 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Google Business Section */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium mb-6">
              Google Business Integration
            </span>
            <h2 className="geist-font font-semibold text-2xl md:text-3xl text-stone-900 leading-tight mb-4">
              Sync your menu with Google Business Profile
            </h2>
            <p className="text-base text-stone-500 mb-6 leading-relaxed">
              Automatically update your Google Business Profile menu whenever
              you make changes. Customers searching for you on Google Maps will
              always see your latest offerings.
            </p>
            <ul className="space-y-3 mb-6">
              {[
                "One-click sync to Google Business Profile",
                "Real-time menu updates across platforms",
                "Improved local SEO and visibility",
                "Attract more customers from Google Search & Maps",
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-stone-600 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/solutions/google-business"
              className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors group"
            >
              Learn about Google Business Manager
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="bg-blue-600 rounded-2xl p-8 text-white">
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
                <div className="font-semibold">Google Business Profile</div>
                <div className="text-blue-200 text-sm">Menu Manager</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-sm text-blue-200 mb-1">
                  Menu Items Synced
                </div>
                <div className="text-2xl font-bold">247</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-sm text-blue-200 mb-1">Last Sync</div>
                <div className="text-lg font-semibold">Just now</div>
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
      <Chatwoot />
    </main>
  );
}
