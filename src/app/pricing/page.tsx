import React from "react";
import type { Metadata } from "next";
import PricingSection from "@/components/international/PricingSection";
import RestaurantMarquee from "@/components/international/RestaurantMarquee";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

export const metadata: Metadata = {
  title: "Pricing | Menuthere — Plans for Restaurants",
  description:
    "Simple plans for restaurants. No credit card needed. Upgrade for Google Business sync, analytics, and more. No hidden fees.",
  alternates: { canonical: "https://menuthere.com/pricing" },
  openGraph: {
    title: "Pricing | Menuthere — Plans for Restaurants",
    description:
      "Simple plans for restaurants. No credit card needed. Upgrade for Google Business sync, analytics, and more. No hidden fees.",
    url: "https://menuthere.com/pricing",
    type: "website",
  },
};

export default async function PricingPage() {
  const { headers } = await import("next/headers");
  const { getPartnerCountryCookie } = await import("@/app/auth/actions");
  const headersList = await headers();
  const partnerCountry = await getPartnerCountryCookie();
  // Use partner's stored country when signed in, fall back to Cloudflare header
  const country = partnerCountry
    ? ((partnerCountry === "India" || partnerCountry === "IN") ? "IN" : "OTHER")
    : (headersList.get("x-user-country") || "IN");

  return (
    <div className="min-h-screen w-full bg-[#fcfbf7] geist-font">
      {/* Pricing — hero + features */}
      <PricingSection hideHeader={false} country={country} appName="Menuthere" />

      {/* Social Proof */}
      <RestaurantMarquee />

      {/* Divider */}
      <div className="w-full h-px bg-stone-200" />

      {/* CTA */}
      <StartFreeTrailSection />

      {/* Footer */}
      <Footer appName="Menuthere" />

      {/* Chat */}
      <WhatsAppButton />
    </div>
  );
}
