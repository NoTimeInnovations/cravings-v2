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
    time: string; // "HH:MM" — slot start
    timeTo?: string; // "HH:MM" — slot end (so it displays as a from–to range)
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
    // Which selectors to show (partner config). When one is hidden it's still
    // auto-selected to its first option so the order carries a valid date + slot.
    const mode = (reservation ? settings.dine_in_picker_mode : settings.picker_mode) ?? "both";
    const showDate = mode !== "time_only";
    const showTime = mode !== "date_only";
    const slotMode = reservation ? settings.dine_in_slot_mode : settings.slot_mode;
    const isRolling = slotMode === "rolling";
    // Tracks an explicit slot pick so a rolling refresh doesn't overwrite it.
    const [userPickedTime, setUserPickedTime] = useState(false);
    // Rolling slots roll with the clock; tick `now` each minute so the picker
    // refreshes them (e.g. 3:00, 3:15 → 3:01, 3:16 after a minute).
    const [now, setNow] = useState<Date>(() => new Date());
    useEffect(() => {
        if (!isRolling) return;
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, [isRolling]);

    // Dates: today … +30 days that have at least one slot (today is dropped
    // automatically if all its slots are past / under the min lead time).
    const dates = useMemo(
        () =>
            allowed
                ? getPrebookingDates(settings, now, { dineIn: reservation, fromOffset: 0, throughDay: 30 })
                : [],
        [allowed, settings, reservation, now],
    );
    // Slots are the partner's configured open ranges for the day (e.g. lunch +
    // dinner) — shown as "from – to", not every half-hour. The selection stores
    // the range's start as the scheduled time.
    const ranges = useMemo(
        () => (date ? getPrebookingRanges(settings, date, { dineIn: reservation, now }) : []),
        [settings, date, reservation, now],
    );

    // Keep the chosen date valid, and auto-select the first available date so
    // there's always a sensible default (required when the date picker is hidden).
    useEffect(() => {
        if (date && !dates.some((d) => d.value === date)) {
            setDate("");
            setTime("");
        } else if (!date && dates.length > 0) {
            setDate(dates[0].value);
        }
    }, [dates, date]);

    // Slot selection lifecycle.
    // - Windows: clear an invalid pick (e.g. after a date change), else auto-select first.
    // - Rolling: the auto-default is kept pointed at the soonest slot (rolls each
    //   minute via a DIRECT swap — no transient empty state that would emit null).
    //   A manual pick is an absolute time preserved until it passes, then re-defaults.
    useEffect(() => {
        if (isRolling) {
            if (userPickedTime) {
                const [h, m] = (time || "0:0").split(":").map(Number);
                const pickedMin = (h || 0) * 60 + (m || 0);
                const nowMin = now.getHours() * 60 + now.getMinutes();
                if (!time || pickedMin <= nowMin) {
                    // The picked slot has passed → fall back to the soonest available.
                    setTime(ranges[0]?.from ?? "");
                    setUserPickedTime(false);
                }
            } else if (ranges[0]?.from) {
                if (time !== ranges[0].from) setTime(ranges[0].from);
            } else if (time) {
                setTime("");
            }
            return;
        }
        if (time && !ranges.some((r) => r.from === time)) setTime("");
        else if (!time && ranges.length > 0) setTime(ranges[0].from);
    }, [ranges, time, userPickedTime, isRolling, now]);

    // Report selection upward (null until fully chosen). timeTo = the chosen
    // range's end, so the order can show a full from–to slot.
    useEffect(() => {
        const timeTo = ranges.find((r) => r.from === time)?.to;
        if (!allowed || !date || !time || (reservation && !persons)) {
            onChange(null);
        } else {
            onChange(reservation ? { date, time, timeTo, persons, dineIn: true } : { date, time, timeTo });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed, date, time, persons, reservation]);

    // Prebooking doesn't apply to this order type → no picker, order proceeds.
    if (!allowed) return null;
    // Allowed, but the partner's configured window (e.g. a date range that has
    // lapsed, or all slots past the lead time) leaves no selectable date. Show an
    // explicit closed-state instead of rendering nothing, so the customer isn't
    // left with a silently-disabled checkout and no explanation.
    if (dates.length === 0) {
        return (
            <div className={className}>
                <div className="flex items-start gap-2 rounded-xl border-2 border-amber-100 bg-amber-50 p-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs font-medium text-amber-800">
                        No booking dates are currently available. Please contact the restaurant.
                    </p>
                </div>
            </div>
        );
    }

    const dateLabel = dates.find((d) => d.value === date)?.label;
    // Rolling slots are a single point in time (from === to) → show just the time;
    // window ranges show "from – to".
    const rangeLabel = (r: { from: string; to: string }) =>
        r.from === r.to
            ? formatSlotLabel(r.from)
            : `${formatSlotLabel(r.from)} – ${formatSlotLabel(r.to)}`;
    const selectedRange = ranges.find((r) => r.from === time);
    const slotLabel = selectedRange
        ? rangeLabel(selectedRange)
        : time
          ? formatSlotLabel(time) // a rolling manual pick that has rolled out of the current list
          : "";

    // Shared button style — matches the order-type buttons (unselected look).
    const triggerCls =
        "flex items-center justify-between gap-1 py-3 px-2.5 rounded-xl text-xs font-semibold border-2 border-gray-100 bg-gray-50 text-gray-700 disabled:opacity-50";

    return (
        <div className={className}>
            <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                    {reservation ? "Slot booking" : "Book a slot"}
                </span>
            </div>

            <div className={`grid gap-2 ${showDate && showTime ? "grid-cols-2" : "grid-cols-1"}`}>
                {showDate && (
                    <button type="button" onClick={() => setSheet("date")} className={triggerCls}>
                        <span className="leading-tight">{dateLabel || "Select date"}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                    </button>
                )}
                {showTime && (
                    <button
                        type="button"
                        onClick={() => setSheet("slot")}
                        disabled={!date}
                        className={triggerCls}
                    >
                        <span className="leading-tight">{slotLabel || "Select slot"}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                    </button>
                )}
            </div>


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
                                    setUserPickedTime(false);
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
                                        setUserPickedTime(true);
                                        setSheet(null);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium ${
                                        selected ? "text-white border-transparent" : "border-gray-100 bg-gray-50 text-gray-800"
                                    }`}
                                    style={selected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                                >
                                    {rangeLabel(r)}
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
