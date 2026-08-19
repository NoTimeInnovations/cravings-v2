"use client";

import * as React from "react";
import {
  CalendarDays,
  Check,
  Loader2,
} from "lucide-react";
import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from "date-fns";

import { Partner, useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { useProSubscribe } from "@/components/admin-v2/useProSubscribe";
import { SUPPORT_WHATSAPP } from "@/lib/subscriptionConfig";
import plansData from "@/data/plans.json";

import { AdminV3Button, MiniProgress, StatusPill, V3Card } from "./ui/primitives";

/* ------------------------------------------------------------------- data */

interface PaymentRecord {
  id: string;
  amount: number;
  payment_details: {
    plan?: { name?: string; id?: string };
    status?: string;
    startDate?: string;
    expiryDate?: string;
  } | null;
  created_at: string;
}

// Same query admin-v2 Billing uses — do not diverge.
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

/** parseISO returns an Invalid Date (truthy) for junk — format() would throw. */
function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

function safeFmt(value: string | null | undefined, fmt: string): string | null {
  const d = safeDate(value);
  return d ? format(d, fmt) : null;
}

function planFromJson(planId: string | null | undefined) {
  if (!planId) return null;
  const all = [
    ...(plansData.india as any[]),
    ...(plansData.international as any[]),
  ];
  return all.find((p) => p.id === planId) || null;
}

/** "/month" | "/year" → the human phrasing the design uses. */
function renewalLabel(periodDays: number | undefined | null): string | null {
  if (periodDays == null || periodDays === -1) return null;
  if (periodDays >= 360) return "Renews yearly";
  if (periodDays >= 28) return "Renews monthly";
  return `Renews every ${periodDays} days`;
}

/* -------------------------------------------------------------- fragments */

function CardHead({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
      <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
        {title}
      </span>
      {children}
    </div>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}

function IncludedRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
        <Check size={9} strokeWidth={3} />
      </span>
      <span className="text-[12.5px] leading-snug text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------- plan card */

function PlanCard() {
  const { userData } = useAuthStore();
  const { gate, loading, refresh } = useSubscriptionGate();
  const { subscribe, isLoading } = useProSubscribe(refresh);

  const partner = userData?.role === "partner" ? (userData as Partner) : undefined;
  const sub = partner?.subscription_details;
  const planId = sub?.plan?.id ?? null;
  const jsonPlan = planFromJson(planId);

  const planName =
    gate.planName || sub?.plan?.name || jsonPlan?.name || "Free plan";
  const rawPrice: string | null = sub?.plan?.price ?? jsonPlan?.price ?? null;
  const pricePeriod: string = sub?.plan?.period ?? jsonPlan?.period ?? "";
  const price = rawPrice ? `${rawPrice}${pricePeriod}` : null;
  const periodDays: number | undefined =
    sub?.plan?.period_days ?? jsonPlan?.period_days;
  const features: string[] = Array.isArray(sub?.plan?.features)
    ? (sub!.plan.features as string[])
    : Array.isArray(jsonPlan?.features)
      ? (jsonPlan!.features as string[])
      : [];

  const expiry = gate.expiryDate ?? safeDate(sub?.expiryDate);
  const daysAway = expiry ? differenceInCalendarDays(expiry, new Date()) : null;

  // Status pill — mirrors the gate states admin-v2 badges.
  const statusTone: "green" | "amber" | "neutral" =
    gate.state === "ok"
      ? gate.isTrial
        ? "amber"
        : "green"
      : gate.state === "trial_warning" || gate.state === "trial_grace" || gate.state === "paid_warning"
        ? "amber"
        : "neutral";
  const statusLabel = gate.isTrial
    ? gate.state === "trial_blocked"
      ? "Trial over"
      : "Free trial"
    : gate.isPro
      ? gate.state === "ok"
        ? "Active"
        : gate.state === "paid_warning"
          ? "Autopay stopped"
          : "Lapsed"
      : (sub?.status || "active") === "active"
        ? "Active"
        : (sub?.status ?? "Inactive");

  // Only the ₹3000 model has a self-serve checkout. Everyone else changes plan
  // through support, exactly as in admin-v2.
  const proActive = gate.isPro && gate.state === "ok";
  const showCta = gate.isGated && !proActive;

  const trialUsage = gate.usage ?? 0;
  const trialLimit = gate.limit;
  const trialPct =
    trialLimit && trialLimit > 0
      ? Math.min(100, (trialUsage / trialLimit) * 100)
      : 0;

  return (
    <V3Card>
      <CardHead title="Your plan">
        <StatusPill tone={statusTone === "neutral" ? "outline" : statusTone}>
          <span
            className={[
              "mr-[5px] inline-block h-1.5 w-1.5 rounded-full",
              statusTone === "green"
                ? "bg-green-600"
                : statusTone === "amber"
                  ? "bg-amber-500"
                  : "bg-zinc-400",
            ].join(" ")}
          />
          {statusLabel}
        </StatusPill>
      </CardHead>

      <div className="flex flex-wrap items-start gap-x-5 gap-y-3.5 p-4">
        <div className="min-w-0 flex-[1_1_220px]">
          <div className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            {planName}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {price && <MetaPill>{price}</MetaPill>}
            {renewalLabel(periodDays) && (
              <MetaPill>{renewalLabel(periodDays)}</MetaPill>
            )}
          </div>

          {/* Trial plans have no charge date — they have an order allowance. */}
          {gate.isTrial && trialLimit != null ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                  Trial orders used
                </span>
                <span className="text-[12.5px] font-semibold leading-none tabular-nums text-zinc-950 dark:text-zinc-50">
                  {loading && gate.usage == null ? (
                    <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                  ) : (
                    `${trialUsage} / ${trialLimit}`
                  )}
                </span>
              </div>
              <MiniProgress value={trialPct} className="mt-2.5" animated={false} />
              <div className="mt-2 text-xs leading-snug text-zinc-400 dark:text-zinc-500">
                {gate.remaining != null && gate.remaining > 0
                  ? `${gate.remaining} free orders remaining`
                  : "Free trial limit reached — subscribe to keep taking orders."}
              </div>
            </div>
          ) : expiry ? (
            <div className="mt-2.5 flex items-center gap-[7px]">
              <CalendarDays
                size={14}
                strokeWidth={1.8}
                className="flex-none text-zinc-400 dark:text-zinc-500"
              />
              <span className="text-xs leading-snug text-zinc-400 dark:text-zinc-500">
                {daysAway != null && daysAway < 0
                  ? `Expired ${format(expiry, "d MMMM yyyy")} · ${Math.abs(daysAway)} days ago`
                  : `Next charge ${format(expiry, "d MMMM yyyy")}${
                      daysAway != null ? ` · ${daysAway} days away` : ""
                    }`}
              </span>
            </div>
          ) : (
            <div className="mt-2.5 flex items-center gap-[7px]">
              <CalendarDays
                size={14}
                strokeWidth={1.8}
                className="flex-none text-zinc-400 dark:text-zinc-500"
              />
              <span className="text-xs leading-snug text-zinc-400 dark:text-zinc-500">
                No renewal date on this plan
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-[0_1_200px] flex-col gap-[7px]">
          <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
            Included
          </div>
          {features.length > 0 ? (
            features.map((f) => <IncludedRow key={f} label={f} />)
          ) : (
            <div className="text-[12.5px] leading-snug text-zinc-400 dark:text-zinc-500">
              No feature list recorded for this plan.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-[9px] border-t border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40 lg:rounded-b-xl">
        <span className="min-w-0 flex-[1_1_180px] text-xs leading-[1.5] text-zinc-400 dark:text-zinc-500">
          Cancel any time — your menu stays live until the paid period ends.
        </span>
        <AdminV3Button
          variant="small"
          className="flex-none"
          onClick={() =>
            window.open(
              `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
                "Hi, I'd like to change my Menuthere plan.",
              )}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          Change plan
        </AdminV3Button>
        {showCta && (
          <AdminV3Button
            variant="strong"
            className="h-8 flex-none px-3 text-[12.5px]"
            disabled={isLoading}
            onClick={subscribe}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {gate.isPro ? "Renew Pro — ₹3000/mo" : "Subscribe to Pro — ₹3000/mo"}
          </AdminV3Button>
        )}
      </div>
    </V3Card>
  );
}

/* ---------------------------------------------------------- payments card */

function PaymentsCard({
  payments,
  loading,
  currency,
  email,
}: {
  payments: PaymentRecord[];
  loading: boolean;
  currency: string;
  email?: string;
}) {
  return (
    <V3Card>
      <CardHead title="Payments">
        {!loading && (
          <StatusPill tone="outline">
            {payments.length === 1 ? "1 receipt" : `${payments.length} receipts`}
          </StatusPill>
        )}
      </CardHead>

      {loading ? (
        <div className="flex justify-center px-4 py-9">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400 dark:text-zinc-500" />
        </div>
      ) : payments.length === 0 ? (
        <div className="px-4 py-9 text-center text-[13px] leading-snug text-zinc-400 dark:text-zinc-500">
          No payments yet. Charges show up here the moment they're collected.
        </div>
      ) : (
        payments.map((p, i) => {
          const paidOn = safeFmt(p.created_at, "d MMM yyyy");
          const paidAt = safeFmt(p.created_at, "h:mm a");
          const coversTo = safeFmt(p.payment_details?.expiryDate, "d MMM yyyy");
          const meta = [
            paidOn && paidAt ? `${paidOn} · ${paidAt}` : paidOn || "—",
            coversTo ? `covers to ${coversTo}` : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <div
              key={p.id}
              className={[
                "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-[13px] transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                i < payments.length - 1
                  ? "border-b border-zinc-100 dark:border-zinc-800"
                  : "",
              ].join(" ")}
            >
              <div className="min-w-0 flex-[1_1_220px]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="text-[13px] font-medium leading-snug text-zinc-950 dark:text-zinc-50">
                    {p.payment_details?.plan?.name || "Plan payment"}
                  </span>
                  <StatusPill tone="green">
                    {p.payment_details?.status === "failed" ? "Failed" : "Paid"}
                  </StatusPill>
                </div>
                <div className="mt-[3px] text-xs leading-snug text-zinc-400 dark:text-zinc-500">
                  {meta}
                </div>
              </div>
              <span className="flex-none text-sm font-semibold leading-none tabular-nums text-zinc-950 dark:text-zinc-50">
                {currency}
                {(p.amount / 100).toLocaleString()}
              </span>
            </div>
          );
        })
      )}

      <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3 text-xs leading-[1.5] text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500 lg:rounded-b-xl">
        Downloadable receipts aren&apos;t available here yet — message support and
        we&apos;ll email a copy
        {email ? (
          <>
            {" "}
            to{" "}
            <span translate="no" className="notranslate">
              {email}
            </span>
          </>
        ) : null}
        .
      </div>
    </V3Card>
  );
}

/* ------------------------------------------------------------------ screen */

export function AdminV3Billing() {
  const { userData } = useAuthStore();
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  const partner = userData?.role === "partner" ? (userData as Partner) : undefined;
  const currency = partner?.currency || "₹";

  // Re-fetch when the subscription changes (e.g. right after a successful Pro
  // subscribe) so a freshly recorded payment appears without a reload — v3
  // views stay mounted, so a plain [id] dependency would never re-run.
  const sub = partner?.subscription_details as any;
  const subSig = `${sub?.status ?? ""}|${sub?.expiryDate ?? ""}|${
    sub?.razorpay_subscription_id ?? ""
  }`;

  React.useEffect(() => {
    const pid = userData?.id;
    if (!pid) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchFromHasura(GET_PARTNER_PAYMENTS, {
          partner_id: pid,
        });
        if (!cancelled) setPayments(res?.partner_payments || []);
      } catch (e) {
        console.error("Failed to fetch payment history", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id, subSig]);

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      <PlanCard />
      <PaymentsCard
        payments={payments}
        loading={loading}
        currency={currency}
        email={partner?.email}
      />
    </div>
  );
}

export default AdminV3Billing;
