"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import PricingCard, { PlanCard } from "@/components/international/PricingCard";
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
  const [isAnnual, setIsAnnual] = useState(false);
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
    free: {
      id: "free",
      title: "Free",
      description: "Get your digital menu online for free, forever",
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
          name: "Free",
          price: "0",
          period: "forever",
          billed: "No billing required",
          type: "free",
        },
      ],
    },
    digital: {
      id: "digital",
      title: "Standard",
      description: "Essential, contactless digital menu for your restaurant",
      popular: true,
      features: [
        "Digital menu",
        "Unlimited items",
        "QR code generation",
        "Unlimited edits",
        "Manage availability",
        "Manage priority",
        "Google menu sync",
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
          rz_plan_id: getRzPlanId("in_digital_monthly"),
        },
        {
          id: "in_digital",
          name: "Digital Menu Yearly",
          price: "2999",
          period: "/year",
          billed: "Billed annually",
          type: "yearly",
          savings: "Save ₹589",
          rz_plan_id: getRzPlanId("in_digital"),
        },
      ],
    },
    petpooja: {
      id: "petpooja",
      title: "With Petpooja Integration",
      description: "Digital menu with Petpooja POS integration",
      contactSales: true,
      features: [
        "Everything in Digital Menu",
        "Petpooja POS integration",
        "Auto menu sync from Petpooja",
        "Real-time order push to Petpooja",
        "Priority support",
      ],
      variants: [
        {
          id: "in_digital_petpooja_monthly",
          name: "Digital Menu + Petpooja Monthly",
          price: "999",
          period: "/month",
          billed: "Billed monthly",
          type: "monthly",
          rz_plan_id: getRzPlanId("in_digital_petpooja_monthly"),
        },
        {
          id: "in_digital_petpooja",
          name: "Digital Menu + Petpooja Yearly",
          price: "9999",
          period: "/year",
          billed: "Billed annually",
          type: "yearly",
          savings: "Save ₹1,989",
          rz_plan_id: getRzPlanId("in_digital_petpooja"),
        },
      ],
    },
  };

  const internationalPlans: Record<string, PlanCard> = {
    free: {
      id: "free",
      title: "Free",
      description: "Get your digital menu online for free, forever",
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
          name: "Free",
          price: "0",
          period: "forever",
          billed: "No billing required",
          type: "free",
        },
      ],
    },
    digital: {
      id: "digital",
      title: "Standard",
      description: "Essential digital menu for your restaurant",
      popular: true,
      features: [
        "Digital menu",
        "Unlimited items",
        "QR code generation",
        "Unlimited edits",
        "Manage availability",
        "Manage priority",
        "Google menu sync",
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
          rz_plan_id: getRzPlanId("int_digital_monthly"),
        },
        {
          id: "int_digital",
          name: "Digital Menu Yearly",
          price: "190",
          period: "/year",
          billed: "Billed annually",
          type: "yearly",
          savings: "Save $38",
          rz_plan_id: getRzPlanId("int_digital"),
        },
      ],
    },
  };

  const activePlans = isIndia ? indiaPlans : internationalPlans;
  const currencySymbol = isIndia ? "₹" : "$";

  const isPlanFree = (pid: string) => ["in_trial", "free_plan"].includes(pid);
  const isFreePlanUsed = (userData as any)?.subscription_details?.isFreePlanUsed;
  const currentPlanId = (userData as any)?.subscription_details?.plan?.id;

  // Get the active variant based on toggle
  const getActiveVariant = (plan: PlanCard) => {
    if (plan.variants.length === 1) return plan.variants[0];
    return isAnnual
      ? plan.variants.find((v) => v.type === "yearly") || plan.variants[1]
      : plan.variants.find((v) => v.type === "monthly") || plan.variants[0];
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
    <section className="py-8 md:py-24 bg-[#fcfbf7]" id="pricing">
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

      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {!hideHeader && (
          <div className="text-center mb-8 md:mb-14">
            <h2 className="text-lg md:text-4xl font-semibold text-stone-900 mb-2 md:mb-4 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xs md:text-lg text-stone-500">
              Choose the plan that fits your growth.
            </p>
          </div>
        )}

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-3 mb-8 md:mb-12">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              !isAnnual ? "text-stone-900" : "text-stone-400",
            )}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              isAnnual ? "bg-orange-600" : "bg-stone-300",
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                isAnnual ? "translate-x-6" : "translate-x-1",
              )}
            />
          </button>
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              isAnnual ? "text-stone-900" : "text-stone-400",
            )}
          >
            Save with annual
          </span>
        </div>

        {/* Cards */}
        <div
          className={cn(
            "grid gap-5 mx-auto",
            planKeys.length === 3
              ? "max-w-5xl grid-cols-1 md:grid-cols-3"
              : "max-w-3xl grid-cols-1 md:grid-cols-2",
          )}
        >
          {planKeys.map((key) => {
            const plan = activePlans[key];
            const variant = getActiveVariant(plan);

            return (
              <PricingCard
                key={key}
                plan={plan}
                variant={variant}
                currencySymbol={currencySymbol}
                isAnnual={isAnnual}
                isCurrent={currentPlanId === variant.id}
                onSelect={() => handleCardClick(key)}
              />
            );
          })}
        </div>

        <p className="mt-8 md:mt-10 text-center text-xs md:text-sm text-stone-400">
          All plans include our core features. Cancel anytime.
        </p>
      </div>
    </section>
    </>
  );
};

export default PricingSection;
