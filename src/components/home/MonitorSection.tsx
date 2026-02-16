import Link from "next/link";
import Image from "next/image";
import RealTimeMenuAnimation from "./RealTimeMenuAnimation";
import OffersAnimation from "./OffersAnimation";
import AnalyticsAnimation from "./AnalyticsAnimation";
import ReviewsAnimation from "./ReviewsAnimation";
import GoogleSyncAnimation from "./GoogleSyncAnimation";
import SmartQRAnimation from "./SmartQRAnimation";

const FEATURES = [
  {
    title: "Smart QR Menu",
    description:
      "Customers scan a QR code and instantly browse your full menu on their phone. No app downloads, no waiting. A beautiful, mobile-first menu with high-quality images, dietary filters, and smart search — designed to increase average order value by up to 25%.",
    href: "/solutions/restaurants",
    cta: "Learn more about Digital Menu",
    image: "/features/smartqr-v2.png",
  },
  {
    title: "Google Business Menu Sync",
    description:
      "Automatically sync your complete menu — categories, items, prices, and photos — to your Google Business Profile in one click. Show up on Google Maps with a full menu. Restaurants with complete profiles get 7x more clicks and drive 30% more footfall.",
    href: "/solutions/google-business",
    cta: "See how Google Sync works",
    image: "/features/syncmenu-v2.png",
  },
  {
    title: "Real-Time Menu Updates",
    description:
      "Change prices, add new items, toggle availability, or run time-based offers — all in real-time. Updates reflect instantly on your digital menu. No reprints, no designers, no delays. Save thousands annually on printing costs alone.",
    href: "/get-started",
    cta: "Explore menu management",
    image: "/features/realtimesync-v2.png",
  },
  {
    title: "Dynamic Offers & Promotions",
    description:
      "Run flash deals, happy-hour specials, or time-based discounts that activate and expire automatically. Highlight best-sellers with Must-Try badges and Chef's Choice tags. Drive repeat visits and boost revenue without printing a single flyer.",
    href: "/solutions/owners",
    cta: "See how offers work",
    image: "/features/offersandpromo-v2.png",
  },
  {
    title: "Analytics & Insights",
    description:
      "Track daily scan volumes, peak hour heatmaps, device usage, and best-selling items. Make data-driven decisions about your pricing, promotions, and menu placement. Know exactly what is working and what needs attention.",
    href: "/solutions/owners",
    cta: "Learn about analytics",
    image: "/features/analytics-v2.png",
  },
  {
    title: "Google Reviews Booster",
    description:
      "Automatically prompt customers to leave a Google review after scanning your menu. Build your 5-star rating effortlessly. Display real-time Google reviews on your digital menu to build instant trust with new customers.",
    href: "/solutions/restaurants",
    cta: "Boost your reviews",
    image: "/features/googelreview-v2.png",
  },
];

export default function MonitorSection() {
  return (
    <section className="border-r border-l border-stone-200 mx-auto sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] min-h-screen pt-20">
      <div className="flex flex-col gap-6 relative z-10 max-w-5xl px-8 md:px-16 mb-20">
        <h2 className="font-geist font-medium text-3xl md:text-4xl text-stone-900 leading-tight">
          Everything your menu needs,{" "}
          <span className="text-stone-500">in one platform.</span>
        </h2>
        {/* <p className="text-base text-stone-500 max-w-xl leading-relaxed">
          From QR code menus to Google Business sync, Menuthere gives you the
          tools to manage your menu, take orders, and grow your business — no
          technical skills required.
        </p> */}
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
            feature.title === "Real-Time Menu Updates"
              ? "realtime"
              : feature.title === "Dynamic Offers & Promotions"
                ? "offers"
                : feature.title === "Analytics & Insights"
                  ? "analytics"
                  : feature.title === "Google Reviews Booster"
                    ? "reviews"
                    : feature.title === "Google Business Menu Sync"
                      ? "googlesync"
                      : feature.title === "Smart QR Menu"
                        ? "smartqr"
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
          className="inline-flex items-center gap-2 text-sm font-medium text-[#B5581A] hover:text-[#9a4a15] transition-colors group"
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
  customPanel?: "realtime" | "offers" | "analytics" | "reviews" | "googlesync" | "smartqr";
}) {
  const panel =
    customPanel === "realtime" ? (
      <RealTimeMenuAnimation />
    ) : customPanel === "offers" ? (
      <OffersAnimation />
    ) : customPanel === "analytics" ? (
      <AnalyticsAnimation />
    ) : customPanel === "reviews" ? (
      <ReviewsAnimation />
    ) : customPanel === "googlesync" ? (
      <GoogleSyncAnimation />
    ) : customPanel === "smartqr" ? (
      <SmartQRAnimation />
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
