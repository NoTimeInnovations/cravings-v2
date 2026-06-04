"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { CalendarClock } from "lucide-react";
import { PrebookingSettings as PrebookingConfig, DEFAULT_PREBOOKING_SETTINGS } from "@/store/orderStore";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { TimePicker } from "./DeliverySettings";
import { mergePrebookingConfig } from "@/lib/prebooking";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Prebooking = scheduling a delivery/takeaway order for later. Edits the
 * delivery/takeaway slice of `prebooking_settings` (per-day open ranges); dine-in
 * fields are loaded and preserved untouched (the Slot Booking tab owns them).
 */
export function PrebookingSettings() {
    const { userData, setState } = useAuthStore();
    const { setSaveAction, setHasChanges } = useAdminSettingsStore();

    const [cfg, setCfg] = useState<PrebookingConfig>(DEFAULT_PREBOOKING_SETTINGS);
    const [initialLoaded, setInitialLoaded] = useState(false);

    useEffect(() => {
        if (!userData) return;
        setCfg(mergePrebookingConfig((userData as any)?.prebooking_settings));
        setInitialLoaded(true);
    }, [userData]);

    const handleSave = useCallback(async () => {
        if (!userData) return;
        try {
            const payload = JSON.stringify(cfg);
            await updatePartner((userData as any).id, { prebooking_settings: payload });
            revalidateTag((userData as any).id);
            setState({ prebooking_settings: payload } as any);
            toast.success("Prebooking settings saved");
            setHasChanges(false);
        } catch (e) {
            console.error("Error saving prebooking settings:", e);
            toast.error("Failed to save prebooking settings");
        }
    }, [cfg, userData, setState, setHasChanges]);

    useEffect(() => {
        if (!initialLoaded) return;
        setHasChanges(true);
        setSaveAction(handleSave);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [cfg, initialLoaded, handleSave, setSaveAction, setHasChanges]);

    const updateWindow = (day: number, patch: Partial<PrebookingConfig["windows"][number]>) =>
        setCfg((p) => ({ ...p, windows: p.windows.map((w) => (w.day === day ? { ...w, ...patch } : w)) }));

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5" />
                        Prebooking
                    </CardTitle>
                    <CardDescription>
                        Let customers schedule a delivery / takeaway order for a future date and time.
                        All times are in your restaurant&apos;s local time.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <div className="font-medium">Enable prebooking</div>
                            <div className="text-sm text-muted-foreground">
                                Let customers schedule delivery / takeaway orders for later.
                            </div>
                        </div>
                        <Switch
                            checked={cfg.prebooking_enabled}
                            onCheckedChange={(v) => setCfg((p) => ({ ...p, prebooking_enabled: v }))}
                        />
                    </div>

                    {cfg.prebooking_enabled && (
                        <div className="space-y-2">
                            <Label>Available time range per day</Label>
                            <p className="text-xs text-muted-foreground">
                                Customers can schedule any time within the open range for each day.
                            </p>
                            <div className="space-y-2">
                                {cfg.windows.map((w) => (
                                    <div key={w.day} className="border rounded-lg p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Switch checked={w.enabled} onCheckedChange={(v) => updateWindow(w.day, { enabled: v })} />
                                            <span className="text-sm font-medium">{DAY_LABELS[w.day]}</span>
                                        </div>
                                        {w.enabled ? (
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-muted-foreground">From</span>
                                                <TimePicker value={w.from || "10:00"} onChange={(val) => updateWindow(w.day, { from: val })} />
                                                <span className="text-xs text-muted-foreground">To</span>
                                                <TimePicker value={w.to || "22:00"} onChange={(val) => updateWindow(w.day, { to: val })} />
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Closed</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
