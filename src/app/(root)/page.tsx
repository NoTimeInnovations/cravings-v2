import React from "react";
import type { Metadata } from "next";
import RestaurantMarquee from "@/components/international/RestaurantMarquee";
import Hero from "@/components/home/Hero";
import FAQ from "@/components/home/FAQ";
import Footer from "@/components/Footer";
import Chatwoot from "@/components/Chatwoot";
import { JsonLd } from "@/components/seo/JsonLd";
import MonitorSection from "@/components/home/MonitorSection";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";

export const metadata: Metadata = {
  title:
    "Menuthere | #1 QR Code Digital Menu for Restaurants, Cafes & Hotels",
  description:
    "Create a stunning QR code digital menu for your restaurant in minutes. Real-time updates, Google Business sync, table ordering, POS billing, and zero printing costs. Trusted by 1,000+ restaurants. Start free.",
  keywords: [
    "digital menu",
    "QR code menu",
    "restaurant menu app",
    "contactless menu",
    "QR menu creator",
    "restaurant digital menu",
    "online menu for restaurant",
    "table ordering system",
    "restaurant POS",
    "Google Business menu sync",
    "restaurant technology",
    "digital menu for cafes",
    "digital menu for hotels",
    "QR ordering system",
    "restaurant management software",
  ],
  openGraph: {
    title: "Menuthere | #1 QR Code Digital Menu for Restaurants",
    description:
      "Create a stunning QR code digital menu in minutes. Real-time updates, Google Business sync, and table ordering. Trusted by 1,000+ restaurants.",
    images: ["/og_image.png"],
    type: "website",
    url: "https://menuthere.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Menuthere | #1 QR Code Digital Menu for Restaurants",
    description:
      "Create a stunning QR code digital menu in minutes. Trusted by 1,000+ restaurants.",
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
      "Menuthere is the all-in-one digital menu platform for restaurants, cafes, and hotels. Create QR code menus, sync to Google Business Profile, accept table orders, and manage billing — all from one dashboard.",
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
      "Table Ordering System",
      "POS Billing",
      "Kitchen Order Tickets (KOT)",
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

      {/* SOCIAL PROOF — restaurant logo marquee */}
      <RestaurantMarquee />

      {/* DIVIDER */}
      <div className="w-full h-px bg-stone-200" />

      {/* FEATURES — QR Menu, Google Sync, Updates, Ordering, Analytics, Reviews */}
      <MonitorSection />

      {/* CTA — start for free with stats */}
      <StartFreeTrailSection />

      {/* FAQ — SEO-rich questions with structured data */}
      <FAQ />

      {/* FOOTER */}
      <Footer appName="Menuthere" />

      {/* CHAT */}
      <Chatwoot />
    </div>
  );
}
