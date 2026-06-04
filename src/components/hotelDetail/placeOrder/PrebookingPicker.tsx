"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, ChevronDown, Check, X } from "lucide-react";
import { PrebookingSettings } from "@/store/orderStore";
import {
    PrebookOrderType,
    getPrebookingDates,
    getPrebookingRanges,
    isOrderTypeAllowed,
    formatSlotLabel,
} from "@/lib/prebooking";

export interface PrebookingSelection {
    date: string; // "YYYY-MM-DD"
    time: string; // "HH:MM"
    persons?: number; // dine-in table reservation party size
    dineIn?: boolean; // true when this selection is a dine-in table reservation
}

/** Bottom sheet (portaled to body so it sits above the full-screen checkout). */
function BottomSheet({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    if (typeof document === "undefined") return null;
    return createPortal(
        <div className="fixed inset-0 z-[100002] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-t-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white rounded-t-2xl">
                    <span className="font-semibold text-gray-900">{title}</span>
                    <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-3 space-y-2">{children}</div>
            </div>
        </div>,
        document.body,
    );
}

/**
 * Checkout-side scheduling picker. Heading + two buttons (Date / Slot) styled
 * like the order-type buttons; each opens a single-select bottom sheet. Dates
 * span tomorrow … +30 days; slots come from the partner's allowed ranges.
 * Renders nothing unless the partner allows scheduling for the current order type.
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
    className?: string;
    reservation?: boolean;
}) {
    const allowed = reservation ? true : isOrderTypeAllowed(settings, orderTypeKey);
    const [date, setDate] = useState<string>("");
    const [time, setTime] = useState<string>("");
    // Guest count is no longer collected; keep a fixed default so dine-in orders
    // still record a party size (used as the table-booking marker downstream).
    const persons = 1;
    const [sheet, setSheet] = useState<null | "date" | "slot">(null);

    // Dates: tomorrow … +30 days that have at least one slot.
    const dates = useMemo(
        () =>
            allowed
                ? getPrebookingDates(settings, new Date(), { dineIn: reservation, fromOffset: 1, throughDay: 30 })
                : [],
        [allowed, settings, reservation],
    );
    // Slots are the partner's configured open ranges for the day (e.g. lunch +
    // dinner) — shown as "from – to", not every half-hour. The selection stores
    // the range's start as the scheduled time.
    const ranges = useMemo(
        () => (date ? getPrebookingRanges(settings, date, { dineIn: reservation }) : []),
        [settings, date, reservation],
    );

    // If the chosen date drops out of the list, clear it (and its slot).
    useEffect(() => {
        if (date && !dates.some((d) => d.value === date)) {
            setDate("");
            setTime("");
        }
    }, [dates, date]);

    // If the chosen slot isn't valid for the date, clear it.
    useEffect(() => {
        if (time && !ranges.some((r) => r.from === time)) setTime("");
    }, [ranges, time]);

    // Report selection upward (null until fully chosen).
    useEffect(() => {
        if (!allowed || !date || !time || (reservation && !persons)) {
            onChange(null);
        } else {
            onChange(reservation ? { date, time, persons, dineIn: true } : { date, time });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed, date, time, persons, reservation]);

    if (!allowed || dates.length === 0) return null;

    const dateLabel = dates.find((d) => d.value === date)?.label;
    const selectedRange = ranges.find((r) => r.from === time);
    const slotLabel = selectedRange
        ? `${formatSlotLabel(selectedRange.from)} – ${formatSlotLabel(selectedRange.to)}`
        : "";

    // Shared button style — matches the order-type buttons (unselected look).
    const triggerCls =
        "flex items-center justify-between gap-2 py-3 px-3 rounded-xl text-sm font-semibold border-2 border-gray-100 bg-gray-50 text-gray-700 disabled:opacity-50";

    return (
        <div className={className}>
            <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                    {reservation ? "Slot booking" : "Book a slot"}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSheet("date")} className={triggerCls}>
                    <span className="truncate">{dateLabel || "Select date"}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                </button>
                <button
                    type="button"
                    onClick={() => setSheet("slot")}
                    disabled={!date}
                    className={triggerCls}
                >
                    <span className="truncate">{slotLabel || "Select slot"}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                </button>
            </div>

            {!reservation && (
                <p className="text-xs text-muted-foreground">
                    Optional — pick a date &amp; slot to schedule, or leave empty to order now.
                </p>
            )}

            {sheet === "date" && (
                <BottomSheet title="Select date" onClose={() => setSheet(null)}>
                    {dates.map((d) => {
                        const selected = d.value === date;
                        return (
                            <button
                                key={d.value}
                                type="button"
                                onClick={() => {
                                    setDate(d.value);
                                    setTime("");
                                    setSheet(null);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium ${
                                    selected ? "text-white border-transparent" : "border-gray-100 bg-gray-50 text-gray-800"
                                }`}
                                style={selected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                            >
                                {d.label}
                                {selected && <Check className="h-4 w-4" />}
                            </button>
                        );
                    })}
                </BottomSheet>
            )}

            {sheet === "slot" && (
                <BottomSheet title="Select slot" onClose={() => setSheet(null)}>
                    {ranges.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No slots available for this day.</p>
                    ) : (
                        ranges.map((r) => {
                            const selected = r.from === time;
                            return (
                                <button
                                    key={`${r.from}-${r.to}`}
                                    type="button"
                                    onClick={() => {
                                        setTime(r.from);
                                        setSheet(null);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium ${
                                        selected ? "text-white border-transparent" : "border-gray-100 bg-gray-50 text-gray-800"
                                    }`}
                                    style={selected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                                >
                                    {`${formatSlotLabel(r.from)} – ${formatSlotLabel(r.to)}`}
                                    {selected && <Check className="h-4 w-4" />}
                                </button>
                            );
                        })
                    )}
                </BottomSheet>
            )}
        </div>
    );
}
