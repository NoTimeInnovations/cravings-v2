"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Utensils, X } from "lucide-react";
import { PrebookingSettings as PrebookingConfig, DEFAULT_PREBOOKING_SETTINGS } from "@/store/orderStore";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { TimePicker } from "./DeliverySettings";
import { windowSlotTimes, formatSlotLabel, mergePrebookingConfig } from "@/lib/prebooking";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Slot Booking = dine-in table reservations. Edits the dine-in slice of
 * `prebooking_settings` (own lead time, max days, slots); the delivery/takeaway
 * prebooking fields are loaded and preserved untouched.
 */
export function SlotBookingSettings() {
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
            toast.success("Slot booking settings saved");
            setHasChanges(false);
        } catch (e) {
            console.error("Error saving slot booking settings:", e);
            toast.error("Failed to save slot booking settings");
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

    const updateWindow = (day: number, patch: Partial<PrebookingConfig["dine_in_windows"][number]>) =>
        setCfg((p) => ({
            ...p,
            dine_in_windows: p.dine_in_windows.map((w) => (w.day === day ? { ...w, ...patch } : w)),
        }));

    const addSlot = (day: number, time: string) =>
        setCfg((p) => ({
            ...p,
            dine_in_windows: p.dine_in_windows.map((w) =>
                w.day === day ? { ...w, slots: windowSlotTimes({ ...w, slots: [...(w.slots ?? []), time] }) } : w
            ),
        }));

    const removeSlot = (day: number, time: string) =>
        setCfg((p) => ({
            ...p,
            dine_in_windows: p.dine_in_windows.map((w) =>
                w.day === day ? { ...w, slots: (w.slots ?? []).filter((s) => s !== time) } : w
            ),
        }));

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Utensils className="h-5 w-5" />
                        Slot Booking (Dine-in)
                    </CardTitle>
                    <CardDescription>
                        Let customers book a table for a future date and time. These slots are separate
                        from delivery/takeaway prebooking. Enable Dine-in in the Order Types tab to show
                        it to customers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <div className="font-medium">Enable slot booking</div>
                            <div className="text-sm text-muted-foreground">
                                Let customers book a dine-in table for later. (Also enable Dine-in in the Order Types tab.)
                            </div>
                        </div>
                        <Switch
                            checked={cfg.slot_booking_enabled}
                            onCheckedChange={(v) => setCfg((p) => ({ ...p, slot_booking_enabled: v }))}
                        />
                    </div>

                    {cfg.slot_booking_enabled && (<>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="dine-lead-time">Minimum lead time (minutes)</Label>
                            <Input
                                id="dine-lead-time"
                                type="number"
                                min={0}
                                value={cfg.dine_in_min_lead_time_minutes}
                                onChange={(e) =>
                                    setCfg((p) => ({ ...p, dine_in_min_lead_time_minutes: Math.max(0, Number(e.target.value) || 0) }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                How far in advance a table must be booked before its slot.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dine-max-days">Max days ahead</Label>
                            <Input
                                id="dine-max-days"
                                type="number"
                                min={0}
                                value={cfg.dine_in_max_advance_days}
                                onChange={(e) =>
                                    setCfg((p) => ({ ...p, dine_in_max_advance_days: Math.max(0, Number(e.target.value) || 0) }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                How many days into the future a table can be booked (0 = today only).
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Dine-in table slot times per day</Label>
                        <p className="text-xs text-muted-foreground">
                            Customers can only book the exact seating times you add for each day.
                        </p>
                        <div className="space-y-2">
                            {cfg.dine_in_windows.map((w) => {
                                const slots = windowSlotTimes(w);
                                return (
                                    <div key={w.day} className="border rounded-lg p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Switch checked={w.enabled} onCheckedChange={(v) => updateWindow(w.day, { enabled: v })} />
                                            <span className="text-sm font-medium">{DAY_LABELS[w.day]}</span>
                                        </div>
                                        {w.enabled ? (
                                            <>
                                                <div className="flex flex-wrap gap-2">
                                                    {slots.length === 0 && (
                                                        <span className="text-xs text-muted-foreground">No slots yet — add times below.</span>
                                                    )}
                                                    {slots.map((t) => (
                                                        <span key={t} className="inline-flex items-center gap-1.5 border rounded-full pl-3 pr-2 py-1 text-sm bg-gray-50">
                                                            {formatSlotLabel(t)}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSlot(w.day, t)}
                                                                className="text-muted-foreground hover:text-red-600"
                                                                aria-label={`Remove ${t}`}
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Add time:</span>
                                                    <TimePicker value="19:00" onChange={(val) => addSlot(w.day, val)} />
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Closed</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    </>)}
                </CardContent>
            </Card>
        </div>
    );
}
