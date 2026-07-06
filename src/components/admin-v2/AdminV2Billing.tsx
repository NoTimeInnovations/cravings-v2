"use client";

import { useEffect, useState } from "react";
import { SubscriptionStatus } from "./SubscriptionStatus";
import { Partner, useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Receipt, Crown, CalendarClock } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { useProSubscribe } from "./useProSubscribe";

// Guard against null / malformed date strings in stored payment records —
// parseISO returns an Invalid Date (which is truthy) and format() would throw.
function safeFmt(value: string | null | undefined, fmt: string): string | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? format(d, fmt) : null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_details: {
    plan?: { name?: string; id?: string };
    status?: string;
    startDate?: string;
    expiryDate?: string;
  };
  created_at: string;
}

const GET_PARTNER_PAYMENTS = `
  query GetPartnerPayments($partner_id: uuid!) {
    partner_payments(
      where: { partner_id: { _eq: $partner_id } }
      order_by: { created_at: desc }
      limit: 20
    ) {
      id
      amount
      payment_details
      created_at
    }
  }
`;

function BillingSummary() {
  const { userData } = useAuthStore();
  const { gate, loading, refresh } = useSubscriptionGate();
  const { subscribe, isLoading } = useProSubscribe(refresh);

  // Only partners on the ₹3000 model — the Pro plan (in_pro_monthly) or the
  // 100-order trial that leads to it (in_trial_100) — see the Pro plan card /
  // usage. Legacy-plan and free-plan partners don't (they keep the generic
  // SubscriptionStatus card below).
  if (!gate.isGated) return null;

  const sub =
    userData?.role === "partner" ? userData.subscription_details : undefined;
  const startDate = sub?.startDate ? parseISO(sub.startDate) : null;

  const usagePercent =
    gate.isTrial && gate.limit
      ? Math.min(100, ((gate.usage ?? 0) / gate.limit) * 100)
      : 0;

  // Show a subscribe/renew CTA unless they're on an active (not lapsed) Pro plan.
  const proActive = gate.isPro && gate.state === "ok";
  const showCta = !proActive;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-orange-600" />
          Current Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-lg font-bold">
            {gate.planName || "Free"}
          </span>
          {gate.isPro && (
            <Badge
              className={
                gate.state === "ok"
                  ? "bg-green-600"
                  : gate.state === "paid_warning"
                    ? "bg-orange-500"
                    : "bg-red-600"
              }
            >
              {(gate.subStatus || "active").toUpperCase()}
            </Badge>
          )}
          {gate.isTrial && <Badge className="bg-orange-500">FREE TRIAL</Badge>}
        </div>

        {/* Trial usage */}
        {gate.isTrial && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Trial orders used</span>
              <span>
                {loading && gate.usage == null ? (
                  <Loader2 className="h-4 w-4 animate-spin inline" />
                ) : (
                  `${gate.usage ?? 0} / ${gate.limit}`
                )}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {gate.remaining != null && gate.remaining > 0
                ? `${gate.remaining} free orders remaining`
                : "Free trial limit reached — subscribe to keep taking orders."}
            </p>
          </div>
        )}

        {/* Pro next billing */}
        {gate.isPro && gate.expiryDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            {gate.state === "ok" ? (
              <span>Next billing on {format(gate.expiryDate, "PPP")}</span>
            ) : (
              <span>
                Access ends on {format(gate.expiryDate, "PPP")} — renew to
                continue
              </span>
            )}
          </div>
        )}

        {startDate && (
          <p className="text-xs text-muted-foreground">
            Member since {format(startDate, "PPP")}
          </p>
        )}

        {showCta && (
          <Button
            onClick={subscribe}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {gate.isPro ? "Renew Pro — ₹3000/mo" : "Subscribe to Pro — ₹3000/mo"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminV2Billing() {
  const { userData } = useAuthStore();
  const { gate } = useSubscriptionGate();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-fetch when the subscription changes (e.g. after a successful Pro subscribe
  // via useProSubscribe, which updates subscription_details) so a freshly recorded
  // payment shows without a manual reload. Views are kept-mounted, so a plain
  // [userData.id] dependency would otherwise never re-run here.
  const subSig = `${(userData as any)?.subscription_details?.status ?? ""}|${
    (userData as any)?.subscription_details?.expiryDate ?? ""
  }|${(userData as any)?.subscription_details?.razorpay_subscription_id ?? ""}`;

  useEffect(() => {
    if (!userData?.id) return;
    const fetchPayments = async () => {
      try {
        const res = await fetchFromHasura(GET_PARTNER_PAYMENTS, {
          partner_id: userData.id,
        });
        setPayments(res?.partner_payments || []);
      } catch (e) {
        console.error("Failed to fetch payment history", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id, subSig]);

  const currency = (userData as Partner)?.currency || "₹";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Billing</h1>

      <BillingSummary />
      {/* The generic status card is redundant for gated-model partners (the
          Current Plan summary above already covers it) — only show it for
          non-model partners (free / legacy plans). */}
      {!gate.isGated && <SubscriptionStatus />}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payment history yet
            </p>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {payment.payment_details?.plan?.name || "Plan Payment"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {safeFmt(payment.created_at, "MMM d, yyyy 'at' h:mm a") ||
                        "—"}
                    </p>
                    {safeFmt(payment.payment_details?.expiryDate, "MMM d, yyyy") && (
                      <p className="text-xs text-muted-foreground">
                        Valid until{" "}
                        {safeFmt(
                          payment.payment_details?.expiryDate,
                          "MMM d, yyyy",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">
                      {currency}
                      {(payment.amount / 100).toLocaleString()}
                    </p>
                    <Badge
                      variant="default"
                      className="bg-green-600 text-[10px]"
                    >
                      Paid
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
