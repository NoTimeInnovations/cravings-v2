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

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      "Stop Paying 30% Commission to Third-Party Delivery Platforms | Direct Ordering with Menuthere",
    description:
      "Third-party delivery platforms charge restaurants 20-30%+ commission per order. Menuthere gives you your own ordering app with just 0% commission, full customer data ownership, and PetPooja POS integration. Take back control of your restaurant.",
    alternates: {
      canonical: "https://menuthere.com/solutions/petpooja",
    },
    openGraph: {
      title:
        "Stop Paying 30% Commission | Direct Ordering for Restaurants",
      description:
        "Why pay 20-30% to other delivery platforms? Get your own ordering website with just 0% commission. PetPooja POS integration, full customer data, and complete control.",
      type: "website",
      url: "https://menuthere.com/solutions/petpooja",
    },
  };
}

const COMMISSION_BREAKDOWN = [
  {
    label: "Base Commission",
    aggregator: "18-33%",
    menuthere: "0%",
  },
  {
    label: "GST",
    aggregator: "~3-5%",
    menuthere: "0%",
  },
  {
    label: "Payment Gateway",
    aggregator: "2-3%",
    menuthere: "2%",
  },
  {
    label: "Forced Discounts",
    aggregator: "5-15%",
    menuthere: "You decide",
  },
  {
    label: "Packaging Markup",
    aggregator: "Rs 2-5/order",
    menuthere: "0%",
  },
  {
    label: "Promoted Listings",
    aggregator: "5-10% extra",
    menuthere: "Free visibility",
  },
];

const AGGREGATOR_PROBLEMS = [
  {
    icon: Percent,
    title: "20-33% Commission Per Order",
    description:
      "Third-party delivery platforms recently hiked commissions up to 33%. On a Rs 500 order, you lose Rs 100-165 before any other deductions. Your food cost, rent, and staff salaries come from what's left.",
  },
  {
    icon: ShieldAlert,
    title: "Hidden Charges Stack Up to 45%",
    description:
      "GST on commission (18%), payment gateway fees (2-3%), packaging markup (Rs 2-5/order), and forced discount sharing. A Rs 500 order can cost you Rs 212-227 in total platform fees — that's 42-45% gone.",
  },
  {
    icon: Database,
    title: "They Own Your Customer Data",
    description:
      "You serve thousands of customers but have zero direct relationship with any of them. Platforms actively mask customer details — names, phone numbers, order history. You can't build loyalty or run targeted promotions.",
  },
  {
    icon: Megaphone,
    title: "Pay-to-Play Visibility",
    description:
      "Top 10 search results on other delivery platforms are almost always paid placements. Without spending on promoted listings, your restaurant gets buried. Effective commission rises to 25-40% with ad spend.",
  },
  {
    icon: Lock,
    title: "No Pricing Freedom",
    description:
      "Third-party delivery platforms impose pricing restrictions with penalties for non-compliance and warn of rank downgrades if you offer lower prices elsewhere. You can't even control your own pricing strategy.",
  },
  {
    icon: AlertTriangle,
    title: "Platforms Now Compete Against You",
    description:
      "Third-party delivery platforms are now launching their own food brands and quick-commerce apps. They're using YOUR customer data to build competing products. The NRAI calls this 'abuse of power'.",
  },
];

const OUR_SOLUTION = [
  {
    icon: IndianRupee,
    title: "Just 0% Commission on Orders",
    description:
      "With just 0% commission, nearly every rupee your customer pays goes to you. No hidden fees, no revenue sharing. Your margins stay intact — the way it should be.",
  },
  {
    icon: Users,
    title: "Own 100% of Customer Data",
    description:
      "Every order gives you the customer's name, phone number, order history, and preferences. Build loyalty programs, send targeted offers, and create genuine relationships with your customers.",
  },
  {
    icon: Store,
    title: "Your Own Branded Ordering Website",
    description:
      "Get a professional ordering website with your restaurant's branding, colors, and domain. Customers order directly from you — your brand grows, not an aggregator's.",
  },
  {
    icon: BarChart3,
    title: "Complete Analytics & Insights",
    description:
      "Track every order, peak hours, popular items, customer behavior, and revenue trends. Make data-driven decisions about your menu, pricing, and promotions.",
  },
  {
    icon: Heart,
    title: "Build Real Customer Loyalty",
    description:
      "Run your own offers, discounts, and loyalty rewards without sharing margins. Send WhatsApp notifications, festival greetings, and personalized deals directly to your customers.",
  },
  {
    icon: TrendingUp,
    title: "PetPooja POS Integration",
    description:
      "Seamlessly sync orders from your Menuthere website directly to your PetPooja POS. No manual entry, no missed orders. Your kitchen gets orders instantly, just like any other channel.",
  },
];

const REAL_NUMBERS = [
  {
    metric: "Commission per order",
    aggregator: "18-33% + fees (effective 35-45%)",
    direct: "Just 0%",
  },
  {
    metric: "Customer data ownership",
    aggregator: "Platform owns everything",
    direct: "You own 100%",
  },
  {
    metric: "Pricing control",
    aggregator: "Restricted with penalties",
    direct: "Complete freedom",
  },
  {
    metric: "Brand building",
    aggregator: "Loyalty goes to the platform",
    direct: "Loyalty goes to YOUR restaurant",
  },
  {
    metric: "Profit margin on delivery",
    aggregator: "Often below 10%",
    direct: "25-35%+ achievable",
  },
  {
    metric: "Marketing control",
    aggregator: "Pay-to-play, Rs 250-4000+",
    direct: "Full control, own campaigns",
  },
  {
    metric: "Menu & discount control",
    aggregator: "Platform can impose without consent",
    direct: "100% your decision",
  },
];

const FAQ_DATA = [
  {
    question: "How does Menuthere help me stop paying other delivery platform commissions?",
    answer:
      "Menuthere gives you your own branded ordering website where customers can place orders directly. With just 0% commission, you keep nearly all of your order revenue. We charge a simple subscription fee — not a 20-30% cut of every order.",
  },
  {
    question: "Does Menuthere provide delivery boys?",
    answer:
      "No, Menuthere does not provide delivery riders. We focus on giving you the best ordering platform, customer management, and POS integration. For delivery, you can use your own staff, partner with third-party delivery services like Porter, Dunzo, or Shadowfax, or offer pickup-only. Many restaurants find that even pickup orders through direct channels are more profitable than delivered orders through aggregators.",
  },
  {
    question: "How does the PetPooja integration work?",
    answer:
      "Orders placed on your Menuthere website are automatically pushed to your PetPooja POS terminal in real-time. Your kitchen sees the order immediately — no manual entry, no copy-pasting, no missed orders. It works just like receiving an order from any other channel on your POS.",
  },
  {
    question: "What about payment collection from customers?",
    answer:
      "Menuthere includes integrated payment gateway support with just 0% fee (customer service only). Customers can pay online via UPI, cards, and wallets directly on your ordering website. You can also accept cash on delivery or use your existing payment setup.",
  },
  {
    question: "Should I completely leave other delivery platforms?",
    answer:
      "Not necessarily. Many restaurants use other delivery platforms for discovery (new customers finding them) while directing repeat customers to their own ordering website for higher-margin orders. The goal is to reduce dependency — not necessarily eliminate it — and ensure more of your revenue stays with you.",
  },
  {
    question: "How much does Menuthere cost?",
    answer:
      "Menuthere charges a simple monthly subscription — not a percentage of your orders. Even on our paid plans, you'll save far more than you spend by avoiding aggregator commissions. Check our pricing page for current plans.",
  },
  {
    question: "Is 35% of restaurants really wanting to quit aggregators?",
    answer:
      "Yes. A December 2025 industry survey found that 35% of Indian restaurants want to stop using other delivery platforms, citing high commissions, poor customer service, insufficient profits, and lack of customer data access as key reasons.",
  },
  {
    question: "Can I still use other delivery platforms alongside Menuthere?",
    answer:
      "Absolutely. Most of our restaurant partners use both. They keep other delivery platforms for new customer acquisition while actively pushing repeat customers to their Menuthere ordering website where margins are significantly higher. Over time, the share of direct orders grows as customers prefer ordering directly.",
  },
];

const STATS = [
  { value: "0%", label: "Commission Per Order" },
  { value: "35%", label: "Restaurants Want to Quit Aggregators" },
  { value: "45%", label: "Effective Aggregator Fee" },
  { value: "100%", label: "Customer Data You Own" },
];

export default async function PetPoojaPage() {
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
        name: "Direct Ordering & PetPooja Integration",
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
            Stop Paying 30% Commission to{" "}
            <span className="text-stone-500">Third-Party Delivery Platforms</span>
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-lg mx-auto mt-5 leading-relaxed">
            Your own ordering website with full customer ownership, and
            PetPooja POS integration
          </p>
          <div className="flex items-center gap-3 mt-8 justify-center">
            <ButtonV2 href="https://wa.me/918590115462?text=Hi%2C%20I%27m%20interested%20in%20PetPooja%20%2B%20Menuthere" variant="primary" className="text-nowrap">
              Start Selling Direct
            </ButtonV2>
            <ButtonV2 href="https://cal.id/menuthere" variant="secondary" className="text-nowrap">
              Book a Demo
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
            Aggregators charge 20-33% commission + hidden fees on every order.
            On a Rs 500 order, you lose up to Rs 225. That&apos;s not a
            partnership — it&apos;s a tax on your hard work. CCI investigations
            found major delivery platforms guilty of violating competition laws.
          </p>
          <p className="text-stone-600 leading-relaxed text-base">
            Menuthere gives you your own branded ordering website with just 1%
            commission and full customer data ownership. Paired with PetPooja POS
            integration, orders flow directly to your kitchen — no middleman, no
            revenue sharing, no loss of control.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ THE PROBLEM ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            How other delivery platforms are{" "}
            <span className="text-stone-500">hurting your restaurant.</span>
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            CCI investigations found both platforms guilty of violating
            competition laws. Here&apos;s what they&apos;re doing to your
            business.
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
            The real cost of{" "}
            <span className="text-stone-500">a Rs 500 order.</span>
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            See exactly where your money goes on aggregator platforms vs. direct
            ordering.
          </p>

          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-stone-900 text-white">
              <div className="p-4 md:p-5 text-sm font-medium">Charge Type</div>
              <div className="p-4 md:p-5 text-sm font-medium text-center border-l border-stone-700">
                Delivery Platforms
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
                Effective Total Loss
              </div>
              <div className="p-4 md:p-5 text-sm text-center border-l border-stone-700 font-semibold text-red-400">
                Rs 212-227 (42-45%)
              </div>
              <div className="p-4 md:p-5 text-sm text-center border-l border-stone-700 font-semibold text-green-400">
                ~3%
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-400 mt-4">
            * Based on industry data from NRAI, Menuviel, and Billboox reports
            (2025-2026)
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* ═══════════════ OUR SOLUTION ═══════════════ */}
      <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-16">
          <h2 className="geist-font font-semibold text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
            Take back control{" "}
            <span className="text-stone-500">of your restaurant.</span>
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            Your own ordering website. Just 1% commission. Full customer data.
            PetPooja POS integration.
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
            Aggregator dependency vs.{" "}
            <span className="text-stone-500">direct ordering.</span>
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            The real comparison that platforms don&apos;t want you to see.
          </p>

          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-stone-900 text-white text-sm">
              <div className="p-4 font-medium"></div>
              <div className="p-4 font-medium text-center border-l border-stone-700">
                Aggregators
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
            Good to know —{" "}
            <span className="text-stone-500">full transparency.</span>
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            We believe in being upfront. Here&apos;s what we offer and what we
            don&apos;t.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery Note */}
            <div className="bg-amber-50/50 rounded-xl p-6 border border-amber-200/60">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
                <Truck className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-2">
                We Don&apos;t Provide Delivery Riders
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">
                Menuthere focuses on giving you the best ordering platform,
                customer management, and POS integration. For delivery, you have
                flexible options:
              </p>
              <ul className="space-y-2.5">
                {[
                  "Use your own delivery staff for full control",
                  "Partner with third-party services like Porter, Dunzo, or Shadowfax",
                  "Offer pickup-only — many customers prefer it",
                  "Dine-in QR ordering needs no delivery at all",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="text-stone-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 mt-4 font-medium">
                Even pickup-only orders through direct channels are more
                profitable than delivered orders through aggregators at 30%
                commission.
              </p>
            </div>

            {/* Payment Integration Note */}
            <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-200/60">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <CreditCard className="w-5 h-5 text-blue-700" />
              </div>
              <div className="flex items-center gap-2.5 mb-2">
                <h3 className="text-base font-semibold text-stone-900">
                  Payment Integration
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[11px] font-semibold border border-green-200">
                  <Sparkles className="w-3 h-3" />
                  1% Only
                </span>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">
                Integrated payment gateway at just 1% (customer service only).
                Your customers can pay online directly on your ordering website:
              </p>
              <ul className="space-y-2.5">
                {[
                  "UPI payments (Google Pay, PhonePe, Paytm)",
                  "Credit & debit card support",
                  "Digital wallets integration",
                  "Auto-reconciliation with PetPooja POS",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-stone-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-blue-700 mt-4 font-medium">
                You can also accept cash on delivery or use your existing
                payment setup.
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
            The numbers{" "}
            <span className="text-stone-500">don&apos;t lie.</span>
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            Real data from industry surveys, CCI investigations, and NRAI
            reports.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                stat: "35%",
                text: "of Indian restaurants want to quit other delivery platforms (Dec 2025 survey)",
              },
              {
                stat: "60%",
                text: "of new restaurants shut down within the first year — platform dependency is a major factor",
              },
              {
                stat: "Rs 400 Cr",
                text: "extra annually extracted by platforms through packaging fee markups across the ecosystem",
              },
              {
                stat: "2,000+",
                text: "restaurants participated in the #Logout boycott against aggregator platforms",
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
            Go direct in{" "}
            <span className="text-stone-500">3 simple steps.</span>
          </h2>
          <p className="text-base text-stone-500 max-w-xl leading-relaxed mb-12">
            Set up your own ordering channel in under 10 minutes.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-16 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              icon: Store,
              title: "Create Your Menu & Website",
              description:
                "Upload your menu, customize branding, and get your own ordering website live. Takes under 10 minutes.",
            },
            {
              step: "02",
              icon: TrendingUp,
              title: "Connect PetPooja POS",
              description:
                "Link your PetPooja POS for automatic order sync. Orders flow directly to your kitchen — zero manual work.",
            },
            {
              step: "03",
              icon: Users,
              title: "Share & Start Selling",
              description:
                "Share your ordering link via WhatsApp, social media, and QR codes. Watch direct orders flow in.",
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
                Step {item.step}
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
              Every Order on Other Delivery Platforms Costs You Rs 100-225
            </h2>
            <p className="text-white/70 mb-6 max-w-xl leading-relaxed">
              If you get 50 delivery orders a day, that&apos;s Rs 5,000-11,250
              lost daily. Rs 1.5-3.3 lakhs every month. Your own ordering
              website pays for itself from day one.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonV2 href="https://wa.me/918590115462?text=Hi%2C%20I%27m%20interested%20in%20PetPooja%20%2B%20Menuthere" variant="primary" className="bg-stone-900 text-white border-stone-700 hover:bg-stone-800 hover:text-white text-nowrap">
                Start Selling Direct
              </ButtonV2>
              <ButtonV2 href="/pricing#plan-petpooja" variant="secondary" className="border-white/40 text-white hover:bg-white/10 hover:text-white hover:border-white/60 text-nowrap">
                See Pricing
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
            Frequently asked{" "}
            <span className="text-stone-500 italic">questions.</span>
          </h2>
          <p className="text-base text-stone-500 mb-12">
            Everything you need to know about direct ordering with Menuthere.
          </p>
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
