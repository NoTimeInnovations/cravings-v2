import React, { Suspense } from "react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "@/components/home/Hero";
import { JsonLd } from "@/components/seo/JsonLd";

const DashboardAnimation = dynamic(
  () => import("@/components/home/DashboardAnimation")
);
const RestaurantMarquee = dynamic(
  () => import("@/components/international/RestaurantMarquee")
);
const MonitorSection = dynamic(
  () => import("@/components/home/MonitorSection")
);
const StartFreeTrailSection = dynamic(
  () => import("@/components/home/StartFreeTrailSection")
);
const FAQ = dynamic(() => import("@/components/home/FAQ"));
const Footer = dynamic(() => import("@/components/Footer"));
const Chatwoot = dynamic(() => import("@/components/Chatwoot"));

export const metadata: Metadata = {
  title:
    "Menuthere | Free QR Code Digital Menu for Restaurants, Cafes & Hotels",
  description:
    "Create your restaurant's free QR code digital menu in minutes. Instant updates, Google Business sync, dynamic offers & analytics. Trusted by 600+ restaurants, cafes & hotels. Start free today.",
  keywords: [
    "digital menu",
    "QR code menu",
    "restaurant menu app",
    "contactless menu",
    "QR menu creator",
    "restaurant digital menu",
    "online menu for restaurant",
    "Google Business menu sync",
    "restaurant technology",
    "digital menu for cafes",
    "digital menu for hotels",
    "QR menu for restaurant",
    "restaurant management software",
  ],
  openGraph: {
    title:
      "Menuthere | Free QR Code Digital Menu for Restaurants, Cafes & Hotels",
    description:
      "Create your restaurant's free QR code digital menu in minutes. Instant updates, Google Business sync, dynamic offers & analytics. Trusted by 600+ restaurants.",
    images: ["/og_image.png"],
    type: "website",
    url: "https://menuthere.com",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Menuthere | Free QR Code Digital Menu for Restaurants, Cafes & Hotels",
    description:
      "Create your restaurant's free QR code digital menu in minutes. Instant updates, Google Business sync, dynamic offers & analytics. Trusted by 600+ restaurants.",
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
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free digital menu plan with unlimited items and QR code generation",
    },
    description:
      "Menuthere is the all-in-one digital menu platform for restaurants, cafes, and hotels. Create QR code menus, sync to Google Business Profile, run dynamic offers, and track analytics — all from one dashboard.",
    url: "https://menuthere.com",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "500",
      bestRating: "5",
    },
    featureList: [
      "QR Code Digital Menu",
      "Google Business Profile Sync",
      "Real-Time Menu Updates",
      "Dynamic Offers & Promotions",
      "Analytics & Insights",
      "Google Reviews Booster",
      "Custom Branding & Themes",
      "Multi-Location Support",
    ],
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Menuthere",
    url: "https://menuthere.com",
    logo: "https://menuthere.com/menuthere-logo.png",
    description:
      "The all-in-one platform for restaurants to manage digital menus, orders, and grow their business online.",
    sameAs: [
      "https://www.instagram.com/menu.there/",
      "https://www.linkedin.com/company/Menuthere",
      "https://www.facebook.com/Menuthere",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "menuthere@gmail.com",
      contactType: "customer support",
      availableLanguage: ["English", "Hindi", "Malayalam"],
    },
  };

  return (
    <div className="min-h-screen w-full bg-white geist-font relative">
      <JsonLd data={softwareAppSchema} />
      <JsonLd data={organizationSchema} />

      {/* HERO — headline, CTA, menu upload */}
      <Hero />

      {/* DASHBOARD ILLUSTRATION — animated product demo */}
      <Suspense fallback={<div className="bg-[#fcfbf7] w-full h-[300px] md:h-[420px]" />}>
        <section className="bg-[#fcfbf7]">
          <DashboardAnimation />
        </section>
      </Suspense>

      {/* SOCIAL PROOF — restaurant logo marquee */}
      <Suspense>
        <RestaurantMarquee />
      </Suspense>

      {/* DIVIDER */}
      <div className="w-full h-px bg-stone-200" />

      {/* FEATURES — QR Menu, Google Sync, Updates, Ordering, Analytics, Reviews */}
      <Suspense>
        <MonitorSection />
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
        <Chatwoot />
      </Suspense>
    </div>
  );
}
