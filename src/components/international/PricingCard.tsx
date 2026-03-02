import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanVariant = {
  id: string;
  name: string;
  price: string;
  period: string;
  billed: string;
  type: string;
  rz_plan_id?: string;
  savings?: string;
};

export type PlanCard = {
  id: string;
  title: string;
  description: string;
  features: string[];
  popular?: boolean;
  variants: PlanVariant[];
};

type PricingCardProps = {
  plan: PlanCard;
  variant: PlanVariant;
  currencySymbol: string;
  isAnnual: boolean;
  isCurrent: boolean;
  onSelect: () => void;
};

export default function PricingCard({
  plan,
  variant,
  currencySymbol,
  isAnnual,
  isCurrent,
  onSelect,
}: PricingCardProps) {
  const isFree = variant.type === "free";
  const isPopular = plan.popular;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl flex flex-col p-6 md:p-7 transition-all",
        isPopular
          ? "border-2 border-orange-600/60 shadow-[0_0_0_1px_rgba(234,88,12,0.1)]"
          : "border border-stone-200",
      )}
    >
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-stone-500">{plan.title}</h3>
        {!isFree && (
          <span className="text-xs text-stone-400">
            {isAnnual
              ? `${currencySymbol}${Math.round(Number(variant.price) / 12)}/mo`
              : `${currencySymbol}${Number(variant.price) * 12}/yr`}
          </span>
        )}
      </div>

      {/* Price */}
      <div className="mt-4 mb-1">
        {isFree ? (
          <span className="text-4xl font-medium text-stone-900">Free</span>
        ) : (
          <div className="flex items-baseline gap-0.5">
            <span className="text-4xl font-medium text-stone-900">
              {currencySymbol}
              {variant.price}
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-stone-500 mb-3">
        {isFree
          ? "Free forever"
          : isAnnual
            ? "/year, billed annually"
            : "/month, billed monthly"}
      </p>

      {/* Savings badge */}
      {variant.savings && (
        <div className="mb-3 -mt-1">
          <span className="inline-block text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
            {variant.savings}
          </span>
        </div>
      )}

      {/* Description */}
      <p className="text-xs font-semibold text-stone-800 mb-4">
        {plan.description}
      </p>

      {/* Features */}
      <div className="flex flex-col gap-3 mb-7 flex-1">
        {plan.features.map((feature, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="mt-0.5 w-5 h-5 rounded-sm bg-stone-100 flex items-center justify-center shrink-0">
              <Check className="h-3 w-3 text-stone-600" />
            </div>
            <span className="text-sm text-stone-600">{feature}</span>
          </div>
        ))}
      </div>

      {/* Button */}
      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={cn(
          "w-full h-11 rounded-xl text-sm font-medium transition-colors",
          isCurrent
            ? "bg-stone-100 text-stone-400 cursor-not-allowed"
            : isPopular
              ? "bg-orange-600 text-white hover:bg-orange-700"
              : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50",
        )}
      >
        {isCurrent
          ? "Current Plan"
          : isFree
            ? "Get Free Menu"
            : "Get started"}
      </button>
    </div>
  );
}
