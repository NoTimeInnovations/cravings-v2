import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

const RealTimeMenuAnimation = dynamic(() => import("./RealTimeMenuAnimation"));
const OffersAnimation = dynamic(() => import("./OffersAnimation"));
const AnalyticsAnimation = dynamic(() => import("./AnalyticsAnimation"));
const GoogleSyncAnimation = dynamic(() => import("./GoogleSyncAnimation"));
const SmartQRAnimation = dynamic(() => import("./SmartQRAnimation"));
const AggregatorAnimation = dynamic(() => import("./AggregatorAnimation"));
const PetpoojaAnimation = dynamic(() => import("./PetpoojaAnimation"));
const DeliveryBoyAnimation = dynamic(() => import("./DeliveryBoyAnimation"));
const BrandedAppAnimation = dynamic(() => import("./BrandedAppAnimation"));

const FEATURES = [
  {
    title: "Your Own Delivery Website",
    description:
      "Launch a branded online ordering website for your restaurant in minutes. Customers order directly from you. No aggregator middlemen, no 30% commissions. You own the customer relationship, control your pricing, and keep every rupee of profit.",
    href: "/product/delivery-website",
    cta: "See how it works",
    image: "/features/smartqr-v2.webp",
  },
  {
    title: "Save 30% vs Aggregators",
    description:
      "Aggregators charge 20-33% commission + hidden fees, totaling up to 45% of every order. With Menuthere, get your own ordering website with just 1% commission and Petpooja POS integration. Own your customer data, control your pricing, and build brand loyalty.",
    href: "/solutions/petpooja",
    cta: "See full comparison & savings calculator",
    image: "/features/smartqr-v2.webp",
  },
  {
    title: "Petpooja POS Integration",
    description:
      "Every online order flows directly into your Petpooja POS in real-time. No manual entry, no missed orders, no double handling. Menu items, prices, and categories sync automatically between your POS and delivery website. The only platform in India with deep Petpooja integration built-in.",
    href: "/solutions/petpooja",
    cta: "Learn about Petpooja integration",
    image: "/features/smartqr-v2.webp",
  },
  {
    title: "Real-Time Order Management",
    description:
      "Accept, track, and manage delivery orders from a single dashboard. Get instant notifications for new orders, update order status in real-time, and keep your kitchen and delivery team in sync. No more juggling multiple tablets or missing orders during rush hours.",
    href: "/get-started",
    cta: "Explore order management",
    image: "/features/realtimesync-v2.webp",
  },
  {
    title: "Digital Menu Creator",
    description:
      "Create a beautiful, mobile-first digital menu with high-quality images, dietary filters, and smart search. Customers scan a QR code and instantly browse your full menu. No app downloads needed. Designed to increase average order value by up to 25%.",
    href: "/product/digital-menu",
    cta: "Learn more about Digital Menu",
    image: "/features/smartqr-v2.webp",
  },
  {
    title: "Dynamic Offers & Promotions",
    description:
      "Run flash deals, happy-hour specials, or time-based discounts that activate and expire automatically. Highlight best-sellers with Must-Try badges and Chef's Choice tags. Drive repeat orders and boost revenue without printing a single flyer.",
    href: "/solutions/owners",
    cta: "See how offers work",
    image: "/features/offersandpromo-v2.webp",
  },
  {
    title: "Google Business Menu Sync",
    description:
      "Automatically sync your complete menu (categories, items, prices, and photos) to your Google Business Profile in one click. Show up on Google Maps with a full menu. Restaurants with complete profiles get 7x more clicks and drive 30% more footfall.",
    href: "/solutions/google-business",
    cta: "See how Google Sync works",
    image: "/features/syncmenu-v2.webp",
  },
  {
    title: "Delivery Boy App",
    description:
      "A dedicated app for your delivery team. Delivery boys receive order notifications, navigate to customer locations, and update delivery status, all in real-time. Track live locations, assign orders automatically, and ensure faster deliveries with complete visibility.",
    href: "/download-app",
    cta: "Learn about the delivery app",
    image: "/features/analytics-v2.webp",
  },
  {
    title: "Your Own Branded Restaurant App",
    description:
      "Get your own restaurant app published on the App Store and Play Store under your brand name. Customers can browse your menu, place orders, track deliveries, and reorder with one tap. Build loyalty and drive repeat business with push notifications and in-app offers.",
    href: "/get-started",
    cta: "Get your own app",
    image: "/features/analytics-v2.webp",
  },
  {
    title: "Analytics & Insights",
    description:
      "Track order volumes, revenue trends, peak hours, and best-selling items. Make data-driven decisions about your pricing, promotions, and delivery operations. Know exactly what is working and where to optimize.",
    href: "/solutions/owners",
    cta: "Learn about analytics",
    image: "/features/analytics-v2.webp",
  },
];

export default function MonitorSection() {
  return (
    <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] min-h-screen pt-20">
      <div className="flex flex-col gap-6 relative z-10 max-w-5xl px-8 md:px-16 mb-20">
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
          image={feature.image}
          align={index % 2 === 0 ? "left" : "right"}
          customPanel={
            feature.title === "Your Own Delivery Website"
              ? "aggregator"
              : feature.title === "Save 30% vs Aggregators"
                ? "aggregator"
                : feature.title === "Petpooja POS Integration"
                  ? "petpooja"
                  : feature.title === "Real-Time Order Management"
                    ? "realtime"
                    : feature.title === "Digital Menu Creator"
                      ? "smartqr"
                      : feature.title === "Dynamic Offers & Promotions"
                        ? "offers"
                        : feature.title === "Google Business Menu Sync"
                          ? "googlesync"
                          : feature.title === "Delivery Boy App"
                            ? "deliveryboy"
                            : feature.title === "Your Own Branded Restaurant App"
                              ? "brandedapp"
                              : feature.title === "Analytics & Insights"
                                ? "analytics"
                                : undefined
          }
        />
      ))}
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

function ImagePanel({ image, title }: { image: string; title: string }) {
  return (
    <div className="relative w-full h-full">
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20"></div>
      <div className="w-full h-full relative overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-contain transition-transform duration-500 ease-out hover:scale-110"
        />
      </div>
    </div>
  );
}

function MonitorSectionCard({
  title,
  description,
  href,
  cta,
  image,
  align,
  customPanel,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  image: string;
  align: "left" | "right";
  customPanel?: "realtime" | "offers" | "analytics" | "googlesync" | "smartqr" | "aggregator" | "petpooja" | "deliveryboy" | "brandedapp";
}) {
  const panel =
    customPanel === "aggregator" ? (
      <AggregatorAnimation />
    ) : customPanel === "petpooja" ? (
      <PetpoojaAnimation />
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
    ) : customPanel === "deliveryboy" ? (
      <DeliveryBoyAnimation />
    ) : customPanel === "brandedapp" ? (
      <BrandedAppAnimation />
    ) : (
      <ImagePanel image={image} title={title} />
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
