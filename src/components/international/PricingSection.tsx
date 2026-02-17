"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, QrCode, Globe, Printer } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    if (isIndia) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isIndia]);

  // New India Plans Data
  const indiaPlans = {
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
    ordering: {
      id: "ordering",
      title: "Online Ordering",
      tabLabel: "QR Ordering",
      description: "Accept orders directly from customers",
      icon: Globe,
      color: "text-purple-600",
      bg: "bg-purple-100",
      features: [
        "Everything in Digital Menu",
        "Table ordering",
        "KOT & Bill printing",
        "WhatsApp integration",
        "Unlimited offers",
      ],
      variants: [
        {
          id: "in_ordering_monthly",
          name: "Ordering Monthly",
          price: "499",
          period: "/month + 2%",
          billed: "Billed monthly",
          type: "monthly",
          rz_plan_id: "plan_S7EBl1jqt0cf2x",
        },
        {
          id: "in_ordering",
          name: "Ordering Yearly",
          price: "4999",
          period: "/year + 2%",
          billed: "Billed annually",
          type: "yearly",
          savings: "Save ₹989",
          rz_plan_id: "plan_S7EHKPEHb4ZNAX",
        },
      ],
    },
    billing: {
      id: "billing",
      title: "Billing",
      tabLabel: "Billing",
      description: "Advanced billing for efficient restaurant management.",
      icon: Printer,
      color: "text-[#B5581A]",
      bg: "bg-[#F4E0D0]/70",
      features: [
        "Fully online and offline billing",
        "Remote reports tracking",
        "Multi-terminal billing",
        "KOT and Bill printing with Bluetooth/USB",
        "Real-time inventory sync",
      ],
      variants: [
        {
          id: "in_billing_yearly",
          name: "Billing Yearly",
          price: "4999",
          period: "/year",
          billed: "Billed annually",
          type: "yearly",
          rz_plan_id: "plan_S7EIQi5QLj73Wm",
        },
      ],
    },
  };

  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, number>
  >({
    digital: 1, // Default to yearly (index 1)
    ordering: 1,
    billing: 0,
  });

  // Helper to check if plan is free
  const isPlanFree = (pid: string) => pid === "int_free" || pid === "in_trial";
  const isFreePlanUsed = (userData as any)?.subscription_details
    ?.isFreePlanUsed;

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

        if (isIndia) {
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
        const expiryDate = new Date(
          now.getTime() + periodDays * 24 * 60 * 60 * 1000,
        );

        // For new users, previous usage is false unless current selection is free
        const signupIsFreeUsed = isPlanFree(plan.id);

        const subscriptionDetails = {
          plan: plan,
          status: "active",
          startDate: now.toISOString(),
          expiryDate: expiryDate.toISOString(),
          isFreePlanUsed: signupIsFreeUsed,
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
      period_days: selectedVariant.type === "monthly" ? 30 : 365,
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

        {isIndia ? (
          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden max-w-4xl mx-auto">
            <Tabs defaultValue="digital" className="w-full">
              <div className="bg-stone-50/50 p-2 border-b border-stone-200">
                <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-2 bg-stone-100/50 rounded-xl">
                  <TabsTrigger
                    value="digital"
                    className="py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium rounded-lg transition-all"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    {indiaPlans.digital.tabLabel}
                  </TabsTrigger>
                  <TabsTrigger
                    value="ordering"
                    className="py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium rounded-lg transition-all"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    {indiaPlans.ordering.tabLabel}
                  </TabsTrigger>
                  <TabsTrigger
                    value="billing"
                    className="py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-600 data-[state=active]:text-primary font-medium rounded-lg transition-all"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    {indiaPlans.billing.tabLabel}
                  </TabsTrigger>
                </TabsList>
              </div>

              {Object.entries(indiaPlans).map(([key, plan]) => (
                <TabsContent
                  key={key}
                  value={key}
                  className="p-6 md:p-10 outline-none mt-0"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-16 h-16 rounded-2xl ${plan.bg} ${plan.color} flex items-center justify-center mb-6`}
                    >
                      <plan.icon className="w-8 h-8" />
                    </div>

                    <h3 className="text-3xl font-semibold text-stone-900 mb-2">
                      {plan.title}
                    </h3>
                    <p className="text-stone-500 mb-8">{plan.description}</p>

                    {/* Pricing Cards selection */}
                    <div
                      className={cn(
                        "grid gap-4 w-full mb-8",
                        plan.variants.length === 1
                          ? "grid-cols-1 max-w-sm"
                          : "grid-cols-1 md:grid-cols-2 max-w-2xl",
                      )}
                    >
                      {plan.variants.map((variant, index) => {
                        const isSelected =
                          (selectedVariants[key] === undefined &&
                            index === 0) ||
                          selectedVariants[key] === index; // Logic: if undefined, select first? No, default checked above.
                        // Actually handled by state default
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
                              "cursor-pointer rounded-xl p-6 border-2 transition-all relative",
                              isActuallySelected
                                ? "border-[#B5581A] bg-[#F4E0D0]/30/30 ring-1 ring-[#B5581A]/20"
                                : "border-stone-200 hover:border-gray-200 bg-white",
                            )}
                          >
                            <h4 className="font-semibold text-stone-900 mb-1">
                              {variant.type === "monthly"
                                ? "Monthly"
                                : "Yearly"}
                            </h4>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-2xl font-semibold text-stone-900">
                                ₹{variant.price}
                              </span>
                              {/* <span className="text-xs text-stone-500">{variant.period}</span> */}
                            </div>
                            {/* <p className="text-xs text-stone-500 mt-1">{variant.label}</p> */}
                            <p className="text-xs text-stone-400 mt-1">
                              {variant.billed}
                            </p>

                            {(variant as any).savings && (
                              <span className="absolute top-3 right-3 text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                {(variant as any).savings}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Features */}
                    <div className="flex flex-col gap-3 text-left max-w-md w-full mb-8">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                          <span className="text-stone-700 text-sm">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    <ButtonV2
                      onClick={() => handleIndiaPlanClick(key)}
                      variant="primary"
                      showArrow={false}
                      className="w-full max-w-md justify-center h-12"
                    >
                      Get Started
                    </ButtonV2>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        ) : (
          // International Layout (Existing)
          <div className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-4 -mx-4 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:p-0 md:m-0 scrollbar-hidden">
            {displayPlans.map((plan: any, index: number) => {
              const isThisPlanFree = isPlanFree(plan.id);

              // Check if this is the user's current plan
              const currentPlanId = (userData as any)?.subscription_details
                ?.plan?.id;
              const isCurrentPlan = userData && currentPlanId === plan.id;

              const isPlanDisabled =
                plan.disabled ||
                (isFreePlanUsed && isThisPlanFree) ||
                isCurrentPlan;

              // Determine Button Text Logic
              let buttonText = plan.buttonText || "Get Plan";

              if (isCurrentPlan) {
                // Logic: Signed in and this is their active plan
                buttonText = "Current Plan";
              } else if (isThisPlanFree && isFreePlanUsed) {
                // Logic: It's a free plan, but they already used their trial
                buttonText = "Trial Used";
              } else if (!userData && !isThisPlanFree) {
                // Logic: Not signed in, looking at a paid plan -> CTA to start trial/signup
                buttonText = "Get Free Trial";
              } else if (
                userData &&
                isIndia &&
                isFreePlanUsed &&
                !isThisPlanFree
              ) {
                // Logic: Signed in, India, Trial Used, looking at a Paid Plan
                buttonText = "Get Now";
              } else if (!userData && plan.contact_sales) {
                buttonText = "Get Plan";
              }

              return (
                <div
                  key={index}
                  className={`relative min-w-[75vw] md:min-w-0 snap-center bg-white rounded-2xl md:rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${
                    plan.popular
                      ? "border-[#B5581A]/30 ring-2 ring-[#F4E0D0]"
                      : "border-stone-200"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 inset-x-0 bg-[#B5581A] py-1 text-white text-[10px] md:text-xs font-semibold tracking-wide uppercase">
                      Most Popular
                    </div>
                  )}

                  <div
                    className={`p-5 md:p-8 ${plan.popular ? "pt-7 md:pt-10" : ""} flex flex-col h-full`}
                  >
                    <div className="mb-3 md:mb-6">
                      <h3 className="text-lg md:text-xl font-semibold text-stone-900 mb-1 md:mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-stone-500 text-xs md:text-sm min-h-[2.5rem] md:h-10">
                        {plan.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-center mb-4 md:mb-8">
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl md:text-4xl font-semibold text-stone-900">
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-stone-500 font-medium ml-1 text-xs md:text-base">
                            {plan.period}
                          </span>
                        )}
                      </div>
                      {plan.yearly_price && (
                        <span className="text-xs text-stone-400 mt-1">
                          Billed {plan.yearly_price} Yearly
                        </span>
                      )}
                      {!plan.yearly_price && plan.period === "/year" && (
                        <span className="text-xs text-stone-400 mt-1">
                          Billed Yearly
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 md:space-y-4 mb-6 md:mb-8 flex-grow">
                      {plan.features.map((feature: string, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 md:gap-3 text-left"
                        >
                          <div className="mt-0.5 w-4 h-4 md:w-5 md:h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <Check className="h-2.5 w-2.5 md:h-3 md:w-3 text-green-600" />
                          </div>
                          <span className="text-stone-700 text-xs md:text-sm leading-tight">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {isPlanDisabled ? (
                      <ButtonV2
                        disabled
                        variant="secondary"
                        showArrow={false}
                        className="w-full justify-center mt-auto"
                      >
                        {buttonText}
                      </ButtonV2>
                    ) : (
                      <div className="block w-full mt-auto">
                        <ButtonV2
                          onClick={() => handlePlanClick(plan)}
                          disabled={isCreatingAccount}
                          variant={plan.popular ? "primary" : "secondary"}
                          showArrow={false}
                          className="w-full justify-center"
                        >
                          {buttonText}
                        </ButtonV2>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 md:mt-8 text-xs md:text-sm text-stone-400">
          All plans include our core features. Cancel anytime.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
