import React, { Suspense } from "react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "@/components/home/Hero";
import { JsonLd } from "@/components/seo/JsonLd";

const DashboardAnimation = dynamic(
  () => import("@/components/home/DashboardAnimation")
);
const SocialProof = dynamic(
  () => import("@/components/home/SocialProof")
);
const RestaurantMarquee = dynamic(
  () => import("@/components/international/RestaurantMarquee")
);
const MonitorSection = dynamic(
  () => import("@/components/home/MonitorSection")
);
const CaseStudies = dynamic(
  () => import("@/components/home/CaseStudies")
);
const StartFreeTrailSection = dynamic(
  () => import("@/components/home/StartFreeTrailSection")
);
const FAQ = dynamic(() => import("@/components/home/FAQ"));
const Footer = dynamic(() => import("@/components/Footer"));
const WhatsAppButton = dynamic(() => import("@/components/WhatsAppButton"));

export const metadata: Metadata = {
  title:
    "Menuthere | Online Ordering & Delivery Platform for Restaurants",
  description:
    "Launch your restaurant's own delivery website with Petpooja POS integration, real-time orders & analytics. Trusted by 600+ restaurants across India.",
  openGraph: {
    title:
      "Menuthere | Online Ordering & Delivery Platform for Restaurants",
    description:
      "Launch your restaurant's own delivery website with Petpooja POS integration, real-time orders & analytics. Trusted by 600+ restaurants across India.",
    images: ["/og_image.png"],
    type: "website",
    url: "https://menuthere.com",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Menuthere | Online Ordering & Delivery Platform for Restaurants",
    description:
      "Launch your restaurant's own delivery website with Petpooja POS integration, real-time orders & analytics. Trusted by 600+ restaurants across India.",
    images: ["/og_image.png"],
  },
  alternates: {
    canonical: "https://menuthere.com",
  },
};

export default function Home() {
  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Menuthere",
    applicationCategory: "BusinessApplication",
    operatingSystem: ["Web", "iOS", "Android"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan to launch your own restaurant delivery website with online ordering",
    },
    description:
      "Menuthere is the all-in-one online ordering and delivery platform for restaurants. Launch your own delivery website with Petpooja POS integration, real-time order management, and powerful analytics.",
    url: "https://menuthere.com",
    screenshot: "https://menuthere.com/og_image.png",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: 600,
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "Own Delivery Website",
      "Petpooja POS Integration",
      "Online Ordering System",
      "Real-Time Order Management",
      "Digital Menu Creator",
      "Google Business Profile Sync",
      "Dynamic Offers & Promotions",
      "Analytics & Insights",
    ],
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Menuthere",
    url: "https://menuthere.com",
    logo: {
      "@type": "ImageObject",
      url: "https://menuthere.com/menuthere-logo-new.png",
      width: 512,
      height: 512,
    },
    description:
      "The all-in-one online ordering and delivery platform for restaurants. Launch your own website, take orders directly, and grow your business.",
    sameAs: [
      "https://www.instagram.com/menu.there/",
      "https://www.linkedin.com/company/Menuthere",
      "https://www.facebook.com/Menuthere",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "help@mail.menuthere.com",
      contactType: "customer support",
      availableLanguage: [
        { "@type": "Language", "name": "English" },
        { "@type": "Language", "name": "Hindi" },
        { "@type": "Language", "name": "Malayalam" },
      ],
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Menuthere",
    url: "https://menuthere.com",
    description: "Online ordering and delivery platform for restaurants. Launch your own website, skip aggregator commissions.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://menuthere.com/help-center?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="min-h-screen w-full bg-white geist-font relative">
      <JsonLd data={softwareAppSchema} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />

      {/* HERO — headline, CTA, menu upload */}
      <Hero />

      {/* DASHBOARD ILLUSTRATION — animated product demo */}
      <Suspense fallback={<div className="bg-[#fcfbf7] w-full h-[300px] md:h-[420px]" />}>
        <section className="bg-[#fcfbf7]">
          <DashboardAnimation />
        </section>
      </Suspense>

      {/* STATS — animated revenue/order counters */}
      <Suspense>
        <SocialProof />
      </Suspense>

      {/* SOCIAL PROOF — restaurant logo marquee */}
      <Suspense>
        <RestaurantMarquee />
      </Suspense>

      {/* DIVIDER */}
      <div className="w-full h-px bg-stone-200" />

      {/* FEATURES — tabbed feature showcase */}
      <Suspense>
        <MonitorSection />
      </Suspense>

      {/* CASE STUDIES — real restaurant results */}
      <Suspense>
        <CaseStudies />
      </Suspense>

      {/* CTA — start for free with stats */}
      <Suspense>
        <StartFreeTrailSection />
      </Suspense>

      {/* FAQ — SEO-rich questions with structured data */}
      <Suspense>
        <FAQ />
      </Suspense>

      {/* FOOTER */}
      <Suspense>
        <Footer appName="Menuthere" />
      </Suspense>

      {/* CHAT */}
      <Suspense>
        <WhatsAppButton />
      </Suspense>
    </div>
  );
}
