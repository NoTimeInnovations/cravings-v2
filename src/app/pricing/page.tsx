import React from "react";
import type { Metadata } from "next";
import PricingSection from "@/components/international/PricingSection";
import RestaurantMarquee from "@/components/international/RestaurantMarquee";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import Chatwoot from "@/components/Chatwoot";

export const metadata: Metadata = {
  title: "Pricing | Menuthere Digital Menu",
  description:
    "Choose the perfect plan for your restaurant. Simple, transparent pricing with no hidden fees.",
};

export default async function PricingPage() {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const country = headersList.get("x-user-country") || "IN";

  return (
    <div className="min-h-screen w-full bg-white geist-font">
      {/* Hero Header */}
      <section className="flex items-center justify-center px-5 pb-12 pt-32 md:pt-40 bg-[#fcfbf7]">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
            Plans that scale{" "}
            <span className="text-stone-500">with your business.</span>
          </h1>
          <p className="geist-font text-lg text-stone-500 max-w-md mx-auto mt-5 leading-relaxed">
            Start for free and upgrade as you grow. No credit card required.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* Pricing Cards */}
      <PricingSection hideHeader={true} country={country} appName="Menuthere" />

      {/* Social Proof */}
      <RestaurantMarquee />

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* CTA */}
      <StartFreeTrailSection />

      {/* Footer */}
      <Footer appName="Menuthere" />

      {/* Chat */}
      <Chatwoot />
    </div>
  );
}
