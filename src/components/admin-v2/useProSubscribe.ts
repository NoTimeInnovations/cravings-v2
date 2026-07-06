"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import {
  createSubscriptionAction,
  verifySubscriptionAction,
} from "@/app/actions/razorpay_payments";
import plansData from "@/data/plans.json";
import { PRO_PLAN_ID } from "@/lib/subscriptionConfig";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PRO_PLAN = (plansData.india as any[]).find((p) => p.id === PRO_PLAN_ID);

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(
      'script[src*="checkout.razorpay.com"]',
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      // If it already loaded, window.Razorpay is set; the guard above catches it.
      if (window.Razorpay) resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * One-click subscribe/renew for the ₹3000 Pro plan. Creates the Razorpay
 * subscription (autopay), opens checkout, verifies, and syncs the auth store on
 * success so the gate re-evaluates immediately.
 */
export function useProSubscribe(onSuccess?: () => void) {
  const { userData } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const subscribe = useCallback(async () => {
    if (!userData || userData.role !== "partner") return;
    if (!PRO_PLAN) {
      toast.error("Plan unavailable. Please contact support.");
      return;
    }
    setIsLoading(true);
    try {
      const ready = await loadRazorpayScript();
      if (!ready || !window.Razorpay) {
        toast.error("Payment gateway is loading. Please try again.");
        setIsLoading(false);
        return;
      }

      const created = await createSubscriptionAction(
        PRO_PLAN_ID,
        userData.id,
        (userData as any).store_name,
      );
      if (!created.success || !created.subscription_id) {
        toast.error("Could not start subscription. Please contact support.");
        setIsLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: created.key_id,
        subscription_id: created.subscription_id,
        name: "Menuthere App",
        description: `Subscribe to ${PRO_PLAN.name} (${PRO_PLAN.price}/month)`,
        // Attach partner metadata to the payment so it's identifiable in the
        // Razorpay dashboard (subscription notes cover renewals via the webhook).
        notes: {
          partner_id: userData.id,
          store_name: (userData as any).store_name || "",
          plan_id: PRO_PLAN.id,
          plan_name: PRO_PLAN.name,
          email: (userData as any).email || "",
          phone: (userData as any).phone || "",
        },
        handler: async (res: any) => {
          try {
            const verifyRes = await verifySubscriptionAction(
              res.razorpay_payment_id,
              res.razorpay_subscription_id,
              res.razorpay_signature,
              userData.id,
              {
                id: PRO_PLAN.id,
                name: PRO_PLAN.name,
                price: PRO_PLAN.price,
                period_days: PRO_PLAN.period_days,
                features_enabled: PRO_PLAN.features_enabled,
              },
              (userData as any).feature_flags,
            );
            if (verifyRes.success) {
              useAuthStore.setState({
                userData: {
                  ...userData,
                  feature_flags:
                    verifyRes.feature_flags || (userData as any).feature_flags,
                  subscription_details:
                    verifyRes.subscription_details ||
                    (userData as any).subscription_details,
                } as any,
              });
              toast.success("Subscription active. Thank you!");
              onSuccess?.();
            } else {
              toast.error(
                "Payment verification failed. Please contact support.",
              );
            }
          } finally {
            setIsLoading(false);
          }
        },
        prefill: {
          name: (userData as any).name || "",
          email: (userData as any).email || "",
          contact: (userData as any).phone || "",
        },
        theme: { color: "#EA580C" },
        // Release the loading state if the customer closes the checkout modal.
        modal: { ondismiss: () => setIsLoading(false) },
      });

      rzp.on("payment.failed", (res: any) => {
        toast.error(res?.error?.description || "Payment failed");
        setIsLoading(false);
      });
      rzp.open();
    } catch (e) {
      console.error("Pro subscribe error", e);
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }, [userData, onSuccess]);

  return { subscribe, isLoading, plan: PRO_PLAN };
}
