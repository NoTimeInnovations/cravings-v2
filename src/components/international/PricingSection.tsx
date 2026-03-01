"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, QrCode, Gift } from "lucide-react";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import { useRouter } from "next/navigation";
import { onBoardUserSignup } from "@/app/actions/onBoardUserSignup";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import { getBannerFile, clearBannerFile } from "@/lib/bannerStorage";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { useAuthStore } from "@/store/authStore";
import plansData from "@/data/plans.json";
import {
  createSubscriptionAction,
  verifySubscriptionAction,
} from "@/app/actions/razorpay_payments";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PricingSection = ({
  hideHeader = false,
  country: propCountry,
  appName = "Menuthere",
}: {
  hideHeader?: boolean;
  country?: string;
  appName?: string;
}) => {
  const { userData } = useAuthStore();
  const router = useRouter();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [redirectLoadingText, setRedirectLoadingText] = useState<string | null>(
    null,
  );

  const isIndia = propCountry === "IN";
  // const isIndia = true;

  // Select plans based on country
  const displayPlans = !isIndia ? plansData.international : plansData.india;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // New India Plans Data
  const indiaPlans = {
    free: {
      id: "free",
      title: "Free Menu",
      tabLabel: "Free",
      description: "Get your digital menu online for free, forever",
      icon: Gift,
      color: "text-green-600",
      bg: "bg-green-100",
      features: [
        "Digital menu",
        "Unlimited items & categories",
        "1 QR code",
        "Custom banner & logo",
        "Basic scan analytics",
      ],
      variants: [
        {
          id: "free_plan",
          name: "Free Menu",
          price: "0",
          period: "forever",
          billed: "No billing required",
          type: "free" as const,
        },
      ],
    },
    digital: {
      id: "digital",
      title: "Digital Menu",
      tabLabel: "QR Menu",
      description: "Essential, contactless digital menu",
      icon: QrCode,
      color: "text-blue-600",
      bg: "bg-blue-100",
      features: [
        "Digital menu",
        "Unlimited items",
        "QR code generation",
        "Unlimited edits",
        "Chat support",
      ],
      variants: [
        {
          id: "in_digital_monthly",
          name: "Digital Menu Monthly",
          price: "299",
          period: "/month",
          billed: "Billed monthly",
          type: "monthly",
          rz_plan_id: "plan_S7E5JO7kPtwGnA",
        },
        {
          id: "in_digital",
          name: "Digital Menu Yearly",
          price: "2999",
          period: "/year",
          billed: "Billed annually",
          type: "yearly",
          savings: "Save ₹589",
          rz_plan_id: "plan_S7EEdzZoy456iP",
        },
      ],
    },
  };

  // International Plans Data (tabbed like India)
  const internationalPlans = {
    free: {
      id: "free",
      title: "Free Menu",
      tabLabel: "Free",
      description: "Get your digital menu online for free, forever",
      icon: Gift,
      color: "text-green-600",
      bg: "bg-green-100",
      features: [
        "Digital menu",
        "Unlimited items & categories",
        "1 QR code",
        "Custom banner & logo",
        "Basic scan analytics",
      ],
      variants: [
        {
          id: "free_plan",
          name: "Free Menu",
          price: "0",
          period: "forever",
          billed: "No billing required",
          type: "free" as const,
        },
      ],
    },
    digital: {
      id: "digital",
      title: "Digital Menu",
      tabLabel: "QR Menu",
      description: "Essential digital menu for your restaurant",
      icon: QrCode,
      color: "text-blue-600",
      bg: "bg-blue-100",
      features: [
        "Digital menu",
        "Unlimited items",
        "QR code generation",
        "Unlimited edits",
        "Priority chat support",
      ],
      variants: [
        {
          id: "int_digital_monthly",
          name: "Digital Menu Monthly",
          price: "19",
          period: "/month",
          billed: "Billed monthly",
          type: "monthly",
          rz_plan_id: "plan_SIjWQgXZj9I2Vx",
        },
        {
          id: "int_digital",
          name: "Digital Menu Yearly",
          price: "190",
          period: "/year",
          billed: "Billed annually",
          type: "yearly",
          savings: "Save $38",
          rz_plan_id: "plan_SIjXPD8frrA8TZ",
        },
      ],
    },
  };

  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, number>
  >({
    free: 0,
    digital: 1, // Default to yearly (index 1)
  });

  const activePlans = isIndia ? indiaPlans : internationalPlans;
  const currencySymbol = isIndia ? "₹" : "$";

  // Helper to check if plan is free
  const isPlanFree = (pid: string) => ["in_trial", "free_plan"].includes(pid);
  const isFreePlanUsed = (userData as any)?.subscription_details
    ?.isFreePlanUsed;
  const currentPlanId = (userData as any)?.subscription_details?.plan?.id;

  const handlePayment = async (plan: any) => {
    setIsCreatingAccount(true);
    setRedirectLoadingText("Initializing Secure Payment...");

    try {
      // 1. Create Subscription on Server
      const response = await createSubscriptionAction(
        plan.id,
        plan.rz_plan_id,
        (userData as any).id,
        (userData as any).store_name,
      );

      if (!response.success || !response.subscription_id) {
        toast.error("Could not initiate payment. Please contact support.");
        setIsCreatingAccount(false);
        return;
      }

      // 2. Open Razorpay Modal
      const options = {
        key: response.key_id,
        subscription_id: response.subscription_id,
        name: `$Menuthere App`,
        description: `Upgrade to ${plan.name}`,
        handler: async function (response: any) {
          setRedirectLoadingText("Verifying Payment...");

          // 3. Verify on Server
          const verifyRes = await verifySubscriptionAction(
            response.razorpay_payment_id,
            response.razorpay_subscription_id,
            response.razorpay_signature,
            (userData as any).id,
            plan,
          );

          if (verifyRes.success) {
            toast.success("Upgrade Successful! Welcome to " + plan.name);
            router.push("/admin-v2");
          } else {
            toast.error("Payment verification failed. Please contact support.");
            setIsCreatingAccount(false);
          }
        },
        prefill: {
          name: (userData as any).name || "",
          email: (userData as any).email || "",
          contact: (userData as any).phone || "",
        },
        theme: {
          color: "#EA580C", // Orange-600 to match your UI
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast.error(response.error.description);
        setIsCreatingAccount(false);
      });

      rzp.open();
    } catch (error) {
      console.error("Payment Error", error);
      toast.error("Something went wrong with payment");
      setIsCreatingAccount(false);
    }
  };

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

      // If logged in
      setIsSubmittingContact(true);
      try {
        const { notifyPlanInterest } =
          await import("@/app/actions/notifyPlanInterest");
        const partnerName =
          (userData as any).name || userData.email || "Partner";
        const phone = (userData as any).phone || "";
        const storeName = (userData as any).store_name || "Store";

        if (plan.rz_plan_id) {
          await handlePayment(plan);
          return;
        }

        // 1. Send Email Notification
        await notifyPlanInterest({
          partnerName,
          partnerEmail: userData.email || "",
          partnerPhone: phone,
          storeName,
          planName: plan.name,
          planId: plan.id,
          partnerId: userData.id,
        });

        // 2. Open WhatsApp
        const currentPlan =
          (userData as any).subscription_details?.plan?.name || "Trial";
        const text = `Hi, im ${storeName} i would like to upgrade to ${plan.name} from ${currentPlan} my email is ${userData.email}`;
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/918590115462?text=${encodedText}`, "_blank");

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

    // 1. If Logged In -> Upgrade/downgrade to free?
    if (userData) {
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
        const periodDays = plan.period_days || 365;
        const isFreePlanSignup = periodDays === -1;
        const expiryDate = isFreePlanSignup
          ? null
          : new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

        const subscriptionDetails = {
          plan: plan,
          status: "active",
          startDate: now.toISOString(),
          expiryDate: expiryDate ? expiryDate.toISOString() : null,
          isFreePlanUsed: false,
        };

        // Helper to generate feature flags string from plan
        let finalFlags: string[] = [];

        if (plan.id === "in_trial" || plan.id === "in_ordering") {
          const defaultFlags = [
            "ordering-false",
            "delivery-false",
            "multiwhatsapp-false",
            "pos-false",
            "stockmanagement-false",
            "captainordering-false",
            "purchasemanagement-false",
          ];
          const enabledMap = plan.features_enabled || {};
          finalFlags = defaultFlags.map((flag) => {
            const [key] = flag.split("-");
            if (enabledMap[key]) return `${key}-true`;
            return flag;
          });
        }

        parsedData.partner.subscription_details = subscriptionDetails;
        parsedData.partner.feature_flags = finalFlags.join(",");
        // ---------------------------

        // Handle deferred banner upload
        if (
          parsedData.partner &&
          parsedData.partner.store_banner === "PENDING_UPLOAD"
        ) {
          const bannerFile = await getBannerFile();
          if (bannerFile) {
            try {
              const timestamp = Date.now();
              const safeName = bannerFile.name.replace(/[^a-zA-Z0-9.]/g, "_");
              const bannerUrl = await uploadFileToS3(
                bannerFile,
                `banners/${timestamp}-${safeName}`,
              );
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

  const handleIndiaPlanClick = (categoryKey: string) => {
    const category = indiaPlans[categoryKey as keyof typeof indiaPlans];
    const variantIndex = selectedVariants[categoryKey] || 0;
    const selectedVariant = category.variants[variantIndex];

    handlePlanClick({
      ...selectedVariant,
      name: category.title, // Use category title context
      description: category.description,
      // Ensure compatibility with existing logic
      period_days: selectedVariant.type === "free" ? -1 : selectedVariant.type === "monthly" ? 30 : 365,
    });
  };

  const handleInternationalPlanClick = (categoryKey: string) => {
    const category = internationalPlans[categoryKey as keyof typeof internationalPlans];
    const variantIndex = selectedVariants[categoryKey] || 0;
    const selectedVariant = category.variants[variantIndex];

    handlePlanClick({
      ...selectedVariant,
      name: category.title,
      description: category.description,
      period_days: selectedVariant.type === "free" ? -1 : selectedVariant.type === "monthly" ? 30 : 365,
    });
  };

  return (
    <section
      className="py-6 md:py-24 bg-white"
      id="pricing"
    >
      <FullScreenLoader
        isLoading={isCreatingAccount}
        loadingTexts={
          redirectLoadingText
            ? [redirectLoadingText]
            : [
                "Uploading your banner...",
                "Creating your account...",
                "Setting up your digital menu...",
                "Configuring your dashboard...",
                "Almost there...",
              ]
        }
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
        {!hideHeader && (
          <>
            <h2 className="text-lg md:text-4xl font-semibold text-stone-900 mb-2 md:mb-4 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xs md:text-lg text-stone-500 mb-6 md:mb-12">
              Choose the plan that fits your growth.
            </p>
          </>
        )}

        <div className="grid gap-6 max-w-4xl mx-auto grid-cols-1 md:grid-cols-2">
          {Object.entries(activePlans).map(([key, plan]) => (
            <div
              key={key}
              className="bg-white rounded-3xl border border-stone-200 overflow-hidden flex flex-col"
            >
              <div className="p-6 md:p-8 flex flex-col items-center flex-1">
                <div
                  className={`w-14 h-14 rounded-2xl ${plan.bg} ${plan.color} flex items-center justify-center mb-4`}
                >
                  <plan.icon className="w-7 h-7" />
                </div>

                <h3 className="text-2xl font-semibold text-stone-900 mb-1">
                  {plan.title}
                </h3>
                <p className="text-stone-500 text-sm mb-6">{plan.description}</p>

                {/* Pricing variant selection */}
                <div
                  className={cn(
                    "grid gap-3 w-full mb-6",
                    plan.variants.length === 1
                      ? "grid-cols-1"
                      : "grid-cols-2",
                  )}
                >
                  {plan.variants.map((variant, index) => {
                    const isActuallySelected =
                      selectedVariants[key] === index;

                    return (
                      <div
                        key={index}
                        onClick={() =>
                          setSelectedVariants((prev) => ({
                            ...prev,
                            [key]: index,
                          }))
                        }
                        className={cn(
                          "cursor-pointer rounded-xl p-4 border-2 transition-all relative",
                          isActuallySelected
                            ? "border-orange-600 bg-orange-100/30 ring-1 ring-orange-600/20"
                            : "border-stone-200 hover:border-gray-200 bg-white",
                        )}
                      >
                        <h4 className="font-semibold text-stone-900 text-sm mb-1">
                          {variant.type === "free"
                            ? "Forever"
                            : variant.type === "monthly"
                            ? "Monthly"
                            : "Yearly"}
                        </h4>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-xl font-semibold text-stone-900">
                            {variant.type === "free" ? "Free" : `${currencySymbol}${variant.price}`}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-1">
                          {variant.billed}
                        </p>

                        {(variant as any).savings && (
                          <span className="absolute top-2 right-2 text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                            {(variant as any).savings}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Features */}
                <div className="flex flex-col gap-2.5 text-left w-full mb-6">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-stone-700 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto w-full">
                  <ButtonV2
                    onClick={() => isIndia ? handleIndiaPlanClick(key) : handleInternationalPlanClick(key)}
                    variant="primary"
                    showArrow={false}
                    className="w-full justify-center h-12"
                  >
                    {currentPlanId === plan.variants[selectedVariants[key] || 0]?.id
                      ? "Current Plan"
                      : key === "free"
                      ? "Get Free Menu"
                      : "Get Started"}
                  </ButtonV2>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 md:mt-8 text-xs md:text-sm text-stone-400">
          All plans include our core features. Cancel anytime.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
