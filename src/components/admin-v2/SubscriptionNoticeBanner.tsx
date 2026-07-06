"use client";

import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import type { SubscriptionGate } from "@/lib/subscriptionAccess";
import { useProSubscribe } from "./useProSubscribe";

/**
 * Persistent notice shown at the top of admin-v2 when the partner is on the gated
 * model and approaching / past a limit. Never shown for "ok".
 */
export function SubscriptionNoticeBanner({
  gate,
  onRenewed,
}: {
  gate: SubscriptionGate;
  onRenewed?: () => void;
}) {
  const { subscribe, isLoading } = useProSubscribe(onRenewed);

  if (gate.state === "ok") return null;

  let tone: "warn" | "danger" = "warn";
  let title = "";
  let message = "";

  switch (gate.state) {
    case "trial_warning":
      tone = "warn";
      title = "Free trial ending soon";
      message = `You've used ${gate.usage}/${gate.limit} free orders. Subscribe to the Pro plan (₹3000/mo) to keep taking orders after your trial.`;
      break;
    case "trial_grace":
      tone = "danger";
      title = "Free trial limit reached";
      message = `You've used all ${gate.limit} free orders. Your dashboard will be locked ${
        gate.blockAt ? formatDistanceToNow(gate.blockAt, { addSuffix: true }) : "soon"
      }${gate.blockAt ? ` (${format(gate.blockAt, "MMM d, h:mm a")})` : ""}. Subscribe now to avoid interruption — your customer menu stays online.`;
      break;
    case "trial_blocked":
      tone = "danger";
      title = "Dashboard locked — trial ended";
      message =
        "Your free trial has ended. Subscribe to the Pro plan (₹3000/mo) or contact support to restore dashboard access. Your customer menu is still live.";
      break;
    case "paid_warning":
      tone = "warn";
      title = "Auto-payment stopped";
      message = `Your Pro plan won't renew automatically. Access continues until ${
        gate.expiryDate ? format(gate.expiryDate, "MMM d, yyyy") : "your expiry date"
      }. Renew to avoid losing dashboard access.`;
      break;
    case "paid_blocked":
      tone = "danger";
      title = "Subscription expired";
      message =
        "Your Pro subscription has ended. Renew (₹3000/mo) or contact support to restore dashboard access. Your customer menu is still live.";
      break;
  }

  const Icon = gate.state === "trial_grace" || gate.state === "paid_warning" ? Clock : AlertTriangle;

  return (
    <div
      className={
        tone === "danger"
          ? "mb-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4"
          : "mb-4 rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-4"
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-start gap-3">
          <Icon
            className={
              tone === "danger"
                ? "h-5 w-5 text-red-600 shrink-0 mt-0.5"
                : "h-5 w-5 text-orange-600 shrink-0 mt-0.5"
            }
          />
          <div>
            <p
              className={
                tone === "danger"
                  ? "font-semibold text-red-800 dark:text-red-300"
                  : "font-semibold text-orange-800 dark:text-orange-300"
              }
            >
              {title}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
          </div>
        </div>
        <Button
          onClick={subscribe}
          disabled={isLoading}
          className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 self-start sm:self-auto"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {gate.isPro ? "Renew Now" : "Subscribe ₹3000/mo"}
        </Button>
      </div>
    </div>
  );
}
