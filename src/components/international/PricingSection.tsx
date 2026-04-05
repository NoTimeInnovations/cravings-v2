"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PlanCard } from "@/components/international/PricingCard";
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
import { UpgradeSuccessModal } from "@/components/admin-v2/UpgradeSuccessModal";
import {
  Globe,
  Smartphone,
  Truck,
  MessageCircle,
  UtensilsCrossed,
  LayoutGrid,
  Link2,
  Check,
} from "lucide-react";

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [upgradedPlanName, setUpgradedPlanName] = useState("");
  const [upgradedPlanFeatures, setUpgradedPlanFeatures] = useState<string[]>([]);

  // Sync partner country cookie for existing users who don't have it yet
  useEffect(() => {
    const partnerCountry = (userData as any)?.country;
    if (partnerCountry && !document.cookie.includes("partner_country=")) {
      document.cookie = `partner_country=${encodeURIComponent(partnerCountry)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    }
  }, [userData]);

  // Scroll to hash fragment (e.g. #plan-petpooja) after mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, []);

  const isIndia = propCountry === "IN" || propCountry === "India";

  const displayPlans = !isIndia ? plansData.international : plansData.india;

  // Lookup rz_plan_id from plans.json (single source of truth)
  const allPlans = [...plansData.india, ...plansData.international] as any[];
  const getRzPlanId = (planId: string): string =>
    allPlans.find((p: any) => p.id === planId)?.rz_plan_id || "";

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const indiaPlans: Record<string, PlanCard> = {
    bundle: {
      id: "bundle",
      title: "Complete Restaurant Bundle",
      description: "Everything you need to grow your restaurant business",
      popular: true,
      contactSales: true,
      features: [
        "Delivery website with Petpooja POS integration",
        "Customer ordering app (Play Store & App Store)",
        "Delivery driver app with live tracking",
        "WhatsApp automation",
        "Digital menu",
        "Table ordering system",
        "Up to 5,000 orders/month",
      ],
      variants: [
        {
          id: "in_bundle_monthly",
          name: "Complete Restaurant Bundle",
          price: "10000",
          period: "/month",
          billed: "Billed monthly",
          type: "monthly",
        },
      ],
    },
    enterprise: {
      id: "enterprise",
      title: "Enterprise",
      description: "For more than 5,000 orders per month",
      contactSales: true,
      features: [
        "Unlimited orders",
        "Full API access",
        "Dedicated account manager",
        "Custom dashboard & reports",
        "White-label solutions",
        "SLA guarantees",
      ],
      variants: [
        {
          id: "in_enterprise",
          name: "Enterprise",
          price: "Custom",
          period: "",
          billed: "Custom billing",
          type: "monthly",
        },
      ],
    },
  };

  const internationalPlans: Record<string, PlanCard> = {
    professional: {
      id: "professional",
      title: "Professional",
      description: "Up to 5,000 orders per month",
      popular: true,
      features: [
        "Digital menu",
        "Unlimited items & categories",
        "QR code generation",
        "WhatsApp integration",
        "Google menu sync",
        "Customer ordering app (Play Store & App Store)",
        "Delivery driver app for own drivers",
        "Priority support",
        "Advanced analytics & reporting",
        "Multi-location support",
        "Up to 5,000 orders/month",
      ],
      variants: [
        {
          id: "int_digital_monthly",
          name: "Professional Monthly",
          price: "100",
          period: "/month",
          billed: "Billed monthly",
          type: "monthly",
          rz_plan_id: getRzPlanId("int_digital_monthly"),
        },
      ],
    },
    enterprise: {
      id: "enterprise",
      title: "Enterprise",
      description: "For more than 5,000 orders per month",
      contactSales: true,
      features: [
        "Unlimited orders",
        "Full API access",
        "Dedicated account manager",
        "Custom dashboard & reports",
        "White-label solutions",
        "SLA guarantees",
      ],
      variants: [
        {
          id: "int_enterprise",
          name: "Enterprise",
          price: "Custom",
          period: "",
          billed: "Custom billing",
          type: "monthly",
        },
      ],
    },
  };

  const activePlans = isIndia ? indiaPlans : internationalPlans;
  const currencySymbol = isIndia ? "₹" : "$";

  const isPlanFree = (pid: string) => ["in_trial", "free_plan"].includes(pid);
  const isFreePlanUsed = (userData as any)?.subscription_details?.isFreePlanUsed;
  const currentPlanId = (userData as any)?.subscription_details?.plan?.id;

  // Get the active variant
  const getActiveVariant = (plan: PlanCard) => {
    return plan.variants[0];
  };

  const handlePayment = async (plan: any) => {
    setIsCreatingAccount(true);
    setRedirectLoadingText("Initializing Secure Payment...");

    try {
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

      const options = {
        key: response.key_id,
        subscription_id: response.subscription_id,
        name: `Menuthere App`,
        description: `Upgrade to ${plan.name}`,
        handler: async function (response: any) {
          setRedirectLoadingText("Verifying Payment...");

          const verifyRes = await verifySubscriptionAction(
            response.razorpay_payment_id,
            response.razorpay_subscription_id,
            response.razorpay_signature,
            (userData as any).id,
            plan,
          );

          if (verifyRes.success) {
            if (verifyRes.feature_flags || verifyRes.subscription_details) {
              useAuthStore.setState({
                userData: {
                  ...userData,
                  feature_flags: verifyRes.feature_flags || (userData as any).feature_flags,
                  subscription_details: verifyRes.subscription_details || (userData as any).subscription_details,
                } as any,
              });
            }
            setIsCreatingAccount(false);
            setUpgradedPlanName(plan.name);
            setUpgradedPlanFeatures(
              Object.values(activePlans).find((p) =>
                p.variants.some((v) => v.id === plan.id)
              )?.features || []
            );
            setShowSuccess(true);
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
          color: "#EA580C",
        },
      };

      if (!window.Razorpay) {
        toast.error("Payment gateway is loading. Please try again.");
        setIsCreatingAccount(false);
        return;
      }

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
      if (!userData) {
        setRedirectLoadingText("Starting free plan, then you can upgrade...");
        setIsCreatingAccount(true);
        setTimeout(() => {
          router.push("/get-started");
        }, 2000);
        return;
      }

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

        await notifyPlanInterest({
          partnerName,
          partnerEmail: userData.email || "",
          partnerPhone: phone,
          storeName,
          planName: plan.name,
          planId: plan.id,
          partnerId: userData.id,
        });

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

    const nextIsFreePlanUsed = isFreePlanUsed || isPlanFree(plan.id);

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

    const onboardingData = localStorage.getItem("onboarding_data");

    if (onboardingData) {
      setIsCreatingAccount(true);
      try {
        const parsedData = JSON.parse(onboardingData);

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

  const handleCardClick = (key: string) => {
    const plan = activePlans[key];
    const variant = getActiveVariant(plan);

    if (plan.contactSales) {
      const text = `Hi, I'm interested in PetPooja + Menuthere`;
      window.open(`https://wa.me/918590115462?text=${encodeURIComponent(text)}`, "_blank");
      return;
    }

    handlePlanClick({
      ...variant,
      name: plan.title,
      description: plan.description,
      period_days:
        variant.type === "free" ? -1 : variant.type === "monthly" ? 30 : 365,
    });
  };

  const bundleFeatures = [
    {
      icon: UtensilsCrossed,
      title: "Digital Menu",
      subtitle: "QR Code & Online",
      description:
        "Beautiful digital menu with QR codes, unlimited items, real-time availability, and Google sync.",
    },
    {
      icon: Globe,
      title: "Delivery Website",
      subtitle: "with Petpooja POS Integration",
      description:
        "A fully branded delivery website synced with your Petpooja POS. Orders flow directly into your kitchen.",
    },
    {
      icon: LayoutGrid,
      title: "Table Ordering System",
      subtitle: "Dine-in Self Service",
      description:
        "Let customers scan, order, and pay right from their table. Orders go straight to your kitchen.",
    },
    {
      icon: Smartphone,
      title: "Customer Ordering App",
      subtitle: "Play Store & App Store",
      description:
        "Your own branded mobile app for customers to browse, order, and reorder from their phone.",
    },
    {
      icon: Truck,
      title: "Delivery Driver App",
      subtitle: "with Live Tracking",
      description:
        "Dedicated app for your delivery drivers with real-time GPS tracking visible to customers.",
    },
    {
      icon: Link2,
      title: "Petpooja Integration",
      subtitle: "POS Sync",
      description:
        "Sync menu, store on/off, discounts and offers syncing — all connected directly with your Petpooja POS.",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Automation",
      subtitle: "Order Updates & Marketing",
      description:
        "Automated order confirmations, delivery updates, and promotional messages via WhatsApp.",
    },
  ];

  const planKeys = Object.keys(activePlans);

  return (
    <>
      <UpgradeSuccessModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          router.push("/admin-v2");
        }}
        planName={upgradedPlanName}
        features={upgradedPlanFeatures}
      />
      <section className="bg-[#fcfbf7]" id="pricing">
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

        {isIndia ? (
          <>
            {/* ── India: Header ── */}
            <div className="max-w-3xl mx-auto px-5 pt-28 md:pt-36 pb-10 md:pb-14 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
                Everything your restaurant needs to grow.
              </h1>
              <p className="text-sm text-stone-500 mt-3 max-w-md mx-auto leading-relaxed">
                Flexible pricing options to match your business needs. No hidden fees, cancel anytime.
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-stone-200" />

            {/* ── India: Plan Cards ── */}
            <div className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto px-5 py-12 md:py-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
                {planKeys.map((key) => {
                  const plan = activePlans[key];
                  const variant = getActiveVariant(plan);
                  const isPopular = plan.popular;
                  const isEnterprise = plan.contactSales;
                  const isCurrent = currentPlanId === variant.id;

                  return (
                    <div
                      key={key}
                      className={cn(
                        "relative rounded-2xl bg-white flex flex-col p-6 md:p-7",
                        isPopular
                          ? "border-2 border-orange-600/50"
                          : "border border-stone-200",
                      )}
                    >
                      {isPopular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold bg-orange-600 text-white">
                          Most Popular
                        </span>
                      )}

                      <h3 className="text-xl font-bold text-stone-900">{plan.title}</h3>
                      <p className="text-sm text-stone-500 mt-1 mb-5">{plan.description}</p>

                      <div className="flex items-baseline gap-0.5 mb-6">
                        {isEnterprise ? (
                          <span className="text-3xl md:text-4xl font-bold text-stone-900">Custom</span>
                        ) : (
                          <>
                            <span className="text-3xl md:text-4xl font-bold text-stone-900">
                              {currencySymbol}{variant.price}
                            </span>
                            <span className="text-sm text-stone-400 font-medium">/month</span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 mb-7 flex-1">
                        {plan.features.map((feature, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className="mt-0.5 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3 text-green-600" />
                            </div>
                            <span className="text-sm text-stone-600">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleCardClick(key)}
                        disabled={isCurrent}
                        className={cn(
                          "w-full h-11 rounded-xl text-sm font-medium transition-colors",
                          isCurrent
                            ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                            : isPopular
                              ? "bg-orange-600 text-white hover:bg-orange-700"
                              : "bg-white text-orange-600 border border-orange-600/40 hover:bg-orange-50",
                        )}
                      >
                        {isCurrent
                          ? "Current Plan"
                          : isEnterprise
                            ? "Contact Sales"
                            : "Get Started"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-stone-200" />

            {/* ── India: Features ── */}
            <div className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto px-5 py-12 md:py-16">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-widest mb-6 md:mb-8">
                What&apos;s included
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {bundleFeatures.map((feature, i) => (
                  <div key={i} className="rounded-2xl border border-stone-200 bg-white p-6 md:p-7">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-orange-50 text-orange-600 text-sm font-semibold mb-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h4 className="text-lg md:text-xl font-bold text-stone-900 mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-stone-500 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── India: Bottom CTA ── */}
            <div className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto px-5 pb-12 md:pb-16">
              <div className="bg-orange-600 rounded-2xl py-10 md:py-12 px-6 text-center">
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">
                  Ready to grow your restaurant?
                </h3>
                <p className="text-orange-100 text-sm mb-6 max-w-sm mx-auto">
                  Get all the tools in one plan. Start today.
                </p>
                <button
                  onClick={() => handleCardClick("bundle")}
                  disabled={currentPlanId === "in_bundle_monthly"}
                  className={cn(
                    "rounded-full px-8 py-2.5 text-sm font-medium transition-colors",
                    currentPlanId === "in_bundle_monthly"
                      ? "bg-orange-400 text-orange-200 cursor-not-allowed"
                      : "bg-stone-900 text-white hover:bg-stone-800",
                  )}
                >
                  {currentPlanId === "in_bundle_monthly" ? "Current Plan" : "Get the Complete Bundle"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ── International: Header ── */}
            <div className="max-w-3xl mx-auto px-5 pt-28 md:pt-36 pb-10 md:pb-14 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] md:leading-[1.15] font-bold text-stone-900 tracking-tight">
                Choose Your Plan
              </h1>
              <p className="text-sm md:text-base text-stone-500 mt-3 max-w-lg mx-auto leading-relaxed">
                Flexible pricing options to match your business needs. All plans include WhatsApp integration and our core features.
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-stone-200" />

            {/* ── International: Plan Cards ── */}
            <div className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto px-5 py-12 md:py-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
                {planKeys.map((key) => {
                  const plan = activePlans[key];
                  const variant = getActiveVariant(plan);
                  const isPopular = plan.popular;
                  const isEnterprise = plan.contactSales;
                  const isCurrent = currentPlanId === variant.id;

                  return (
                    <div
                      key={key}
                      className={cn(
                        "relative rounded-2xl bg-white flex flex-col p-6 md:p-7",
                        isPopular
                          ? "border-2 border-orange-600/50"
                          : "border border-stone-200",
                      )}
                    >
                      {/* Popular badge */}
                      {isPopular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold bg-orange-600 text-white">
                          Most Popular
                        </span>
                      )}

                      {/* Title & description */}
                      <h3 className="text-xl font-bold text-stone-900">{plan.title}</h3>
                      <p className="text-sm text-stone-500 mt-1 mb-5">{plan.description}</p>

                      {/* Price */}
                      <div className="flex items-baseline gap-0.5 mb-6">
                        {isEnterprise ? (
                          <span className="text-3xl md:text-4xl font-bold text-stone-900">Custom</span>
                        ) : (
                          <>
                            <span className="text-3xl md:text-4xl font-bold text-stone-900">
                              {currencySymbol}{variant.price}
                            </span>
                            <span className="text-sm text-stone-400 font-medium">/month</span>
                          </>
                        )}
                      </div>

                      {/* Features */}
                      <div className="flex flex-col gap-3 mb-7 flex-1">
                        {plan.features.map((feature, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className="mt-0.5 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3 text-green-600" />
                            </div>
                            <span className="text-sm text-stone-600">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Button */}
                      <button
                        onClick={() => handleCardClick(key)}
                        disabled={isCurrent}
                        className={cn(
                          "w-full h-11 rounded-xl text-sm font-medium transition-colors",
                          isCurrent
                            ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                            : isPopular
                              ? "bg-orange-600 text-white hover:bg-orange-700"
                              : "bg-white text-orange-600 border border-orange-600/40 hover:bg-orange-50",
                        )}
                      >
                        {isCurrent
                          ? "Current Plan"
                          : isEnterprise
                            ? "Contact Sales"
                            : "Get Started"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default PricingSection;
