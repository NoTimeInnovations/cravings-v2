"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { CalendarClock, Plus, X } from "lucide-react";
import {
    PrebookingSettings as PrebookingConfig,
    PrebookingRange,
    PrebookingWindow,
    DEFAULT_PREBOOKING_SETTINGS,
} from "@/store/orderStore";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { TimePicker } from "./DeliverySettings";
import { mergePrebookingConfig } from "@/lib/prebooking";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Prebooking = scheduling a delivery/takeaway order for later. Combined editor:
 * pick the open weekdays, then add one or more time ranges (e.g. lunch + dinner)
 * that apply to all selected days. Dine-in fields are preserved untouched.
 */
export function PrebookingSettings() {
    const { userData, setState } = useAuthStore();
    const { setSaveAction, setHasChanges } = useAdminSettingsStore();

    const [cfg, setCfg] = useState<PrebookingConfig>(DEFAULT_PREBOOKING_SETTINGS);
    const [enabled, setEnabled] = useState(true);
    const [todayOnly, setTodayOnly] = useState(false);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [pickerMode, setPickerMode] = useState<"both" | "date_only" | "time_only">("both");
    const [slotMode, setSlotMode] = useState<"windows" | "rolling">("windows");
    const [rollingInterval, setRollingInterval] = useState<number>(15);
    const [rollingCount, setRollingCount] = useState<number>(2);
    const [days, setDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6]));
    const [ranges, setRanges] = useState<PrebookingRange[]>([{ from: "10:00", to: "22:00" }]);
    const [initialLoaded, setInitialLoaded] = useState(false);

    useEffect(() => {
        if (!userData) return;
        const merged = mergePrebookingConfig((userData as any)?.prebooking_settings);
        setCfg(merged);
        setEnabled(merged.prebooking_enabled);
        setTodayOnly(merged.today_only ?? false);
        setStartDate(merged.start_date ?? "");
        setEndDate(merged.end_date ?? "");
        setPickerMode(merged.picker_mode ?? "both");
        setSlotMode(merged.slot_mode ?? "windows");
        setRollingInterval(merged.rolling_interval_minutes ?? 15);
        setRollingCount(merged.rolling_slot_count ?? 2);
        setDays(new Set(merged.windows.filter((w) => w.enabled).map((w) => w.day)));
        const fe =
            merged.windows.find((w) => w.enabled && w.ranges?.length) ||
            merged.windows.find((w) => w.ranges?.length);
        setRanges(fe?.ranges?.length ? fe.ranges.map((r) => ({ ...r })) : [{ from: "10:00", to: "22:00" }]);
        setInitialLoaded(true);
    }, [userData]);

    const handleSave = useCallback(async () => {
        if (!userData) return;
        try {
            const windows: PrebookingWindow[] = Array.from({ length: 7 }, (_, day) => ({
                day: day as PrebookingWindow["day"],
                enabled: days.has(day),
                ranges: ranges.map((r) => ({ ...r })),
            }));
            const payload = JSON.stringify({ ...cfg, prebooking_enabled: enabled, today_only: todayOnly, start_date: startDate || undefined, end_date: endDate || undefined, picker_mode: pickerMode, slot_mode: slotMode, rolling_interval_minutes: rollingInterval, rolling_slot_count: rollingCount, windows });
            await updatePartner((userData as any).id, { prebooking_settings: payload });
            revalidateTag((userData as any).id);
            setState({ prebooking_settings: payload } as any);
            toast.success("Prebooking settings saved");
            setHasChanges(false);
        } catch (e) {
            console.error("Error saving prebooking settings:", e);
            toast.error("Failed to save prebooking settings");
        }
    }, [cfg, enabled, todayOnly, startDate, endDate, pickerMode, slotMode, rollingInterval, rollingCount, days, ranges, userData, setState, setHasChanges]);

    useEffect(() => {
        if (!initialLoaded) return;
        setHasChanges(true);
        setSaveAction(handleSave);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [enabled, todayOnly, startDate, endDate, pickerMode, slotMode, rollingInterval, rollingCount, days, ranges, initialLoaded, handleSave, setSaveAction, setHasChanges]);

    const toggleDay = (day: number) =>
        setDays((prev) => {
            const n = new Set(prev);
            n.has(day) ? n.delete(day) : n.add(day);
            return n;
        });
    const updateRange = (idx: number, patch: Partial<PrebookingRange>) =>
        setRanges((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    const addRange = () => setRanges((prev) => [...prev, { from: "10:00", to: "22:00" }]);
    const removeRange = (idx: number) => setRanges((prev) => prev.filter((_, i) => i !== idx));

    const _now = new Date();
    const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

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
                        <Switch checked={enabled} onCheckedChange={setEnabled} />
                    </div>

                    {enabled && (
                        <>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                    <div className="font-medium">Today only</div>
                                    <div className="text-sm text-muted-foreground">
                                        Customers can only schedule for today — future dates are hidden.
                                    </div>
                                </div>
                                <Switch checked={todayOnly} onCheckedChange={setTodayOnly} />
                            </div>

                            {!todayOnly && (
                                <div className="space-y-2">
                                    <Label>Booking date range (optional)</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Limit which dates customers can schedule. Leave empty to allow the next 30 days.
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-muted-foreground">From</span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            min={todayStr}
                                            max={endDate || undefined}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="h-9 rounded-md border bg-white px-3 text-sm"
                                        />
                                        <span className="text-xs text-muted-foreground">To</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            min={startDate || todayStr}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="h-9 rounded-md border bg-white px-3 text-sm"
                                        />
                                        {(startDate || endDate) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setStartDate("");
                                                    setEndDate("");
                                                }}
                                                className="text-xs text-muted-foreground hover:text-red-600"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    {endDate && endDate < todayStr && (
                                        <p className="text-xs font-medium text-red-600">
                                            Your end date is in the past — customers can&apos;t schedule any orders until you update or clear it.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>What customers pick</Label>
                                <p className="text-xs text-muted-foreground">
                                    Show a date, a time slot, or both at checkout. The hidden one is auto-set to its first available option.
                                </p>
                                <Select value={pickerMode} onValueChange={(v) => setPickerMode(v as "both" | "date_only" | "time_only")}>
                                    <SelectTrigger className="w-full bg-white sm:w-[220px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="both">Date &amp; time</SelectItem>
                                        <SelectItem value="date_only">Date only</SelectItem>
                                        <SelectItem value="time_only">Time only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Slot type</Label>
                                <p className="text-xs text-muted-foreground">
                                    Fixed weekday time ranges, or rolling slots relative to the current time (now + interval).
                                </p>
                                <Select value={slotMode} onValueChange={(v) => setSlotMode(v as "windows" | "rolling")}>
                                    <SelectTrigger className="w-full bg-white sm:w-[220px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="windows">Fixed time ranges</SelectItem>
                                        <SelectItem value="rolling">Rolling from now</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {slotMode === "rolling" && (
                                <div className="space-y-2">
                                    <Label>Rolling slots</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Offer the next times from now, spaced by the interval (e.g. 15 min × 2 → now+15, now+30). The list refreshes every minute at checkout.
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Every</span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={rollingInterval}
                                            onChange={(e) => setRollingInterval(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="h-9 w-20 rounded-md border bg-white px-3 text-sm"
                                        />
                                        <span className="text-xs text-muted-foreground">min</span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={rollingCount}
                                            onChange={(e) => setRollingCount(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="h-9 w-20 rounded-md border bg-white px-3 text-sm"
                                        />
                                        <span className="text-xs text-muted-foreground">slots</span>
                                    </div>
                                </div>
                            )}

                            {slotMode === "windows" && (
                                <>
                            <div className="space-y-2">
                                <Label>Open days</Label>
                                <div className="flex flex-wrap gap-2">
                                    {DAY_LABELS.map((label, day) => {
                                        const on = days.has(day);
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => toggleDay(day)}
                                                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                                    on
                                                        ? "bg-orange-500 border-orange-500 text-white"
                                                        : "bg-white border-gray-200 text-gray-600"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Time slots</Label>
                                <p className="text-xs text-muted-foreground">
                                    Add one or more ranges (e.g. lunch and dinner). They apply to every selected day.
                                </p>
                                <div className="space-y-2">
                                    {ranges.map((r, idx) => (
                                        <div key={idx} className="flex items-center gap-2 flex-wrap border rounded-lg p-3">
                                            <span className="text-xs text-muted-foreground">From</span>
                                            <TimePicker value={r.from} onChange={(val) => updateRange(idx, { from: val })} />
                                            <span className="text-xs text-muted-foreground">To</span>
                                            <TimePicker value={r.to} onChange={(val) => updateRange(idx, { to: val })} />
                                            {ranges.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeRange(idx)}
                                                    className="ml-auto text-muted-foreground hover:text-red-600"
                                                    aria-label="Remove slot"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addRange} className="gap-1.5">
                                    <Plus className="h-4 w-4" /> Add slot
                                </Button>
                            </div>
                                </>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
