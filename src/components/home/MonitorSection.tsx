import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { SECTION_GUTTER, SECTION_SPACING } from "./section";

const RealTimeMenuAnimation = dynamic(() => import("./RealTimeMenuAnimation"));
const OffersAnimation = dynamic(() => import("./OffersAnimation"));
const AnalyticsAnimation = dynamic(() => import("./AnalyticsAnimation"));
const GoogleSyncAnimation = dynamic(() => import("./GoogleSyncAnimation"));
const SmartQRAnimation = dynamic(() => import("./SmartQRAnimation"));
const AggregatorAnimation = dynamic(() => import("./AggregatorAnimation"));
const PetpoojaAnimation = dynamic(() => import("./PetpoojaAnimation"));
const DeliveryBoyAnimation = dynamic(() => import("./DeliveryBoyAnimation"));
const PaymentIntegrationAnimation = dynamic(
  () => import("./PaymentIntegrationAnimation"),
);
const WhatsAppOrderingAnimation = dynamic(
  () => import("./WhatsAppOrderingAnimation"),
);

const FEATURES = [
  {
    title: "Your Own Website & Branded App",
    description:
      "Launch a branded ordering website and your own app on the App Store and Play Store, all under your name. Customers order directly from you. No aggregator middlemen, no 20-33% commissions. They browse, order, track deliveries, and reorder in one tap, while you own the customer relationship, control your pricing, and keep every rupee of profit.",
    href: "/product/delivery-website",
    cta: "See how it works",
    panel: "aggregator",
  },
  {
    title: "Order on WhatsApp — just send “Hi”",
    description:
      "Turn your WhatsApp number into your easiest ordering channel. Customers send a simple “Hi” and instantly get an auto-login link to your menu — no app to download, no signup, no OTP. They order in a few taps and get live status updates back on WhatsApp, while you keep the customer and pay zero commission.",
    href: "/solutions/whatsapp-ordering",
    cta: "See WhatsApp ordering",
    panel: "whatsapp",
  },
  {
    title: "Petpooja POS Integration",
    description:
      "Every online order flows directly into your Petpooja POS in real-time. No manual entry, no missed orders, no double handling. Menu items, prices, and categories sync automatically between your POS and delivery website. The only platform in India with deep Petpooja integration built-in.",
    href: "/solutions/petpooja",
    cta: "Learn about Petpooja integration",
    panel: "petpooja",
  },
  {
    title: "Payment Integration",
    description:
      "Accept payments instantly with built-in UPI, cards, net banking, and wallets, plus cash on delivery. Secure, PCI-compliant checkout powered by Cashfree, with money settling directly to your bank account. No aggregator holding your funds and no payout delays. Every rupee reaches you.",
    href: "/get-started",
    cta: "See payment options",
    panel: "payment",
  },
  {
    title: "Real-Time Order Management",
    description:
      "Accept, track, and manage delivery orders from a single dashboard. Get instant notifications for new orders, update order status in real-time, and keep your kitchen and delivery team in sync. No more juggling multiple tablets or missing orders during rush hours.",
    href: "/get-started",
    cta: "Explore order management",
    panel: "realtime",
  },
  {
    title: "Digital Menu Management",
    description:
      "Manage your entire menu from one dashboard: add or edit items, prices, categories, photos, and variants in real time. Toggle dishes in or out of stock instantly, set dietary filters and smart search, and keep everything in sync across your website, app, and QR codes. No reprinting, no developers. Changes go live the moment you save.",
    href: "/product/digital-menu",
    cta: "Learn more about Digital Menu",
    panel: "smartqr",
  },
  {
    title: "Dynamic Offers & Promotions",
    description:
      "Run flash deals, happy-hour specials, or time-based discounts that activate and expire automatically. Highlight best-sellers with Must-Try badges and Chef's Choice tags. Drive repeat orders and boost revenue without printing a single flyer.",
    href: "/solutions/owners",
    cta: "See how offers work",
    panel: "offers",
  },
  {
    title: "Google Business Menu Sync",
    description:
      "Automatically sync your complete menu (categories, items, prices, and photos) to your Google Business Profile in one click. Show up on Google Maps with a full menu. Restaurants with complete profiles get 7x more clicks and drive 30% more footfall.",
    href: "/solutions/google-business",
    cta: "See how Google Sync works",
    panel: "googlesync",
  },
  {
    title: "Delivery Boy App",
    description:
      "A dedicated app for your delivery team. Delivery boys receive order notifications, navigate to customer locations, and update delivery status, all in real-time. Track live locations, assign orders automatically, and ensure faster deliveries with complete visibility.",
    href: "/download-app",
    cta: "Learn about the delivery app",
    panel: "deliveryboy",
  },
  {
    title: "Analytics & Insights",
    description:
      "Track order volumes, revenue trends, peak hours, and best-selling items. Make data-driven decisions about your pricing, promotions, and delivery operations. Know exactly what is working and where to optimize.",
    href: "/solutions/owners",
    cta: "Learn about analytics",
    panel: "analytics",
  },
] as const;

export default function MonitorSection() {
  return (
    <section className="relative">
      {/* Same content column as the hero: max-w-7xl + the shared gutter, so
          the heading and feature cards line up with the rest of the page. */}
      <div
        className={cn(
          "mx-auto w-full max-w-7xl",
          SECTION_GUTTER,
          SECTION_SPACING,
        )}
      >
        <div className="flex flex-col gap-6 relative z-10 mb-16">
          <h2 className="font-geist font-medium text-3xl md:text-4xl text-stone-900 leading-tight">
            Everything your restaurant needs,{" "}
            <span className="text-stone-500">in one platform.</span>
          </h2>
        </div>

        {FEATURES.map((feature, index) => (
        <MonitorSectionCard
          key={feature.title}
          title={feature.title}
          description={feature.description}
          href={feature.href}
          cta={feature.cta}
          align={index % 2 === 0 ? "left" : "right"}
          customPanel={feature.panel}
        />
        ))}
      </div>
    </section>
  );
}

function CardContent({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="px-4 md:px-8 py-6 md:py-8 flex flex-col h-full">
      <div className="flex-1">
        <h3 className="font-geist font-semibold text-2xl text-stone-900 mb-4">
          {title}
        </h3>
        <p className="text-base text-stone-600 leading-relaxed">
          {description}
        </p>
      </div>
      <div className="mt-8">
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors group"
        >
          <span>{cta}</span>
          <svg
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            ></path>
          </svg>
        </Link>
      </div>
    </div>
  );
}

function MonitorSectionCard({
  title,
  description,
  href,
  cta,
  align,
  customPanel,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  align: "left" | "right";
  customPanel: "realtime" | "offers" | "analytics" | "googlesync" | "smartqr" | "aggregator" | "petpooja" | "deliveryboy" | "payment" | "whatsapp";
}) {
  const panel =
    customPanel === "aggregator" ? (
      <AggregatorAnimation />
    ) : customPanel === "whatsapp" ? (
      <WhatsAppOrderingAnimation />
    ) : customPanel === "petpooja" ? (
      <PetpoojaAnimation />
    ) : customPanel === "payment" ? (
      <PaymentIntegrationAnimation />
    ) : customPanel === "realtime" ? (
      <RealTimeMenuAnimation />
    ) : customPanel === "offers" ? (
      <OffersAnimation />
    ) : customPanel === "analytics" ? (
      <AnalyticsAnimation />
    ) : customPanel === "googlesync" ? (
      <GoogleSyncAnimation />
    ) : customPanel === "smartqr" ? (
      <SmartQRAnimation />
    ) : (
      <DeliveryBoyAnimation />
    );

  return (
    <div className="relative z-10">
      {/* line  */}
      <div className="w-full h-px bg-stone-200"></div>

      {/* Mobile: stacked rows */}
      <div className="md:hidden flex flex-col">
        <div className={`w-full relative ${customPanel ? "h-64" : "h-48"}`}>{panel}</div>
        <div className="w-full h-px bg-stone-200"></div>
        <CardContent
          title={title}
          description={description}
          href={href}
          cta={cta}
        />
      </div>

      {/* Desktop: side-by-side columns */}
      <div
        className="hidden md:grid h-[50vh] relative"
        style={{
          gridTemplateColumns: "50% 1px 50%",
        }}
      >
        {align === "right" ? (
          <CardContent
            title={title}
            description={description}
            href={href}
            cta={cta}
          />
        ) : (
          panel
        )}
        <div className="w-px h-full bg-stone-200" />
        {align === "left" ? (
          <CardContent
            title={title}
            description={description}
            href={href}
            cta={cta}
          />
        ) : (
          panel
        )}
      </div>
    </div>
  );
}
