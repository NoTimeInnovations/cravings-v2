"use client";
import React, { useState } from "react";
import { toast } from "sonner";
import { Check, UtensilsCrossed, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onBoardUserSignup } from "@/app/actions/onBoardUserSignup";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import { getBannerFile, clearBannerFile } from "@/lib/bannerStorage";
import { uploadFileToS3 } from "@/app/actions/aws-s3";

const plans = [
    {
        name: "Free",
        price: "$0",
        description: "Perfect for trying out Cravings",
        features: [
            "100 scans per month",
            "Create 2 offers per month",
            "10 menu edits per month",
            "Chat support"
        ],
        buttonText: "Start for Free",
        popular: false,
    },
    {
        name: "Standard",
        price: "$9",
        description: "For growing restaurants",
        features: [
            "1000 scans per month",
            "Create up to 10 offers",
            "Unlimited edits",
            "Priority support"
        ],
        buttonText: "Coming Soon",
        popular: true,
        disabled: true,
    },
    {
        name: "Plus",
        price: "$19",
        description: "For high-volume venues",
        features: [
            "Unlimited scans",
            "Unlimited offers",
            "Unlimited edits",
            "Dedicated member support",
            "Marketing kit"
        ],
        buttonText: "Coming Soon",
        popular: false,
        disabled: true,
    }
];




export default function PricingSection({ hideHeader = false, country = "US" }: { hideHeader?: boolean; country?: string }) {
    const isIndia = country === "IN";
    const currencySymbol = isIndia ? "₹" : "$";

    // Adjust prices based on country
    const displayPlans = plans.map(plan => {
        let price = plan.price;
        if (isIndia) {
            if (plan.name === "Standard") price = "₹699";
            else if (plan.name === "Plus") price = "₹1499";
            else if (plan.name === "Free") price = "₹0";
        }
        return { ...plan, price };
    });

    const router = useRouter();
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);

    const handlePlanClick = async () => {
        const onboardingData = localStorage.getItem("onboarding_data");

        if (onboardingData) {
            setIsCreatingAccount(true);
            try {
                const parsedData = JSON.parse(onboardingData);

                // Handle deferred banner upload
                if (parsedData.partner && parsedData.partner.store_banner === "PENDING_UPLOAD") {
                    const bannerFile = await getBannerFile();
                    if (bannerFile) {
                        try {
                            const timestamp = Date.now();
                            const safeName = bannerFile.name.replace(/[^a-zA-Z0-9.]/g, "_");
                            // Determine folder: existing code used 'banners/'
                            const bannerUrl = await uploadFileToS3(bannerFile, `banners/${timestamp}-${safeName}`);
                            parsedData.partner.store_banner = bannerUrl;
                            await clearBannerFile();
                        } catch (e) {
                            console.error("Banner upload failed during checkout", e);
                            parsedData.partner.store_banner = "";
                        }
                    } else {
                        parsedData.partner.store_banner = "";
                    }
                }

                await onBoardUserSignup(parsedData);

                // Clear local storage on success
                localStorage.removeItem("onboarding_data");
                localStorage.removeItem("cravings_onboarding_state");

                localStorage.removeItem("cravings_onboarding_state");

                toast.success("Account created successfully!");
                router.push("/login"); // Redirect directly
            } catch (error) {
                console.error("Signup failed", error);
            } finally {
                setIsCreatingAccount(false);
            }
        } else {
            router.push("/get-started");
        }
    };

    return (
        <section className="py-24 bg-gradient-to-br from-orange-50 to-white" id="pricing">
            {/* Full Screen Loader Overlay */}
            <FullScreenLoader
                isLoading={isCreatingAccount}
                loadingTexts={[
                    "Uploading your banner...",
                    "Creating your account...",
                    "Setting up your digital menu...",
                    "Configuring your dashboard...",
                    "Almost there..."
                ]}
            />

            <div className="max-w-7xl mx-auto px-6 text-center">
                {!hideHeader && (
                    <>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-lg text-gray-600 mb-12">Choose the plan that fits your growth.</p>
                    </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {displayPlans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative bg-white rounded-3xl shadow-xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${plan.popular
                                ? 'border-orange-200 ring-2 ring-orange-100 shadow-orange-100'
                                : 'border-gray-100'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 inset-x-0 bg-orange-600 py-1.5 text-white text-xs font-bold tracking-wide uppercase">
                                    Most Popular
                                </div>
                            )}

                            <div className={`p-8 ${plan.popular ? 'pt-10' : ''} flex flex-col h-full`}>
                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                    <p className="text-gray-500 text-sm h-10">{plan.description}</p>
                                </div>

                                <div className="flex items-baseline justify-center mb-8">
                                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                                    <span className="text-gray-500 font-medium ml-1">/month</span>
                                </div>

                                <div className="space-y-4 mb-8 flex-grow">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-3 text-left">
                                            <div className="mt-0.5 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                <Check className="h-3 w-3 text-green-600" />
                                            </div>
                                            <span className="text-gray-700 text-sm leading-tight">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                {plan.disabled ? (
                                    <Button
                                        disabled
                                        className="w-full py-6 rounded-xl shadow-none text-lg bg-gray-100 text-gray-400 border-2 border-transparent cursor-not-allowed"
                                    >
                                        {plan.buttonText}
                                    </Button>
                                ) : (
                                    <div className="block w-full mt-auto">
                                        <Button
                                            onClick={handlePlanClick}
                                            disabled={isCreatingAccount}
                                            className={`w-full py-6 rounded-xl shadow-md text-lg ${plan.popular
                                                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                                : 'bg-white border-2 border-orange-100 text-orange-600 hover:bg-orange-50 hover:border-orange-200'
                                                }`}
                                        >
                                            {plan.buttonText}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-8 text-sm text-gray-400">
                    All plans include our core features. Cancel anytime.
                </p>
            </div>
        </section>
    );
}
