"use client";

import { Coins, Check } from "lucide-react";
import { MenuPrice } from "@/components/hotelDetail/MenuPrice";

interface LoyaltyRedeemCardProps {
  currency: string;
  /** Customer's available points balance at this partner. */
  balance: number;
  /** ₹ value of one point. */
  pointValue: number;
  /** Max points applicable to this order (bounded by balance + bill cap). */
  maxPoints: number;
  /** Minimum points needed to redeem. */
  minRedeemPoints: number;
  /** Currently-applied points. */
  points: number;
  /** ₹ discount of the applied points. */
  value: number;
  onChange: (points: number) => void;
  /** Optional: open the full points history. */
  onViewHistory?: () => void;
}

/**
 * Customer-facing "use loyalty points" control on the checkout sheet. Mobile-app
 * styled (chunky toggle row + slider), and inherits the modal's --pom-* theme vars
 * so it sits naturally above the bill. Parent owns the points state and the
 * authoritative server redemption — this is purely presentational.
 */
export function LoyaltyRedeemCard({
  currency,
  balance,
  pointValue,
  maxPoints,
  minRedeemPoints,
  points,
  value,
  onChange,
  onViewHistory,
}: LoyaltyRedeemCardProps) {
  if (!balance || balance <= 0) return null;

  const canRedeem = maxPoints >= Math.max(1, minRedeemPoints);
  const applied = points > 0;

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: applied ? "var(--pom-accent, #ea580c)" : "var(--pom-card-border, #e7e5e4)",
        background: applied ? "rgba(234,88,12,0.04)" : "var(--pom-card-bg, #fff)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(234,88,12,0.12)", color: "var(--pom-accent, #ea580c)" }}
          >
            <Coins className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-inherit text-[15px] leading-tight">Loyalty Points</div>
            <div className="text-xs" style={{ color: "var(--pom-text-muted)" }}>
              You have <span className="font-semibold">{balance.toLocaleString()}</span> pts
              {" "}(<MenuPrice currency={currency} amount={Math.round(balance * pointValue)} />)
            </div>
            {onViewHistory && (
              <button
                type="button"
                onClick={onViewHistory}
                className="text-xs font-medium mt-0.5 underline-offset-2 hover:underline"
                style={{ color: "var(--pom-accent, #ea580c)" }}
              >
                View history
              </button>
            )}
          </div>
        </div>

        {/* Toggle: apply max ⇄ clear */}
        <button
          type="button"
          disabled={!canRedeem}
          onClick={() => onChange(applied ? 0 : maxPoints)}
          aria-pressed={applied}
          className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-40 shrink-0"
          style={{ background: applied ? "var(--pom-accent, #ea580c)" : "#d6d3d1" }}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
              applied ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {!canRedeem && (
        <div className="mt-3 text-xs" style={{ color: "var(--pom-text-muted)" }}>
          {balance < minRedeemPoints
            ? `Earn at least ${minRedeemPoints} points to start redeeming.`
            : "Points can't be applied to this order."}
        </div>
      )}

      {applied && (
        <div className="mt-4 space-y-3">
          <input
            type="range"
            min={0}
            max={maxPoints}
            step={1}
            value={points}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-orange-600"
            style={{ accentColor: "var(--pom-accent, #ea580c)" }}
            aria-label="Points to redeem"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium text-inherit">
              <Check className="h-4 w-4" style={{ color: "var(--pom-accent, #ea580c)" }} />
              Using {points.toLocaleString()} pts
            </div>
            <div className="text-sm font-bold" style={{ color: "var(--pom-accent, #ea580c)" }}>
              − <MenuPrice currency={currency} amount={value.toFixed(2)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
