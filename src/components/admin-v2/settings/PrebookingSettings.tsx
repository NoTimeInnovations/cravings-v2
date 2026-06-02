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
import { CalendarClock } from "lucide-react";
import {
    PrebookingSettings as PrebookingConfig,
    DEFAULT_PREBOOKING_SETTINGS,
} from "@/store/orderStore";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { TimePicker } from "./DeliverySettings";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ORDER_TYPES: { key: PrebookingConfig["allowed_order_types"][number]; label: string }[] = [
    { key: "delivery", label: "Delivery" },
    { key: "takeaway", label: "Takeaway" },
    { key: "dine_in", label: "Dine-in" },
];

/** Merge a parsed config onto defaults so partial/legacy values stay valid. */
function mergeConfig(parsed: Partial<PrebookingConfig> | null | undefined): PrebookingConfig {
    if (!parsed) return structuredClone(DEFAULT_PREBOOKING_SETTINGS);
    const windowsByDay = new Map(
        (parsed.windows ?? []).map((w) => [w.day, w])
    );
    return {
        min_lead_time_minutes:
            typeof parsed.min_lead_time_minutes === "number"
                ? parsed.min_lead_time_minutes
                : DEFAULT_PREBOOKING_SETTINGS.min_lead_time_minutes,
        max_advance_days:
            typeof parsed.max_advance_days === "number"
                ? parsed.max_advance_days
                : DEFAULT_PREBOOKING_SETTINGS.max_advance_days,
        windows: DEFAULT_PREBOOKING_SETTINGS.windows.map(
            (def) => windowsByDay.get(def.day) ?? def
        ),
        allowed_order_types:
            parsed.allowed_order_types?.length
                ? parsed.allowed_order_types
                : DEFAULT_PREBOOKING_SETTINGS.allowed_order_types,
    };
}

export function PrebookingSettings() {
    const { userData, setState } = useAuthStore();
    const { setSaveAction, setHasChanges } = useAdminSettingsStore();

    const [cfg, setCfg] = useState<PrebookingConfig>(DEFAULT_PREBOOKING_SETTINGS);
    const [initialLoaded, setInitialLoaded] = useState(false);

    // Load existing config
    useEffect(() => {
        if (!userData) return;
        const existing = (userData as any)?.prebooking_settings;
        let parsed: any = null;
        if (existing) {
            try {
                parsed = typeof existing === "string" ? JSON.parse(existing) : existing;
            } catch {
                parsed = null;
            }
        }
        setCfg(mergeConfig(parsed));
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
        setCfg((p) => ({
            ...p,
            windows: p.windows.map((w) => (w.day === day ? { ...w, ...patch } : w)),
        }));

    const toggleOrderType = (key: PrebookingConfig["allowed_order_types"][number], on: boolean) =>
        setCfg((p) => ({
            ...p,
            allowed_order_types: on
                ? Array.from(new Set([...p.allowed_order_types, key]))
                : p.allowed_order_types.filter((t) => t !== key),
        }));

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5" />
                        Prebooking
                    </CardTitle>
                    <CardDescription>
                        Let customers schedule orders for a future date and time. All times are in
                        your restaurant&apos;s local time.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Lead time + max days */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="lead-time">Minimum lead time (minutes)</Label>
                            <Input
                                id="lead-time"
                                type="number"
                                min={0}
                                value={cfg.min_lead_time_minutes}
                                onChange={(e) =>
                                    setCfg((p) => ({
                                        ...p,
                                        min_lead_time_minutes: Math.max(0, Number(e.target.value) || 0),
                                    }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                How far in advance an order must be placed before its slot.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="max-days">Max days ahead</Label>
                            <Input
                                id="max-days"
                                type="number"
                                min={0}
                                value={cfg.max_advance_days}
                                onChange={(e) =>
                                    setCfg((p) => ({
                                        ...p,
                                        max_advance_days: Math.max(0, Number(e.target.value) || 0),
                                    }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                How many days into the future a customer can schedule (0 = today only).
                            </p>
                        </div>
                    </div>

                    {/* Allowed order types */}
                    <div className="space-y-2">
                        <Label>Order types that can be prebooked</Label>
                        <div className="flex flex-wrap gap-3">
                            {ORDER_TYPES.map((ot) => (
                                <label
                                    key={ot.key}
                                    className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer"
                                >
                                    <Switch
                                        checked={cfg.allowed_order_types.includes(ot.key)}
                                        onCheckedChange={(v) => toggleOrderType(ot.key, v)}
                                    />
                                    <span className="text-sm font-medium">{ot.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Daily windows */}
                    <div className="space-y-2">
                        <Label>Daily prebooking windows</Label>
                        <p className="text-xs text-muted-foreground">
                            Customers can only pick slots inside the enabled window for each day.
                        </p>
                        <div className="space-y-2">
                            {cfg.windows.map((w) => (
                                <div
                                    key={w.day}
                                    className="flex flex-wrap items-center gap-3 border rounded-lg p-3"
                                >
                                    <div className="flex items-center gap-2 w-32">
                                        <Switch
                                            checked={w.enabled}
                                            onCheckedChange={(v) => updateWindow(w.day, { enabled: v })}
                                        />
                                        <span className="text-sm font-medium">{DAY_LABELS[w.day]}</span>
                                    </div>
                                    {w.enabled ? (
                                        <div className="flex items-center gap-2">
                                            <TimePicker
                                                value={w.from}
                                                onChange={(val) => updateWindow(w.day, { from: val })}
                                            />
                                            <span className="text-muted-foreground text-sm">to</span>
                                            <TimePicker
                                                value={w.to}
                                                onChange={(val) => updateWindow(w.day, { to: val })}
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Closed</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
