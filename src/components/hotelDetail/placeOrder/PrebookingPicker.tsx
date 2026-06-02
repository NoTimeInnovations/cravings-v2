"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrebookingSettings } from "@/store/orderStore";
import {
    PrebookOrderType,
    getPrebookingDates,
    getPrebookingSlots,
    isOrderTypeAllowed,
    formatSlotLabel,
} from "@/lib/prebooking";

export interface PrebookingSelection {
    date: string; // "YYYY-MM-DD"
    time: string; // "HH:MM"
}

/**
 * Checkout-side "Order now / Schedule for later" picker. Renders nothing unless
 * the partner allows prebooking for the current order type. Reports the chosen
 * slot (or null for an immediate order) via `onChange`.
 */
export function PrebookingPicker({
    settings,
    orderTypeKey,
    onChange,
    accentColor = "#16a34a",
    className = "rounded-lg border p-4 space-y-3 bg-white",
}: {
    settings: PrebookingSettings;
    orderTypeKey: PrebookOrderType;
    onChange: (value: PrebookingSelection | null) => void;
    accentColor?: string;
    /** Outer container classes — lets each modal match its own card style. */
    className?: string;
}) {
    const allowed = isOrderTypeAllowed(settings, orderTypeKey);
    const [mode, setMode] = useState<"now" | "later">("now");
    const [date, setDate] = useState<string>("");
    const [time, setTime] = useState<string>("");

    // Recompute available dates once per mount/settings change.
    const dates = useMemo(
        () => (allowed ? getPrebookingDates(settings) : []),
        [allowed, settings]
    );
    const slots = useMemo(
        () => (date ? getPrebookingSlots(settings, date) : []),
        [settings, date]
    );

    // Keep date valid against the computed list.
    useEffect(() => {
        if (mode !== "later") return;
        if (dates.length === 0) return;
        if (!dates.some((d) => d.value === date)) {
            setDate(dates[0].value);
        }
    }, [mode, dates, date]);

    // Keep time valid against the selected date's slots.
    useEffect(() => {
        if (mode !== "later") return;
        if (slots.length === 0) {
            if (time) setTime("");
            return;
        }
        if (!slots.includes(time)) setTime(slots[0]);
    }, [mode, slots, time]);

    // Report selection upward.
    useEffect(() => {
        if (!allowed || mode === "now" || !date || !time) {
            onChange(null);
        } else {
            onChange({ date, time });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed, mode, date, time]);

    if (!allowed || dates.length === 0) return null;

    return (
        <div className={className}>
            <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                    When do you want this order?
                </span>
            </div>

            <div className="flex gap-2">
                {(["now", "later"] as const).map((m) => {
                    const selected = mode === m;
                    return (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                                selected
                                    ? "text-white border-transparent shadow-sm"
                                    : "border-gray-100 bg-gray-50 text-gray-700"
                            }`}
                            style={selected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                        >
                            {m === "now" ? "Order now" : "Schedule for later"}
                        </button>
                    );
                })}
            </div>

            {mode === "later" && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Date</label>
                        <Select value={date} onValueChange={setDate}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select date" />
                            </SelectTrigger>
                            <SelectContent className="z-[100001]">
                                {dates.map((d) => (
                                    <SelectItem key={d.value} value={d.value}>
                                        {d.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Time</label>
                        <Select value={time} onValueChange={setTime} disabled={slots.length === 0}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent className="z-[100001] max-h-64">
                                {slots.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {formatSlotLabel(s)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
        </div>
    );
}
