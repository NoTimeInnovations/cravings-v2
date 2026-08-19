"use client";

import * as React from "react";
import { toast } from "sonner";

import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { isDiscountBlockedWithOffers, isDiscountStackingEnabled } from "@/lib/discountUtils";
import { useAuthStore, type Partner } from "@/store/authStore";
import { V3Card } from "../ui/primitives";
import { SubViewHeader, ToggleRow } from "./kit";

/**
 * Discount settings — the two partner-level rules that decide how codes behave
 * when a cart qualifies for more than one deal.
 *
 * Both live inside the shared `delivery_rules` JSON blob (delivery pricing,
 * round-off, parcel charges all share it), so every write is read-modify-write:
 * replacing the blob wholesale from here would wipe the delivery settings.
 */
export function DiscountRules({ onBack }: { onBack: () => void }) {
  const { userData, setState } = useAuthStore();
  const partner = userData as Partner | undefined;
  const rules = (partner as any)?.delivery_rules;

  const [stacking, setStacking] = React.useState(false);
  const [excludeOffers, setExcludeOffers] = React.useState(false);
  const [savingStacking, setSavingStacking] = React.useState(false);
  const [savingExclude, setSavingExclude] = React.useState(false);

  React.useEffect(() => {
    setStacking(isDiscountStackingEnabled(rules));
    setExcludeOffers(isDiscountBlockedWithOffers(rules));
  }, [rules]);

  const saveRule = async (
    key: "discount_stacking" | "discount_excludes_offers",
    value: boolean,
    revert: () => void,
    setBusy: (b: boolean) => void,
    message: string,
  ) => {
    if (!partner?.id) return;
    setBusy(true);
    try {
      const next = { ...((rules as Record<string, any>) || {}), [key]: value };
      await updatePartner(partner.id, { delivery_rules: next } as any);
      revalidateTag(partner.id);
      setState({ delivery_rules: next } as any);
      toast.success(message);
    } catch (e) {
      console.error("Failed to save discount rule:", e);
      revert();
      toast.error("Could not save that setting");
    } finally {
      setBusy(false);
    }
  };

  const status = [
    stacking ? "Discounts stack" : "One discount per bill",
    excludeOffers ? "never mixed with offers" : "offer items are simply skipped",
  ].join(" · ");

  return (
    <div className="flex flex-col">
      <SubViewHeader title="Discount settings" subtitle={status} onBack={onBack} />

      <div className="flex max-w-[760px] flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <div className="px-4 text-[13px] font-normal leading-relaxed text-zinc-500 dark:text-zinc-400 lg:px-0">
          How your codes behave when a cart qualifies for more than one deal. These apply to every
          discount, not just one code.
        </div>

        <V3Card className="px-4 pb-2 pt-1">
          <div className="pt-3 text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
            Stacking rules
          </div>
          <ToggleRow
            title="Allow multiple discounts on one order"
            description="Off: one discount per bill, and adding another replaces it. On: they stack and subtract together. Counter (POS) only — online checkout always takes a single discount."
            checked={stacking}
            disabled={savingStacking}
            onChange={(v) => {
              const previous = stacking;
              setStacking(v);
              saveRule(
                "discount_stacking",
                v,
                () => setStacking(previous),
                setSavingStacking,
                v ? "Multiple discounts allowed" : "One discount per order",
              );
            }}
          />
          <ToggleRow
            title="Never mix discounts with offers"
            description="Off: an offer item is left out of the discount, so the rest of a mixed cart still gets it. On: the discount is refused whenever the cart holds any offer item."
            checked={excludeOffers}
            disabled={savingExclude}
            last
            onChange={(v) => {
              const previous = excludeOffers;
              setExcludeOffers(v);
              saveRule(
                "discount_excludes_offers",
                v,
                () => setExcludeOffers(previous),
                setSavingExclude,
                v
                  ? "Discounts blocked on carts with offers"
                  : "Discounts allowed alongside offers",
              );
            }}
          />
        </V3Card>
      </div>
    </div>
  );
}
