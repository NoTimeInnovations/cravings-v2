"use client";

import * as React from "react";
import { toast } from "sonner";

import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Partner, useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/**
 * Open / close the store, v3 styling.
 *
 * The WRITE is identical to admin-v2's AdminShopToggle — updatePartner →
 * revalidateTag → optimistic setState with rollback — and it must stay that
 * way. `revalidateTag` is the step that is easy to drop: the storefront is
 * ISR-cached per partner, so without it a customer's menu keeps taking orders
 * for up to a minute after the partner has closed.
 *
 * Two shapes, because the design draws them differently: the desktop header
 * pill carries a 34×19 track and a 15px knob; the mobile top-bar pill is a dot
 * and a label only, with no switch at all.
 */
export function StoreToggle({ compact = false }: { compact?: boolean }) {
  const { userData, setState } = useAuthStore();
  const [saving, setSaving] = React.useState(false);

  if (userData?.role !== "partner") return null;
  const partner = userData as Partner;
  // Absent means open — that is how the storefront reads it, and defaulting a
  // missing value to "closed" would show every partner a shut sign.
  const isOpen = partner.is_shop_open ?? true;

  const onToggle = async () => {
    if (saving) return;
    const next = !isOpen;
    setSaving(true);
    setState({ is_shop_open: next } as any);
    try {
      await updatePartner(partner.id, { is_shop_open: next });
      revalidateTag(partner.id);
      toast.success(next ? "Store is now Open" : "Store is now Closed");
    } catch (e) {
      console.error("[V3 StoreToggle] failed:", e);
      setState({ is_shop_open: !next } as any);
      toast.error("Couldn't update store status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={saving}
      data-tour="shop-toggle"
      aria-label={isOpen ? "Close the store" : "Open the store"}
      className={cn(
        "inline-flex items-center rounded-full border transition-colors disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-50 focus-visible:ring-offset-2 dark:ring-offset-zinc-950",
        isOpen
          ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950"
          : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800",
        compact ? "h-8 gap-1.5 px-[11px]" : "gap-[9px] py-1.5 pl-3 pr-2",
      )}
    >
      {/* Colour alone can't carry this — a red/green pill reads the same to a
          colourblind partner, so the state is spelled out beside the dot. */}
      <span
        className={cn(
          "h-[7px] w-[7px] shrink-0 rounded-full",
          isOpen ? "animate-pulse-dot bg-green-600" : "bg-zinc-400 dark:bg-zinc-500",
        )}
      />
      <span
        className={cn(
          "text-[12.5px] font-bold leading-none",
          isOpen ? "text-green-700 dark:text-green-400" : "text-zinc-500 dark:text-zinc-400",
        )}
      >
        {isOpen ? "Open" : "Closed"}
      </span>
      {!compact && (
        <span
          className={cn(
            "flex h-[19px] w-[34px] items-center rounded-full p-0.5 transition-colors",
            isOpen ? "justify-end bg-green-600" : "justify-start bg-zinc-300 dark:bg-zinc-600",
          )}
        >
          <span className="h-[15px] w-[15px] rounded-full bg-white" />
        </span>
      )}
    </button>
  );
}
