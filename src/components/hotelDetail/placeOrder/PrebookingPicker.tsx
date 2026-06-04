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
    persons?: number; // dine-in table reservation party size
    dineIn?: boolean; // true when this selection is a dine-in table reservation
}

/** Party-size choices for a dine-in table reservation. */
const PARTY_SIZES = [1, 2, 3, 4, 6, 8, 10, 12];

/**
 * Checkout-side scheduling picker. Two modes:
 *  - default: "Order now / Schedule for later" toggle (optional scheduled order).
 *  - reservation: a dine-in table booking — always scheduled, plus a party-size
 *    picker; reports `{ date, time, persons }`.
 * Renders nothing unless the partner allows prebooking for the current order type.
 */
export function PrebookingPicker({
    settings,
    orderTypeKey,
    onChange,
    accentColor = "#16a34a",
    className = "rounded-lg border p-4 space-y-3 bg-white",
    reservation = false,
}: {
    settings: PrebookingSettings;
    orderTypeKey: PrebookOrderType;
    onChange: (value: PrebookingSelection | null) => void;
    accentColor?: string;
    /** Outer container classes — lets each modal match its own card style. */
    className?: string;
    /** Dine-in table reservation: force scheduling + show party-size chips. */
    reservation?: boolean;
}) {
    // Dine-in reservations are gated upstream (Order Types tab); for delivery/takeaway
    // the "schedule for later" option is gated by the prebooking allowed_order_types.
    const allowed = reservation ? true : isOrderTypeAllowed(settings, orderTypeKey);
    const [mode, setMode] = useState<"now" | "later">("now");
    const [date, setDate] = useState<string>("");
    const [time, setTime] = useState<string>("");
    const [persons, setPersons] = useState<number>(2);
    // A reservation is always scheduled — no "order now".
    const effectiveMode: "now" | "later" = reservation ? "later" : mode;

    // Recompute available dates once per mount/settings change.
    const dates = useMemo(
        () => (allowed ? getPrebookingDates(settings, new Date(), { dineIn: reservation }) : []),
        [allowed, settings, reservation]
    );
    const slots = useMemo(
        () => (date ? getPrebookingSlots(settings, date, new Date(), { dineIn: reservation }) : []),
        [settings, date, reservation]
    );

    // Keep date valid against the computed list.
    useEffect(() => {
        if (effectiveMode !== "later") return;
        if (dates.length === 0) return;
        if (!dates.some((d) => d.value === date)) {
            setDate(dates[0].value);
        }
    }, [effectiveMode, dates, date]);

    // Keep time valid against the selected date's slots.
    useEffect(() => {
        if (effectiveMode !== "later") return;
        if (slots.length === 0) {
            if (time) setTime("");
            return;
        }
        if (!slots.includes(time)) setTime(slots[0]);
    }, [effectiveMode, slots, time]);

    // Report selection upward.
    useEffect(() => {
        if (!allowed || effectiveMode === "now" || !date || !time || (reservation && !persons)) {
            onChange(null);
        } else {
            // dineIn travels with the selection so order-type is derived from the
            // captured reservation, not re-read from live orderType at submit time.
            onChange(reservation ? { date, time, persons, dineIn: true } : { date, time });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed, effectiveMode, date, time, persons, reservation]);

    if (!allowed || dates.length === 0) return null;

    return (
        <div className={className}>
            <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                    {reservation ? "Book a table" : "When do you want this order?"}
                </span>
            </div>

            {!reservation && (
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
            )}

            {reservation && (
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Number of guests</label>
                    <div className="flex flex-wrap gap-2">
                        {PARTY_SIZES.map((n) => {
                            const selected = persons === n;
                            return (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setPersons(n)}
                                    className={`min-w-[44px] py-2 px-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                                        selected
                                            ? "text-white border-transparent shadow-sm"
                                            : "border-gray-100 bg-gray-50 text-gray-700"
                                    }`}
                                    style={selected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                                >
                                    {n}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {effectiveMode === "later" && (
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
