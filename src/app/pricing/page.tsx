import React from "react";
import type { Metadata } from "next";
import PricingSection from "@/components/international/PricingSection";

export const metadata: Metadata = {
    title: "Pricing | Cravings Digital Menu",
    description: "Choose the perfect plan for your restaurant. Simple, transparent pricing with no hidden fees.",
};

import { headers } from "next/headers";

export default async function PricingPage() {
    const headersList = await headers();
    const country = headersList.get("x-user-country") || "US";

    return (
        <div className="min-h-screen w-full font-sans text-gray-900 pt-20 bg-orange-50">
            <div className="max-w-7xl mx-auto px-6 text-center py-10">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
                    Plans that scale with your business
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Start for free and upgrade as you grow. No credit card required to start.
                </p>
            </div>

            <PricingSection hideHeader={true} country={country} />
        </div>
    );
}
