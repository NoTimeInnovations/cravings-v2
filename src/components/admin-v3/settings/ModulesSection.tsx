"use client";

import * as React from "react";
import { toast } from "sonner";

import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { canEnableShiprocket } from "@/app/actions/shiprocketPartner";
import { getFeatures, revertFeatureToString, type FeatureFlags } from "@/lib/getFeatures";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { useAuthStore, type Partner } from "@/store/authStore";

import { Chip, EmptyBox, Note, SettingsCard, Toggle } from "./controls";

type FeatureKey = keyof FeatureFlags;

/**
 * Feature flags write the moment they are flipped — exactly as admin-v2 does.
 * They are a CSV string on the partner row, so a deferred Save would have to
 * hold a second copy of the whole set and could silently overwrite a flag
 * changed elsewhere (superadmin, the Shiprocket gate) in the meantime.
 */
export function useFeatureToggle() {
  const { userData, setState } = useAuthStore();
  const [busy, setBusy] = React.useState<string | null>(null);

  const features = getFeatures((userData as any)?.feature_flags || null);

  const toggle = React.useCallback(
    async (key: FeatureKey, enabled: boolean) => {
      if (!userData) return;

      // Growjet dispatch is distance-based; without a pin every booking fails.
      if (key === "growjet_delivery" && enabled) {
        const coords = (userData as Partner)?.geo_location?.coordinates;
        const valid =
          Array.isArray(coords) &&
          coords.length === 2 &&
          typeof coords[0] === "number" &&
          typeof coords[1] === "number" &&
          !(coords[0] === 0 && coords[1] === 0);
        if (!valid) {
          toast.error("Set your store coordinates before enabling Growjet delivery.");
          return;
        }
      }

      // Shiprocket "on" starts spending the partner's own money, so it refuses
      // to enable against credentials that have never passed a connection test.
      if (key === "shiprocket" && enabled) {
        try {
          const gate = await canEnableShiprocket((userData as any).id);
          if (!gate.ok) {
            toast.error(gate.reason || "Set up Shiprocket before enabling it.");
            return;
          }
        } catch {
          toast.error("Could not verify your Shiprocket setup. Try again.");
          return;
        }
      }

      const current = getFeatures((userData as any).feature_flags || null);
      const next: FeatureFlags = { ...current };
      next[key] = { ...current[key], enabled };
      const payload = revertFeatureToString(next);

      setBusy(key);
      try {
        await updatePartner((userData as any).id, { feature_flags: payload });
        await revalidateTag((userData as any).id);
        setState({ feature_flags: payload } as any);
        toast.success(`${enabled ? "Enabled" : "Disabled"} — reload to apply everywhere`, {
          action: { label: "Reload", onClick: () => window.location.reload() },
        });
      } catch (e) {
        console.error("[admin-v3 settings] feature toggle failed:", e);
        toast.error("Failed to update this feature");
      } finally {
        setBusy(null);
      }
    },
    [userData, setState],
  );

  return { features, toggle, busy };
}

const MODULES: { key: FeatureKey; name: string; note: string }[] = [
  { key: "ordering", name: "Online ordering", note: "Customers place orders from your menu." },
  { key: "delivery", name: "Delivery", note: "Delivery orders, riders and delivery pricing." },
  { key: "pos", name: "POS", note: "Bill at the counter from this dashboard." },
  { key: "captainordering", name: "Captain ordering", note: "Waiters take table orders on their own phone." },
  { key: "stockmanagement", name: "Stock", note: "Track item stock and auto-disable an item at zero." },
  { key: "purchasemanagement", name: "Purchases", note: "Log supplier purchases and inventory." },
  { key: "prebooking", name: "Prebooking", note: "Scheduled orders and dine-in table slots." },
  { key: "loyalty_points", name: "Loyalty points", note: "Points customers earn and redeem at your store." },
  { key: "storefront", name: "Website", note: "Your public website pages." },
  { key: "multiwhatsapp", name: "Multiple WhatsApp numbers", note: "A different number per area or branch." },
  { key: "whatsappnotifications", name: "WhatsApp notifications", note: "Order updates sent to customers on WhatsApp." },
  { key: "whatsappOrdering", name: "WhatsApp templates", note: "Write and submit message templates to Meta." },
  { key: "whatsappFlowTyping", name: "WhatsApp read receipts", note: "Blue tick and typing dots on the welcome reply." },
  { key: "whatsappcatalog", name: "WhatsApp catalogue", note: "Publish your menu as a WhatsApp catalogue." },
  { key: "porter_bridge", name: "Delivery bridge", note: "Dispatch to Porter or Rapido from your own accounts." },
  { key: "delivery_pool", name: "Menuthere delivery pool", note: "Hand orders to the shared rider network." },
  { key: "delivery_agent", name: "Delivery agents", note: "Dispatch through the delivery-agents hub." },
  { key: "growjet_delivery", name: "Growjet delivery", note: "Dispatch through Growjet." },
  { key: "shiprocket", name: "Shiprocket", note: "Ship through your own Shiprocket account." },
  { key: "newonboarding", name: "New onboarding screen", note: "The newer first-visit flow for customers." },
];

export function ModulesSection() {
  const { features, toggle, busy } = useFeatureToggle();
  const setSaveAction = useAdminSettingsStore((s) => s.setSaveAction);
  const setHasChanges = useAdminSettingsStore((s) => s.setHasChanges);

  // Nothing here is deferred, so this screen must not inherit a Save button
  // from the section the partner came from.
  React.useEffect(() => {
    setSaveAction(null);
    setHasChanges(false);
  }, [setSaveAction, setHasChanges]);

  const rows = MODULES.filter((m) => features?.[m.key]?.access);
  const enabledCount = rows.filter((m) => features[m.key].enabled).length;

  return (
    <SettingsCard
      title="Features"
      meta={<Chip>{`${enabledCount} of ${rows.length} on`}</Chip>}
      bodyClassName="gap-0 p-0"
    >
      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyBox
            title="No optional features"
            hint="Your plan includes no features that can be switched on or off here."
          />
        </div>
      ) : (
        <>
          <div>
            {rows.map((m) => (
              <div
                key={m.key}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800"
              >
                <div className="min-w-0 flex-[1_1_220px]">
                  <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                    {m.name}
                  </div>
                  <div className="mt-1 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
                    {m.note}
                  </div>
                </div>
                <Toggle
                  label={m.name}
                  checked={features[m.key].enabled}
                  disabled={busy === m.key}
                  onChange={(v) => toggle(m.key, v)}
                />
              </div>
            ))}
          </div>
          <div className="px-4 py-3">
            <Note>
              These control what appears in your sidebar and what customers are
              offered. Each switch saves immediately — anything with its own
              settings (delivery, loyalty, scheduling) is configured in its own
              section.
            </Note>
          </div>
        </>
      )}
    </SettingsCard>
  );
}
