import { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getDomainConfig } from "@/lib/domain-utils";
import { FAQAccordion } from "@/components/FAQAccordion";
import { JsonLd } from "@/components/seo/JsonLd";
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
  ImageIcon,
  Send,
  Utensils,
  Zap,
} from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Manage Your Google Business Menu | Menuthere`,
    description: `Automatically sync your restaurant menu to Google Business Profile. Keep your Google Maps menu always up-to-date. One-click sync, real-time updates, better local SEO. Trusted by 500+ restaurants.`,
    keywords:
      "Google Business Profile menu, Google Maps menu sync, restaurant Google menu, GBP menu manager, Google My Business menu, local SEO restaurant, menu sync automation",
    openGraph: {
      title: `Manage Your Google Business Menu | Menuthere`,
      description:
        "Automatically sync your restaurant menu to Google Maps. Always up-to-date, zero manual effort.",
      type: "website",
      url: "https://menuthere.com/solutions/google-business",
    },
  };
}

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create Your Menu",
    description:
      "Build your menu on our platform with categories, items, prices, and photos. Takes just minutes.",
    icon: Utensils,
  },
  {
    step: "02",
    title: "Connect Google Profile",
    description:
      "Link your Google Business Profile in one click. We handle all the OAuth and API setup for you.",
    icon: Globe,
  },
  {
    step: "03",
    title: "Sync & Go Live",
    description:
      "Hit sync and your entire menu appears on Google Maps. Update anytime - changes reflect instantly.",
    icon: Zap,
  },
];

const BENEFITS = [
  {
    icon: Search,
    title: "Boost Local SEO",
    description:
      'Restaurants with complete Google Business Profiles get 7x more clicks. A synced menu is one of the strongest local ranking signals - helping you appear higher in "restaurants near me" searches.',
  },
  {
    icon: MapPin,
    title: "Show Up on Google Maps",
    description:
      "When customers search for food on Google Maps, your full menu is visible right there - prices, categories, and items. They can decide to visit before even calling you.",
  },
  {
    icon: RefreshCw,
    title: "Always Up-to-Date",
    description:
      "Changed a price? Added a new dish? Removed a seasonal item? One sync and your Google Business Profile menu reflects the latest version. No manual editing on Google.",
  },
  {
    icon: Clock,
    title: "Save Hours Every Week",
    description:
      "Manually updating your Google Business menu is tedious and error-prone. Our sync does it in seconds, not hours. Focus on cooking, not copy-pasting.",
  },
  {
    icon: TrendingUp,
    title: "Drive More Footfall",
    description:
      "Customers who see a detailed menu on Google are 30% more likely to visit. Give them the information they need to choose you over competitors.",
  },
  {
    icon: Shield,
    title: "Accurate & Reliable",
    description:
      "No more mismatched prices between your actual menu and what Google shows. Eliminate customer complaints about outdated information on Maps.",
  },
];

const FEATURES = [
  "One-click full menu sync to Google Business Profile",
  "Automatic category mapping and structuring",
  "Image upload support for menu items",
  "Price and availability sync",
  "Multi-location support for chains",
  "Sync history and status tracking",
  "Works with any Google Business account",
  "No technical knowledge required",
  "Supports veg/non-veg labeling",
  "Handles special characters and multilingual menus",
];

const FAQ = [
  {
    question: "What is Google Business Profile menu sync?",
    answer:
      "It's a feature that automatically copies your restaurant's menu from our platform to your Google Business Profile (the listing that appears on Google Search and Google Maps). Instead of manually adding each menu item on Google, you sync everything with one click.",
  },
  {
    question: "Do I need a Google Business Profile to use this?",
    answer:
      "Yes, you need a verified Google Business Profile for your restaurant. If you don't have one yet, you can create one for free at business.google.com. Once verified, you can connect it to our platform and start syncing.",
  },
  {
    question: "How often should I sync my menu?",
    answer:
      "We recommend syncing whenever you make changes to your menu - new items, price changes, or seasonal updates. The sync only takes a few seconds, so there's no reason not to keep it up-to-date. Some restaurants sync daily, others weekly.",
  },
  {
    question: "Will syncing overwrite my existing Google menu?",
    answer:
      "Yes, each sync replaces your Google Business Profile menu with the latest version from our platform. This ensures complete accuracy. Your other Google Business Profile information (photos, reviews, hours) is not affected.",
  },
  {
    question: "Does this work for multiple restaurant locations?",
    answer:
      "Yes! If you manage multiple locations under one Google Business account, you can select which location to sync to. Each location can have its own menu. Perfect for restaurant chains with different menus per branch.",
  },
  {
    question: "Is my Google account data safe?",
    answer:
      "Absolutely. We use Google's official OAuth 2.0 and Business Profile API. We only request the minimum permissions needed to manage your menu. Your credentials are never stored - we use secure token-based authentication.",
  },
  {
    question: "What happens to menu images during sync?",
    answer:
      "Menu item images from your profile are uploaded to Google along with the menu data. Large images are automatically optimized for Google's requirements. If an image fails to upload, the item still syncs - just without the photo.",
  },
  {
    question: "Is this feature included in all plans?",
    answer:
      "Google Business Profile menu sync is available on our Pro and Business plans. Check our pricing page for details on what's included in each plan.",
  },
];

const STATS = [
  { value: "500+", label: "Restaurants Syncing" },
  { value: "7x", label: "More Profile Clicks" },
  { value: "< 30s", label: "Sync Time" },
  { value: "30%", label: "More Footfall" },
];

export default async function GoogleBusinessPage() {
  const appName = "Menuthere";

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://menuthere.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Solutions",
        item: "https://menuthere.com/solutions",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Google Business Profile Menu Sync",
        item: "https://menuthere.com/solutions/google-business",
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#f4e5d5] relative">
      <JsonLd data={faqSchema} />
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
                Google Business Integration
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-gray-900 leading-[1.1] mb-2 tracking-tight">
                Sync Your Menu to{" "}
                <span className="bg-gradient-to-r from-[#e65a22] via-[#d14d1a] to-[#e65a22] bg-clip-text text-transparent">
                  Google Maps
                </span>{" "}
                Automatically
              </h1>
              <p className="text-base text-gray-600 leading-relaxed mb-8 max-w-xl">
                Keep your Google Business Profile menu always up-to-date.
                One-click sync from Menuthere - your menu on Google Search &
                Maps, accurate every time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#e65a22] rounded-xl hover:bg-[#d14d1a] hover:shadow-lg hover:shadow-[#e65a22]/25 transition-all duration-300"
                >
                  Sync your menu
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  href="/help-center"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-900 bg-white border-2 border-gray-200 rounded-xl hover:border-[#e65a22] hover:text-[#e65a22] transition-all duration-300"
                >
                  Book a Demo
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
                        Google Business Profile
                      </div>
                      <div className="text-blue-100 text-sm">
                        Menu Sync Manager
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
                          Menu Synced Successfully
                        </div>
                        <div className="text-xs text-green-600">
                          Last sync: Just now
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
                        Items Synced
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">12</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Categories
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        98%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        With Images
                      </div>
                    </div>
                  </div>

                  {/* Sample Menu Items */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Recently Synced
                    </div>
                    {[
                      {
                        name: "Butter Chicken",
                        price: "₹349",
                        cat: "Main Course",
                      },
                      {
                        name: "Paneer Tikka",
                        price: "₹279",
                        cat: "Starters",
                      },
                      {
                        name: "Gulab Jamun",
                        price: "₹129",
                        cat: "Desserts",
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
                    Profile Views
                  </div>
                  <div className="text-xs text-green-600 font-semibold">
                    +340% this month
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
              Simple 3-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From your menu dashboard to Google Maps in three simple steps
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
                    Step {item.step}
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
              Why Restaurants Love Google Menu Sync
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your menu is your most powerful marketing tool - make sure it
              shows up where customers are searching
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
              Without Sync vs. With Menuthere
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See the difference automatic menu sync makes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Before */}
            <div className="bg-white rounded-2xl border-2 border-red-100 p-8 relative">
              <div className="absolute -top-4 left-6">
                <span className="bg-red-100 text-red-700 text-sm font-bold px-4 py-1.5 rounded-full">
                  ✕ Without Sync
                </span>
              </div>
              <ul className="space-y-4 mt-4">
                {[
                  "Manually add each item on Google one-by-one",
                  "Menu on Google becomes outdated within days",
                  "Price mismatches cause customer complaints",
                  "Hours spent on data entry every month",
                  "No images - just plain text listings",
                  "Inconsistent info across platforms",
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
                  ✓ With Menuthere
                </span>
              </div>
              <ul className="space-y-4 mt-4">
                {[
                  "One-click sync pushes your entire menu",
                  "Google menu always matches your latest offerings",
                  "Accurate prices build customer trust",
                  "Seconds to sync, not hours of manual work",
                  "Full image support for visual appeal",
                  "Unified menu across website, QR & Google",
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
                Everything You Get with Google Menu Sync
              </h2>
              <p className="text-xl text-gray-600 mb-10">
                A complete toolkit for keeping your Google presence accurate and
                compelling.
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
                <h3 className="text-2xl font-bold mb-4">
                  Ready to sync your menu?
                </h3>
                <p className="text-lg text-orange-100 mb-8 leading-relaxed">
                  Join hundreds of restaurants already using Menuthere to keep
                  their Google presence up-to-date. Set up takes less than 5
                  minutes.
                </p>
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-white text-[#e65a22] rounded-xl hover:bg-gray-50 transition-colors shadow-lg"
                >
                  Start Free Trial
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
              <span className="text-white">Coming Soon</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              The Future of Your{" "}
              <span className="text-orange-100/90">Google Presence</span>
            </h2>
            <p className="text-orange-100 max-w-xl mx-auto">
              We&apos;re building powerful new features to help you manage your
              entire Google Business Profile - beyond just the menu.
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
                  Auto-Post to Google
                </h3>
              </div>
              <p className="text-orange-100 text-sm leading-relaxed mb-5">
                Automatically publish posts, offers, events, and updates
                directly to your Google Business Profile. Share today&apos;s
                special, a new dish launch, or a festival offer - without
                logging into Google.
              </p>
              <div className="space-y-2.5">
                {[
                  "Schedule posts with photos and CTAs",
                  "Promote daily specials & seasonal offers",
                  "Event announcements auto-published",
                  "Post analytics and engagement tracking",
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
                  AI Review Replies
                </h3>
              </div>
              <p className="text-orange-100 text-sm leading-relaxed mb-5">
                Let AI craft thoughtful, personalized replies to every Google
                review - positive or negative. Respond faster, maintain your
                reputation, and show customers you care, 24/7.
              </p>
              <div className="space-y-2.5">
                {[
                  "AI-generated professional & warm replies",
                  "Handles both positive & negative reviews",
                  "Matches your restaurant's tone & voice",
                  "One-click approve or edit before posting",
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
                &ldquo;We used to spend an entire afternoon every month updating
                our menu on Google. With Menuthere, I hit one button and
                everything syncs - items, prices, even images. Our Google Maps
                listing looks professional now and we&apos;ve seen a noticeable
                increase in walk-in customers who mention seeing our menu
                online.&rdquo;
              </blockquote>
              <div>
                <div className="font-bold text-lg">Arjun & Priya Nair</div>
                <div className="opacity-80">Owners, Spice Route Kitchen</div>
                <div className="opacity-60 text-sm">Kochi, Kerala</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <FAQAccordion
        items={FAQ}
        subtitle="Everything you need to know about Google Business Profile menu sync"
      />

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="py-24 bg-[#e65a22] relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            Google Business Profile Integration
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Your Menu Deserves to Be on Google
          </h2>
          <p className="text-xl text-orange-100 mb-10 max-w-2xl mx-auto">
            Join hundreds of restaurants using Menuthere to sync their menu to
            Google Maps. Set up in under 5 minutes, sync in under 30 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-[#e65a22] bg-white rounded-xl hover:bg-gray-50 transition-colors shadow-lg"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
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
