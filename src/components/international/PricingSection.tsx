"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { onBoardUserSignup } from "@/app/actions/onBoardUserSignup";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import { getBannerFile, clearBannerFile } from "@/lib/bannerStorage";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { useAuthStore } from "@/store/authStore";
import plansData from "@/data/plans.json";

const PricingSection = ({ hideHeader = false, country: propCountry }: { hideHeader?: boolean; country?: string }) => {
    const { userData } = useAuthStore();
    const router = useRouter();
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);
    const [isSubmittingContact, setIsSubmittingContact] = useState(false);
    const [redirectLoadingText, setRedirectLoadingText] = useState<string | null>(null);

    const isIndia = propCountry === "IN";

    // Select plans based on country
    const displayPlans = isIndia ? plansData.india : plansData.international;


    // Helper to check if plan is free
    const isPlanFree = (pid: string) => pid === 'int_free' || pid === 'in_trial';
    const isFreePlanUsed = (userData as any)?.subscription_details?.isFreePlanUsed;

    const handlePlanClick = async (plan: any) => {
        const isTargetPlanFree = isPlanFree(plan.id);

        if (!isTargetPlanFree) {
            // Logic for Non-Free Plans
            if (!userData) {
                // If not logged in, redirect to get-started
                // Requirement: "Starting free plan then u can upgrade" loaded text
                setRedirectLoadingText("Starting free plan, then you can upgrade...");
                setIsCreatingAccount(true);

                setTimeout(() => {
                    router.push("/get-started");
                }, 2000);
                return;
            }

            // If logged in, check if they have a free plan (or are just a valid user)
            // Requirement: "only customers who have free plan can send a upgrade plan"
            // We interpret this as "Logged in users can request upgrade".
            // We verify they have a valid subscription object usually.

            setIsSubmittingContact(true);
            try {
                const { notifyPlanInterest } = await import("@/app/actions/notifyPlanInterest");
                const partnerName = (userData as any).name || userData.email || "Partner";
                const phone = (userData as any).phone || "";
                const storeName = (userData as any).store_name || "Store";

                // 1. Send Email Notification
                await notifyPlanInterest({
                    partnerName,
                    partnerEmail: userData.email || "",
                    partnerPhone: phone,
                    storeName,
                    planName: plan.name,
                    planId: plan.id,
                    partnerId: userData.id
                });

                // 2. Open WhatsApp
                const text = `Hi! I'm ${partnerName} from ${storeName} (ID: ${userData.id}). I'm interested in upgrading to the ${plan.name} plan.`;
                const encodedText = encodeURIComponent(text);
                window.open(`https://wa.me/918590115462?text=${encodedText}`, '_blank');

                toast.success("Upgrade request sent! Opening WhatsApp...");

            } catch (error) {
                console.error("Failed to send upgrade request", error);
                toast.error("Failed to send request.");
            } finally {
                setIsSubmittingContact(false);
            }
            return;
        }

        // --- Logic for FREE Plans (Start Free / Trial) ---
        const nextIsFreePlanUsed = isFreePlanUsed || isPlanFree(plan.id);

        // 1. If Logged In -> Upgrade/downgrade to free? (Usually unlikely if they are already free, but handled)
        if (userData) {
            // Existing logic to switch to free plan if applicable
            setIsCreatingAccount(true);
            try {
                const { upgradePlan } = await import("@/app/actions/upgradePlan");
                const result = await upgradePlan(userData.id, plan, nextIsFreePlanUsed);

                if (result.success) {
                    toast.success(`Switched to ${plan.name} successfully!`);
                    window.location.reload();
                } else {
                    toast.error("Switch failed. Please try again.");
                }
            } catch (e) {
                console.error("Switch error", e);
                toast.error("Something went wrong");
            } finally {
                setIsCreatingAccount(false);
            }
            return;
        }

        // 2. If Not Logged In -> Signup Flow
        const onboardingData = localStorage.getItem("onboarding_data");

        if (onboardingData) {
            setIsCreatingAccount(true);
            try {
                const parsedData = JSON.parse(onboardingData);

                // --- INJECT PLAN DETAILS ---
                const now = new Date();
                const periodDays = plan.id === "in_trial" ? 20 : (plan.period_days || 365);
                const expiryDate = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

                // For new users, previous usage is false unless current selection is free
                const signupIsFreeUsed = isPlanFree(plan.id);

                const subscriptionDetails = {
                    plan: plan,
                    status: "active",
                    startDate: now.toISOString(),
                    expiryDate: expiryDate.toISOString(),
                    isFreePlanUsed: signupIsFreeUsed,
                    usage: {
                        scans_cycle: 0,
                        last_reset: now.toISOString(),
                    }
                };

                // Helper to generate feature flags string from plan
                let finalFlags: string[] = [];

                if (plan.id === 'in_trial' || plan.id === 'in_ordering') {
                    const defaultFlags = [
                        "ordering-false", "delivery-false", "multiwhatsapp-false",
                        "pos-false", "stockmanagement-false", "captainordering-false",
                        "purchasemanagement-false"
                    ];
                    const enabledMap = plan.features_enabled || {};
                    finalFlags = defaultFlags.map(flag => {
                        const [key] = flag.split("-");
                        if (enabledMap[key]) return `${key}-true`;
                        return flag;
                    });
                }

                parsedData.partner.subscription_details = subscriptionDetails;
                parsedData.partner.feature_flags = finalFlags.join(",");
                // ---------------------------

                // Handle deferred banner upload
                if (parsedData.partner && parsedData.partner.store_banner === "PENDING_UPLOAD") {
                    const bannerFile = await getBannerFile();
                    if (bannerFile) {
                        try {
                            const timestamp = Date.now();
                            const safeName = bannerFile.name.replace(/[^a-zA-Z0-9.]/g, "_");
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

                const result = await onBoardUserSignup(parsedData);

                // Clear local storage on success
                localStorage.removeItem("onboarding_data");
                localStorage.removeItem("cravings_onboarding_state");

                toast.success("Account created successfully!");
                router.push("/login?signup=success");
            } catch (error) {
                console.error("Signup failed", error);
                toast.error("Failed to create account. Please try again.");
            } finally {
                setIsCreatingAccount(false);
            }
        } else {
            router.push("/get-started");
        }
    };

    return (
        <section className="py-6 md:py-24 bg-gradient-to-br from-orange-50 to-white" id="pricing">
            {/* Full Screen Loader Overlay */}
            <FullScreenLoader
                isLoading={isCreatingAccount}
                loadingTexts={redirectLoadingText ? [redirectLoadingText] : [
                    "Uploading your banner...",
                    "Creating your account...",
                    "Setting up your digital menu...",
                    "Configuring your dashboard...",
                    "Almost there..."
                ]}
            />

            <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
                {!hideHeader && (
                    <>
                        <h2 className="text-lg md:text-4xl font-bold text-gray-900 mb-2 md:mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-xs md:text-lg text-gray-600 mb-6 md:mb-12">Choose the plan that fits your growth.</p>
                    </>
                )}

                <div className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-4 -mx-4 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:p-0 md:m-0 scrollbar-hidden">
                    {displayPlans.map((plan: any, index: number) => {
                        const isThisPlanFree = isPlanFree(plan.id);
                        const isPlanDisabled = plan.disabled || (isFreePlanUsed && isThisPlanFree);

                        let buttonText = plan.buttonText;
                        if (isFreePlanUsed && isThisPlanFree) {
                            buttonText = "Trial Used";
                        } else if (!userData && plan.contact_sales) {
                            buttonText = "Get Plan";
                        }

                        return (
                            <div
                                key={index}
                                className={`relative min-w-[75vw] md:min-w-0 snap-center bg-white rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${plan.popular
                                    ? 'border-orange-200 ring-2 ring-orange-100 shadow-orange-100'
                                    : 'border-gray-100'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute top-0 inset-x-0 bg-orange-600 py-1 text-white text-[10px] md:text-xs font-bold tracking-wide uppercase">
                                        Most Popular
                                    </div>
                                )}

                                <div className={`p-5 md:p-8 ${plan.popular ? 'pt-7 md:pt-10' : ''} flex flex-col h-full`}>
                                    <div className="mb-3 md:mb-6">
                                        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{plan.name}</h3>
                                        <p className="text-gray-500 text-xs md:text-sm min-h-[2.5rem] md:h-10">{plan.description}</p>
                                    </div>

                                    <div className="flex flex-col items-center mb-4 md:mb-8">
                                        <div className="flex items-baseline justify-center">
                                            <span className="text-3xl md:text-4xl font-extrabold text-gray-900">{plan.price}</span>
                                            {plan.period && <span className="text-gray-500 font-medium ml-1 text-xs md:text-base">{plan.period}</span>}
                                        </div>
                                        {plan.yearly_price && (
                                            <span className="text-xs text-gray-400 mt-1">Billed {plan.yearly_price} Yearly</span>
                                        )}
                                        {!plan.yearly_price && plan.period === '/year' && (
                                            <span className="text-xs text-gray-400 mt-1">Billed Yearly</span>
                                        )}
                                    </div>

                                    <div className="space-y-2 md:space-y-4 mb-6 md:mb-8 flex-grow">
                                        {plan.features.map((feature: string, i: number) => (
                                            <div key={i} className="flex items-start gap-2 md:gap-3 text-left">
                                                <div className="mt-0.5 w-4 h-4 md:w-5 md:h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                    <Check className="h-2.5 w-2.5 md:h-3 md:w-3 text-green-600" />
                                                </div>
                                                <span className="text-gray-700 text-xs md:text-sm leading-tight">{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {isPlanDisabled ? (
                                        <Button
                                            disabled
                                            className="w-full py-4 rounded-lg shadow-none text-sm font-semibold bg-gray-100 text-gray-400 border-2 border-transparent cursor-not-allowed h-auto"
                                        >
                                            {buttonText}
                                        </Button>
                                    ) : (
                                        <div className="block w-full mt-auto">
                                            <Button
                                                onClick={() => handlePlanClick(plan)}
                                                disabled={isCreatingAccount}
                                                className={`w-full py-4 rounded-lg text-sm font-semibold h-auto transition-all ${plan.popular
                                                    ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 hover:shadow-orange-300'
                                                    : 'bg-white border-2 border-orange-100 text-orange-600 hover:bg-orange-50 hover:border-orange-200 shadow-sm hover:shadow-md'
                                                    }`}
                                            >
                                                {buttonText}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <p className="mt-6 md:mt-8 text-xs md:text-sm text-gray-400">
                    All plans include our core features. Cancel anytime.
                </p>
            </div>
        </section>
    );
}

export default PricingSection;
