import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
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

// Module scope cannot read the request locale, so each entry carries the
// dictionary KEYS for its copy and the component resolves them at render.
const FEATURES = [
  {
    titleKey: "featureWebsiteAppTitle",
    descriptionKey: "featureWebsiteAppBody",
    href: "/product/delivery-website",
    ctaKey: "featureWebsiteAppCta",
    panel: "aggregator",
  },
  {
    titleKey: "featureWhatsappOrderingTitle",
    descriptionKey: "featureWhatsappOrderingBody",
    href: "/solutions/whatsapp-ordering",
    ctaKey: "featureWhatsappOrderingCta",
    panel: "whatsapp",
  },
  {
    titleKey: "featurePetpoojaTitle",
    descriptionKey: "featurePetpoojaBody",
    href: "/solutions/petpooja",
    ctaKey: "featurePetpoojaCta",
    panel: "petpooja",
  },
  {
    titleKey: "featurePaymentsTitle",
    descriptionKey: "featurePaymentsBody",
    href: "/get-started",
    ctaKey: "featurePaymentsCta",
    panel: "payment",
  },
  {
    titleKey: "featureOrderManagementTitle",
    descriptionKey: "featureOrderManagementBody",
    href: "/get-started",
    ctaKey: "featureOrderManagementCta",
    panel: "realtime",
  },
  {
    titleKey: "featureDigitalMenuTitle",
    descriptionKey: "featureDigitalMenuBody",
    href: "/product/digital-menu",
    ctaKey: "featureDigitalMenuCta",
    panel: "smartqr",
  },
  {
    titleKey: "featureOffersTitle",
    descriptionKey: "featureOffersBody",
    href: "/solutions/owners",
    ctaKey: "featureOffersCta",
    panel: "offers",
  },
  {
    titleKey: "featureGoogleSyncTitle",
    descriptionKey: "featureGoogleSyncBody",
    href: "/solutions/google-business",
    ctaKey: "featureGoogleSyncCta",
    panel: "googlesync",
  },
  {
    titleKey: "featureDeliveryAppTitle",
    descriptionKey: "featureDeliveryAppBody",
    href: "/download-app",
    ctaKey: "featureDeliveryAppCta",
    panel: "deliveryboy",
  },
  {
    titleKey: "featureAnalyticsTitle",
    descriptionKey: "featureAnalyticsBody",
    href: "/solutions/owners",
    ctaKey: "featureAnalyticsCta",
    panel: "analytics",
  },
] as const;

export default async function MonitorSection() {
  const { t } = await getT();

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
            {t.landing.platformHeadingLead}{" "}
            <span className="text-stone-500">{t.landing.platformHeadingAccent}</span>
          </h2>
        </div>

        {FEATURES.map((feature, index) => (
        <MonitorSectionCard
          key={feature.titleKey}
          title={t.landing[feature.titleKey]}
          description={t.landing[feature.descriptionKey]}
          href={feature.href}
          cta={t.landing[feature.ctaKey]}
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
