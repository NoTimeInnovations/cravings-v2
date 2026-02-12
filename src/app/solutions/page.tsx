import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { getDomainConfig } from "@/lib/domain-utils";
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
  Briefcase
} from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host");
  const config = getDomainConfig(host);

  return {
    title: `Digital Menu Solutions for Every Food Business | ${config.name}`,
    description: `Transform your food business with smart digital menus. Perfect for restaurants, cafés, bakeries, cloud kitchens, hotels, food trucks, bars, and catering services. QR code menus, real-time updates, Google Business Profile sync.`,
    keywords: "digital menu, QR code menu, restaurant technology, café menu, bakery menu, cloud kitchen, food truck menu, hotel dining, bar menu, catering menu, contactless ordering",
    openGraph: {
      title: `Digital Menu Solutions | ${config.name}`,
      description: "Smart digital menus for restaurants, cafés, bakeries, and more. Real-time updates, beautiful designs, zero printing costs.",
      type: "website",
      url: "https://www.cravings.live/solutions",
    },
  };
}



const SOLUTIONS = [
  {
    slug: "restaurants",
    title: "Restaurants",
    shortDesc: "Smart digital menus for dine-in excellence",
    icon: Utensils,
    color: "bg-[#e65a22]",
    image: "/images/solutions/restaurant.jpg"
  },
  {
    slug: "cafes",
    title: "Cafés & Coffee Shops",
    shortDesc: "Modern menus for the perfect brew experience",
    icon: Coffee,
    color: "bg-[#e65a22]",
    image: "/images/solutions/cafe.jpg"
  },
  {
    slug: "bakeries",
    title: "Bakeries & Pastry Shops",
    shortDesc: "Showcase your fresh bakes beautifully",
    icon: Cake,
    color: "bg-[#e65a22]",
    image: "/images/solutions/bakery.jpg"
  },
  {
    slug: "cloud-kitchens",
    title: "Cloud Kitchens",
    shortDesc: "Multi-brand menu management made easy",
    icon: ChefHat,
    color: "bg-[#e65a22]",
    image: "/images/solutions/cloud-kitchen.jpg"
  },
  {
    slug: "hotels",
    title: "Hotels & Resorts",
    shortDesc: "Elegant dining experiences for guests",
    icon: Building2,
    color: "bg-[#e65a22]",
    image: "/images/solutions/hotel.jpg"
  },
  {
    slug: "food-trucks",
    title: "Food Trucks",
    shortDesc: "Mobile menus that go wherever you go",
    icon: Truck,
    color: "bg-[#e65a22]",
    image: "/images/solutions/food-truck.jpg"
  },
  {
    slug: "bars",
    title: "Bars & Pubs",
    shortDesc: "Dynamic drink menus with style",
    icon: Wine,
    color: "bg-[#e65a22]",
    image: "/images/solutions/bar.jpg"
  },
  {
    slug: "catering",
    title: "Catering Services",
    shortDesc: "Professional menus for every event",
    icon: PartyPopper,
    color: "bg-[#e65a22]",
    image: "/images/solutions/catering.jpg"
  },
  {
    slug: "owners",
    title: "Restaurant Owners",
    shortDesc: "Take back control of your restaurant operations",
    icon: Briefcase,
    color: "bg-[#e65a22]",
    image: "/assets/mockups/solutions-owners-v4.png"
  },
  {
    slug: "agencies",
    title: "Agencies & Consultants",
    shortDesc: "Manage multiple client accounts with ease",
    icon: Briefcase,
    color: "bg-[#e65a22]",
    image: "/assets/mockups/agencis-v1.jpeg"
  },
];

const FEATURES = [
  {
    icon: QrCode,
    title: "QR Code Menus",
    description: "Instant access via smartphone scan. No app downloads required."
  },
  {
    icon: Clock,
    title: "Real-Time Updates",
    description: "Change prices, add items, mark sold-out instantly."
  },
  {
    icon: Globe,
    title: "Google Business Sync",
    description: "Auto-update your Google Business Profile menu."
  },
  {
    icon: TrendingUp,
    title: "Analytics & Insights",
    description: "Track popular items and customer preferences."
  },
];

export default async function SolutionsPage() {
  const headersList = await headers();
  const host = headersList.get("host");
  const config = getDomainConfig(host);
  const appName = "MenuThere";

  return (
    <main className="min-h-screen bg-[#f4e5d5] relative">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-[90%] mx-auto px-4 sm:px-6 relative">
          <div className="text-center max-w-4xl mx-auto">
            <span className="inline-block px-4 py-2 bg-[#e65a22]/10 text-[#d14d1a] rounded-full text-sm font-medium mb-6">
              Solutions for Every Food Business
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-2">
              Digital Menus That
              <span className="text-[#e65a22]"> Transform </span>
              Your Business
            </h1>
            <p className="text-base text-gray-600 leading-relaxed mb-8 max-w-3xl mx-auto">
              Whether you run a cozy café, a bustling restaurant, or a cloud kitchen empire -
              our digital menu platform adapts to your unique needs. Beautiful, fast, and built for growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#e65a22] rounded-xl hover:bg-[#d14d1a] hover:shadow-lg transition-all duration-300"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                href="https://cal.id/cravings"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-900 bg-white border-2 border-gray-200 rounded-xl hover:border-[#e65a22] hover:text-[#e65a22] transition-all duration-300"
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </div>
      </section>



      {/* Solutions Grid */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Choose Your Industry
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tailored digital menu solutions designed specifically for your type of food business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SOLUTIONS.map((solution, idx) => (
              <div key={solution.slug} className="flex flex-col">
                <Link
                  href={`/solutions/${solution.slug}`}
                  className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1 flex-1"
                >
                  <div className="p-6">
                    <div className={`w-14 h-14 rounded-xl ${solution.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <solution.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#e65a22] transition-colors">
                      {solution.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {solution.shortDesc}
                    </p>
                    <span className="inline-flex items-center text-sm font-medium text-[#e65a22] group-hover:text-[#d14d1a]">
                      Learn more
                      <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
                {/* Related solutions cross-links for SEO */}
                <div className="flex gap-2 mt-2 px-1 flex-wrap">
                  <span className="text-xs text-gray-400">Related:</span>
                  {SOLUTIONS.filter((_, i) => {
                    const next1 = (idx + 1) % SOLUTIONS.length;
                    const next2 = (idx + 2) % SOLUTIONS.length;
                    return i === next1 || i === next2;
                  }).map(related => (
                    <Link key={related.slug} href={`/solutions/${related.slug}`} className="text-xs text-gray-400 hover:text-[#e65a22] transition-colors">
                      {related.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Every Business
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              All the tools you need to modernize your menu and delight your customers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="w-12 h-12 rounded-lg bg-[#e65a22]/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#e65a22]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Google Business Profile Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
                Google Business Integration
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Sync Your Menu with Google Business Profile
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Automatically update your Google Business Profile menu whenever you make changes.
                Customers searching for you on Google Maps will always see your latest offerings,
                prices, and availability.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "One-click sync to Google Business Profile",
                  "Real-time menu updates across platforms",
                  "Improved local SEO and visibility",
                  "Attract more customers from Google Search & Maps"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/product/google-business-manager"
                className="inline-flex items-center text-[#e65a22] font-semibold hover:text-[#d14d1a]"
              >
                Learn about Google Business Manager
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
            <div className="relative">
              <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-lg">Google Business Profile</div>
                    <div className="text-blue-100 text-sm">Menu Manager</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-sm text-blue-100 mb-1">Menu Items Synced</div>
                    <div className="text-2xl font-bold">247</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-sm text-blue-100 mb-1">Last Sync</div>
                    <div className="text-lg font-semibold">Just now ✓</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#e65a22] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Menu?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join thousands of food businesses already using MenuThere to delight their customers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-[#e65a22] bg-white rounded-xl hover:bg-gray-50 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white rounded-xl hover:bg-white/10 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
