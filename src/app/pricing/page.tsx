import React from "react";
import type { Metadata } from "next";
import PricingSection from "@/components/international/PricingSection";
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
    <div className="min-h-screen w-full font-sans text-gray-900 bg-orange-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 text-center py-6 md:py-10">
        <h1 className="text-2xl md:text-5xl font-extrabold text-gray-900 mb-3 md:mb-6">
          Plans that scale with your business
        </h1>
        <p className="text-sm md:text-xl text-gray-600 max-w-2xl mx-auto">
          Start for free and upgrade as you grow. No credit card required to
          start.
        </p>
      </div>

      <PricingSection hideHeader={true} country={country} appName="Menuthere" />

      {/* Chatwoot Chat Bubble */}
      <Chatwoot />
    </div>
  );
}
