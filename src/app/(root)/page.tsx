import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import RestaurantMarquee from "@/components/international/RestaurantMarquee";
import PricingSection from "@/components/international/PricingSection";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import WorkingSteps from "@/components/home/WorkingSteps";
import FAQ from "@/components/home/FAQ";
import Background from "@/components/home/Background";
import PlatformFeatures from "@/components/home/PlatformFeatures";
import AnimatedFeatures from "@/components/home/AnimatedFeatures";

import Footer from "@/components/Footer";
import Chatwoot from "@/components/Chatwoot";
import { getDomainConfig } from "@/lib/domain-utils";
import { headers } from "next/headers";
import { JsonLd } from "@/components/seo/JsonLd";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host");
  const config = getDomainConfig(host);

  return {
    title: `${config.title} Digital Menu | The #1 QR Menu Creator for Restaurants`,
    description: `Create a stunning digital menu instantly. No apps required. The smartest restaurant menu creator with QR codes, real-time editing, and marketing tools. Try for free.`,
    keywords: ["Digital Menu", "QR Code Menu", "Restaurant Menu App", "Contactless Menu", "Menu Creator"],
    openGraph: {
      title: `${config.title} Digital Menu | The #1 QR Menu Creator`,
      description: `Create a stunning digital menu instantly with ${config.name}. Join 400+ restaurants growing their business.`,
      images: ["/og_image.png"],
      type: "website",
    },
  };
}

export default async function Home() {
  const headersList = await headers();
  const country = headersList.get("x-user-country") || "US";
  const host = headersList.get("host");
  const config = getDomainConfig(host);

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": config.name,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": `Create a stunning digital menu instantly. The smartest restaurant menu creator with QR codes, real-time editing, and marketing tools.`,
    "url": `https://${host || 'www.cravings.live'}`,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "500"
    }
  };

  return (
    <div className="min-h-screen w-full font-sans text-gray-900 relative">
      <JsonLd data={softwareAppSchema} />
      <Background />

      {/* HERO SECTION (Client Component for Animations) */}
      <Hero appName="MenuThere" />

      {/* MARQUEE SECTION */}
      <section className="py-10 bg-[#f4e5d5] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-widest mb-8">
            Trusted by Top Restaurants & Hotels
          </p>
          <RestaurantMarquee />
        </div>
      </section>


      {/* PLATFORM FEATURES SECTION */}
      <PlatformFeatures />



      {/* ANIMATED FEATURES SECTION */}
      <AnimatedFeatures />

      {/* FEATURES SECTION (Client Component for Hover Effects) */}
      {/* <section className="py-24 relative overflow-hidden" id="features">
        <div className="absolute inset-0 bg-white/40 -z-10" />
        <Features />
      </section> */}

      {/* HOW IT WORKS SECTION (Client Component for Step Animations) */}
      <WorkingSteps appName="MenuThere" />

      {/* FAQ SECTION */}
      <FAQ />

      {/* PRICING SECTION */}
      {/* <PricingSection country={country} /> */}

      {/* FOOTER CTA */}
      <Footer appName="MenuThere" />

      {/* Chatwoot Chat Bubble */}
      <Chatwoot />
    </div >
  );
}
