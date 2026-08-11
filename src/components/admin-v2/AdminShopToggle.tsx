"use client";

import * as React from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Partner, useAuthStore } from "@/store/authStore";

/**
 * Open / close the store from the dashboard header.
 *
 * Same write as Settings → General → Store Status (GeneralSettings'
 * handleShopToggle): updatePartner → revalidateTag → setState. Duplicated
 * deliberately rather than lifted — the settings card owns a whole form with its
 * own save lifecycle, and importing it here would drag that in for one boolean.
 * The three steps are all that matter and are asserted by the toast either way.
 *
 * `revalidateTag` is the step that is easy to miss: the storefront is ISR-cached
 * per partner, so without it the customer's menu keeps taking orders for up to a
 * minute after the partner has closed.
 *
 * State is optimistic and rolls back on failure. A partner closing up flips this
 * and walks away — leaving the switch showing "Closed" after a failed write
 * would tell them the shop is shut while it is still taking orders.
 */
export function AdminShopToggle() {
    const { userData, setState } = useAuthStore();
    const [saving, setSaving] = React.useState(false);

    if (userData?.role !== "partner") return null;
    const partner = userData as Partner;
    // Absent means open: that is how the storefront reads it, and defaulting a
    // missing value to "closed" here would show every partner a shut sign.
    const isOpen = partner.is_shop_open ?? true;

    const onToggle = async (checked: boolean) => {
        if (saving) return;
        setSaving(true);
        setState({ is_shop_open: checked } as any);
        try {
            await updatePartner(partner.id, { is_shop_open: checked });
            revalidateTag(partner.id);
            toast.success(checked ? "Store is now Open" : "Store is now Closed");
        } catch (e) {
            console.error("[ShopToggle] failed:", e);
            setState({ is_shop_open: !checked } as any);
            toast.error("Couldn't update store status");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors ${
                isOpen
                    ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20"
                    : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20"
            }`}
            data-tour="shop-toggle"
        >
            {/* Colour alone can't carry this — a red/green switch reads the same
                to a colourblind partner, so the state is also spelled out. */}
            <span className="relative flex h-1.5 w-1.5 shrink-0">
                {!isOpen && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                )}
                <span
                    className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                        isOpen ? "bg-green-500" : "bg-red-500"
                    }`}
                />
            </span>
            <span
                className={`text-[11px] font-semibold leading-none ${
                    isOpen
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-700 dark:text-red-400"
                }`}
            >
                {isOpen ? "Open" : "Closed"}
            </span>
            <Switch
                checked={isOpen}
                disabled={saving}
                onCheckedChange={onToggle}
                aria-label={isOpen ? "Close the store" : "Open the store"}
                className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
            />
        </div>
    );
}
