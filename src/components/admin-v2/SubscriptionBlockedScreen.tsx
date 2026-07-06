"use client";

import { Lock, Loader2, MessageCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import type { SubscriptionGate } from "@/lib/subscriptionAccess";
import { SUPPORT_WHATSAPP } from "@/lib/subscriptionConfig";
import { useProSubscribe } from "./useProSubscribe";

/**
 * Full-screen lock shown in the admin-v2 content area when access is blocked
 * (trial ended past grace, or Pro lapsed past expiry). The customer storefront is
 * NOT affected; this only covers the partner dashboard. The renew action lives
 * right here, so the "renew page" is always reachable.
 */
export function SubscriptionBlockedScreen({
  gate,
  onGoBilling,
}: {
  gate: SubscriptionGate;
  onGoBilling?: () => void;
}) {
  const { userData } = useAuthStore();
  const { subscribe, isLoading } = useProSubscribe();

  const storeName =
    userData?.role === "partner" ? (userData as any).store_name : "";
  const supportMsg = encodeURIComponent(
    `Hi, I need help with my Menuthere subscription${
      storeName ? ` for ${storeName}` : ""
    }.`,
  );
  const supportUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${supportMsg}`;

  const isTrial = gate.isTrial;

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
          <Lock className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          {isTrial ? "Your free trial has ended" : "Your subscription has ended"}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {isTrial
            ? "You've used all 100 free trial orders. Subscribe to the Pro plan to unlock your dashboard again."
            : "Your Pro subscription is no longer active. Renew to unlock your dashboard again."}{" "}
          Your customer menu is still online and taking orders.
        </p>

        <div className="mt-6 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50/60 dark:bg-orange-950/10 p-4">
          <p className="text-sm font-semibold text-foreground">Pro Plan</p>
          <p className="mt-1 text-3xl font-bold text-orange-600">
            ₹3000
            <span className="text-base font-medium text-muted-foreground">
              /month
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Digital Menu · Ordering · Delivery · WhatsApp · POS
          </p>
        </div>

        <Button
          onClick={subscribe}
          disabled={isLoading}
          className="mt-5 h-12 w-full bg-orange-600 hover:bg-orange-700 text-white text-base font-semibold"
        >
          {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {isTrial ? "Subscribe now" : "Renew subscription"}
        </Button>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <a href={supportUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full">
              <MessageCircle className="mr-2 h-4 w-4" />
              Contact support
            </Button>
          </a>
          <Button variant="outline" className="w-full" onClick={onGoBilling}>
            <Receipt className="mr-2 h-4 w-4" />
            Billing details
          </Button>
        </div>
      </div>
    </div>
  );
}
