"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, ChevronDown, Check, X, Users, Minus, Plus } from "lucide-react";
import { PrebookingSettings } from "@/store/orderStore";
import {
    PrebookOrderType,
    getPrebookingDates,
    getPrebookingRanges,
    isOrderTypeAllowed,
    formatSlotLabel,
    validateCustomPrebookTime,
    restaurantMinuteOfDay,
} from "@/lib/prebooking";

export interface PrebookingSelection {
    date: string; // "YYYY-MM-DD"
    time: string; // "HH:MM" — slot start
    timeTo?: string; // "HH:MM" — slot end (so it displays as a from–to range)
    persons?: number; // dine-in table reservation party size
    dineIn?: boolean; // true when this selection is a dine-in table reservation
    /** True when `time` was typed into the "other time" input rather than picked
     *  from a preset slot. Checkout re-validates only these before submitting. */
    customTime?: boolean;
}

/** Restaurant-local open window used to clamp rolling slots (delivery/takeaway hours). */
export type PrebookClampWindow = { from?: string | null; to?: string | null } | null;

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
 *
 * `optional`: when true, scheduling is opt-in — the customer ticks "Book a slot"
 * to add a slot (and can untick to remove it and order ASAP). When false (default)
 * the picker forces a slot as before. `clampWindow`: the order type's operating
 * hours (delivery_time_allowed / takeaway_time_allowed) — rolling slots are
 * clamped to it so they never fall outside the delivery/takeaway open window.
 */
export function PrebookingPicker({
    settings,
    orderTypeKey,
    onChange,
    onValidityChange,
    accentColor = "#16a34a",
    className = "rounded-lg border p-4 space-y-3 bg-white",
    reservation = false,
    optional = false,
    clampWindow = null,
    timezone = null,
    preorderLeadMinutes = 0,
    preorderDaysKey = null,
    preorderNote = null,
}: {
    settings: PrebookingSettings;
    orderTypeKey: PrebookOrderType;
    onChange: (value: PrebookingSelection | null) => void;
    /** Fires with the "other time" input's error message (null = nothing wrong).
     *  Separate from `onChange` on purpose: an invalid typed time emits
     *  `onChange(null)`, which is byte-identical to "customer chose no slot" — the
     *  checkout MUST be able to tell those apart or it would place an unscheduled
     *  order while the customer is staring at a red error. Pass a stable setter
     *  (e.g. a useState setter) — it's an effect dependency. */
    onValidityChange?: (error: string | null) => void;
    accentColor?: string;
    className?: string;
    reservation?: boolean;
    optional?: boolean;
    clampWindow?: PrebookClampWindow;
    /** Restaurant IANA timezone — rolling slots + their window clamp are evaluated
     *  in it so an out-of-timezone customer isn't wrongly clamped. */
    timezone?: string | null;
    /** Extra notice demanded by a preorder item in the cart, in minutes (the MAX
     *  across the cart). Raises the earliest selectable date AND slot. */
    preorderLeadMinutes?: number;
    /** Weekdays the cart's preorder items permit, as a comma-joined string
     *  ("0,6"), or null for unrestricted. A STRING rather than an array on
     *  purpose: `dates` and `ranges` are memos keyed on their inputs, and a fresh
     *  array identity each render would re-run both every render — which in
     *  rolling mode fights the 60-second tick and visibly flips the chosen slot. */
    preorderDaysKey?: string | null;
    /** One line naming the dish that forced scheduling, shown when nothing is
     *  bookable so "no dates" doesn't read as a broken shop. */
    preorderNote?: string | null;
}) {
    const allowed = reservation ? true : isOrderTypeAllowed(settings, orderTypeKey);
    const [date, setDate] = useState<string>("");
    const [time, setTime] = useState<string>("");
    // Optional scheduling: the customer opts in via a checkbox instead of being
    // forced to pick a slot. `opted` is always true for forced (non-optional)
    // types, so their behavior is unchanged.
    const [opted, setOpted] = useState<boolean>(!optional);
    // Party size. Only collected for dine-in reservations when the partner turns
    // on "Ask number of people"; otherwise a fixed 1 still records the table
    // marker downstream (booking_persons) without prompting.
    const askPeople = reservation && !!settings.dine_in_ask_people_count;
    const MAX_PERSONS = 20;
    const [persons, setPersons] = useState<number>(askPeople ? 2 : 1);
    const [sheet, setSheet] = useState<null | "date" | "slot">(null);
    // Which selectors to show (partner config). When one is hidden it's still
    // auto-selected to its first option so the order carries a valid date + slot.
    const mode = (reservation ? settings.dine_in_picker_mode : settings.picker_mode) ?? "both";
    const showDate = mode !== "time_only";
    const showTime = mode !== "date_only";
    const slotMode = reservation ? settings.dine_in_slot_mode : settings.slot_mode;
    const isRolling = slotMode === "rolling";
    // Per-item preorder constraint, rebuilt from primitives so it changes identity
    // only when the cart's actual requirement changes.
    const preorderDays = useMemo<number[] | null>(() => {
        if (preorderDaysKey === null || preorderDaysKey === undefined) return null;
        // "" is the impossible-cart case (two items with no day in common) and must
        // stay an EMPTY array, not null — null means "no restriction".
        if (preorderDaysKey === "") return [];
        return preorderDaysKey
            .split(",")
            .map((d) => Number(d))
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    }, [preorderDaysKey]);
    // Applied to dine-in reservations too, deliberately: a cake that needs a day's
    // notice needs it whether the customer eats in or takes it away, so a table
    // booked for tonight must not be able to carry it. Exempting reservations
    // would leave dine-in as a hole straight through the rule.
    const preorderLead = Math.max(0, preorderLeadMinutes || 0);
    const preorderDaysArg = preorderDays;
    // Free "other time" input (partner opt-in, mirrors how `mode` picks its key).
    // Shown ALONGSIDE the preset slots, but only where a time is picked at all.
    const freeTimeAllowed =
        showTime && !!(reservation ? settings.dine_in_free_time_input : settings.free_time_input);
    // The typed time, kept separate from `time` (the preset pick) so the slot
    // lifecycle effect below doesn't treat it as an invalid slot and clear it.
    const [customTime, setCustomTime] = useState<string>("");
    // A typed time only counts while it's actually on screen (partner opted in,
    // order type schedulable, customer opted in) — one flag so the lifecycle /
    // validation / emit paths can never disagree about who owns the selection, and
    // so a hidden input can't leave an error blocking the parent's button.
    // `opted` is declared above; `allowed` guards the whole render below.
    const usingCustomTime = allowed && opted && freeTimeAllowed && !!customTime;
    // Tracks an explicit slot pick so a rolling refresh doesn't overwrite it.
    const [userPickedTime, setUserPickedTime] = useState(false);
    // Rolling slots roll with the clock; tick `now` each minute so the picker
    // refreshes them (e.g. 3:00, 3:15 → 3:01, 3:16 after a minute).
    const [now, setNow] = useState<Date>(() => new Date());
    useEffect(() => {
        // Windows mode used to freeze this clock at mount, which was harmless
        // while nothing depended on it advancing. Under a per-item NOTICE it is
        // not: the range clamp (now + lead) is computed from this `now`, so a
        // frozen clock keeps offering the slot that was earliest at mount while
        // the submit-time check moves on — the customer who spends a minute
        // reading the page is refused the only slot on screen, permanently.
        // Ticking only when a notice is in play leaves every existing partner's
        // behaviour untouched.
        if (!isRolling && preorderLead <= 0) return;
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, [isRolling, preorderLead]);

    // Reset the opt-in when the order type / optionality changes: forced types are
    // always opted-in; optional types start opted-out so the order can go ASAP
    // until the customer explicitly books a slot.
    useEffect(() => {
        setOpted(!optional);
        // A typed time is only meaningful against ONE order type's operating window,
        // so always drop it when the type changes — otherwise a value validated
        // against the old window lingers (and a stale error would wedge the parent's
        // Place Order button). Preset picks keep their existing optional-only reset.
        setCustomTime("");
        if (optional) {
            setDate("");
            setTime("");
            setUserPickedTime(false);
        }
    }, [optional, orderTypeKey, reservation]);

    // Clamp window as primitive deps so a fresh object identity each render doesn't
    // thrash the memos below.
    const clampFrom = clampWindow?.from ?? null;
    const clampTo = clampWindow?.to ?? null;


    // Dates: today … +30 days that have at least one slot (today is dropped
    // automatically if all its slots are past / under the min lead time).
    const dates = useMemo(
        () =>
            allowed
                ? getPrebookingDates(settings, now, {
                      dineIn: reservation,
                      fromOffset: 0,
                      throughDay: 30,
                      clampWindow: clampFrom && clampTo ? { from: clampFrom, to: clampTo } : null,
                      timezone,
                      extraLeadMinutes: preorderLead,
                      allowedDays: preorderDaysArg,
                  })
                : [],
        [allowed, settings, reservation, now, clampFrom, clampTo, timezone, preorderLead, preorderDaysArg],
    );
    // Slots are the partner's configured open ranges for the day (e.g. lunch +
    // dinner) — shown as "from – to", not every half-hour. The selection stores
    // the range's start as the scheduled time.
    const ranges = useMemo(
        () =>
            date
                ? getPrebookingRanges(settings, date, {
                      dineIn: reservation,
                      now,
                      clampWindow: clampFrom && clampTo ? { from: clampFrom, to: clampTo } : null,
                      timezone,
                      extraLeadMinutes: preorderLead,
                      allowedDays: preorderDaysArg,
                  })
                : [],
        [settings, date, reservation, now, clampFrom, clampTo, timezone, preorderLead, preorderDaysArg],
    );

    // Keep the chosen date valid, and auto-select the first available date so
    // there's always a sensible default (required when the date picker is hidden).
    // Skipped while opted out (optional + unchecked) so no slot is implied.
    useEffect(() => {
        if (!opted) return;
        if (date && !dates.some((d) => d.value === date)) {
            setDate("");
            setTime("");
            setCustomTime("");
        } else if (!date && dates.length > 0) {
            setDate(dates[0].value);
        }
    }, [dates, date, opted]);

    // Slot selection lifecycle.
    // - Windows: clear an invalid pick (e.g. after a date change), else auto-select first.
    // - Rolling: the auto-default is kept pointed at the soonest slot (rolls each
    //   minute via a DIRECT swap — no transient empty state that would emit null).
    //   A manual pick is an absolute time preserved until it passes, then re-defaults.
    // - A typed "other time" takes over: skip entirely so nothing auto-selects a
    //   preset behind it (clearing the input hands control straight back).
    useEffect(() => {
        if (!opted) return;
        if (usingCustomTime) return;
        // When the partner asks for a typed time, the slot list isn't rendered at all.
        // Auto-selecting behind it would submit a slot the customer never saw while the
        // time box still reads empty, so leave the selection unset until they type.
        if (freeTimeAllowed) {
            if (time) setTime("");
            return;
        }
        if (isRolling) {
            if (userPickedTime) {
                const [h, m] = (time || "0:0").split(":").map(Number);
                const pickedMin = (h || 0) * 60 + (m || 0);
                // The RESTAURANT's minute-of-day. Rolling slot strings are produced
                // by getRollingSlots from nowMinuteOfDay(now, timezone), so reading
                // the device clock here compares two different zones — for a Qatar
                // store's Indian customer that is 2.5 hours out, which both expires
                // live picks early and keeps dead ones. (The `pickedMin <= nowMin`
                // test below had the same flaw before this change.)
                const nowMin = restaurantMinuteOfDay(now, timezone);
                // A manual rolling pick is normally kept until it passes. Under a
                // per-item NOTICE it must also still be far enough out: the cart
                // can gain a 2-hour dish after the customer picked "in 15 minutes".
                //
                // Compared against the notice, NOT against membership of `ranges`:
                // rolling slots are regenerated every 60 seconds from `now`, so a
                // pick of 14:30 is absent from the 13:01 list purely because the
                // grid shifted, and a membership test threw away the customer's
                // choice a minute after they made it — including for a day-only
                // rule with no notice at all.
                const droppedByPreorder = preorderLead > 0 && pickedMin < nowMin + preorderLead;
                if (!time || pickedMin <= nowMin || droppedByPreorder) {
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
    }, [ranges, time, userPickedTime, isRolling, now, usingCustomTime, opted, freeTimeAllowed, preorderLead]);

    // Validate the typed time against the operating window + the day's ranges. This
    // picker is the ONE source of truth for typed-time validity: a non-null message
    // is shown inline, keeps the selection null, and is pushed to the checkout via
    // `onValidityChange` below — so the picker's red text and the disabled Place
    // Order button can never disagree.
    const customTimeError = useMemo(
        () =>
            usingCustomTime
                ? validateCustomPrebookTime(settings, date, customTime, {
                      dineIn: reservation,
                      now,
                      clampWindow: clampFrom && clampTo ? { from: clampFrom, to: clampTo } : null,
                      timezone,
                      extraLeadMinutes: preorderLead,
                      allowedDays: preorderDaysArg,
                  })
                : null,
        [usingCustomTime, customTime, settings, date, reservation, now, clampFrom, clampTo, timezone, preorderLead, preorderDaysArg],
    );
    // The time that actually gets booked: a valid typed time wins over the preset
    // (they're mutually exclusive — setting one clears the other), and an invalid
    // typed time resolves to nothing so placement stays blocked.
    const effectiveTime = usingCustomTime ? (customTimeError ? "" : customTime) : time;

    // Report typed-time validity upward, separately from the selection. The emit
    // below can only say "nothing selected" for an invalid typed time, which the
    // checkout's optional-mode guard reads as "customer wants ASAP" — so without
    // this the order would be placed unscheduled while the error is on screen.
    // The cleanup covers every way this input can stop being on screen (unmount,
    // order-type switch, opt-out, partner turning the setting off) so a stale
    // error can never wedge the Place Order button.
    useEffect(() => {
        onValidityChange?.(customTimeError);
        return () => onValidityChange?.(null);
    }, [customTimeError, onValidityChange]);

    // Report selection upward (null until fully chosen, or while opted out). timeTo
    // = the chosen range's end, so the order can show a full from–to slot. A typed
    // time is a point in time, so it emits from === to like a rolling slot does.
    useEffect(() => {
        const isCustom = usingCustomTime;
        const timeTo = isCustom ? effectiveTime : ranges.find((r) => r.from === time)?.to;
        if (!opted || !allowed || !date || !effectiveTime || (reservation && !persons)) {
            onChange(null);
        } else {
            const sel: PrebookingSelection = { date, time: effectiveTime, timeTo };
            if (isCustom) sel.customTime = true;
            onChange(reservation ? { ...sel, persons, dineIn: true } : sel);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opted, allowed, date, effectiveTime, usingCustomTime, persons, reservation]);

    // Prebooking doesn't apply to this order type → no picker, order proceeds.
    if (!allowed) return null;

    // Toggle the opt-in. Un-ticking removes any added slot (→ ASAP order).
    const toggleOpted = () => {
        setOpted((prev) => {
            const next = !prev;
            if (!next) {
                setDate("");
                setTime("");
                setCustomTime("");
                setUserPickedTime(false);
            }
            return next;
        });
    };

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

    // The date/slot booking body (shown when forced, or when the customer opted in).
    const bookingBody =
        dates.length === 0 ? (
            <div className="flex items-start gap-2 rounded-xl border-2 border-amber-100 bg-amber-50 p-3">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                {/* With a preorder item this branch is no longer a rare
                    misconfiguration — it is the ordinary "this dish can't be made
                    inside our booking times" case, so it has to name the dish.
                    "No booking dates are currently available" alone reads as a
                    broken shop and gives the customer nothing to act on. */}
                <p className="text-xs font-medium text-amber-800">
                    {preorderNote ||
                        "No booking dates are currently available. Please contact the restaurant."}
                </p>
            </div>
        ) : (
            <>
                <div className={`grid gap-2 ${showDate && showTime && !freeTimeAllowed ? "grid-cols-2" : "grid-cols-1"}`}>
                    {showDate && (
                        <button type="button" onClick={() => setSheet("date")} className={triggerCls}>
                            <span className="leading-tight">{dateLabel || "Select date"}</span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                        </button>
                    )}
                    {/* When the partner lets customers enter their own time, the preset
                        slot list is REPLACED by the time input below rather than shown
                        next to it — two competing time controls read as a bug. */}
                    {showTime && !freeTimeAllowed && (
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

                {freeTimeAllowed && (
                    // This REPLACES the slot list while the setting is on, so it is the
                    // only time control on screen — hence no "use a slot instead" escape.
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="time"
                                value={customTime}
                                // Browsers treat min > max on a time input as a window that
                                // wraps past midnight — same semantics as our validator.
                                min={clampFrom ?? undefined}
                                max={clampTo ?? undefined}
                                disabled={!date}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setCustomTime(v);
                                    if (v) {
                                        setTime("");
                                        setUserPickedTime(false);
                                    }
                                }}
                                // Tapping anywhere on the field opens the native clock,
                                // not just the tiny glyph at its right edge. showPicker()
                                // needs a user gesture (this click is one) and throws on
                                // browsers that don't support it, so it stays optional —
                                // the field is still a normal time input either way.
                                onClick={(e) => {
                                    try {
                                        (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                                    } catch {
                                        /* unsupported or blocked — the glyph still works */
                                    }
                                }}
                                aria-label="Enter your own time"
                                aria-invalid={!!customTimeError}
                                className={`flex-1 min-w-0 py-3 px-2.5 rounded-xl text-xs font-semibold border-2 bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                    customTimeError ? "border-red-300" : "border-gray-100"
                                }`}
                            />
                        </div>
                        <p className={`text-[11px] ${customTimeError ? "font-medium text-red-600" : "text-gray-400"}`}>
                            {/* Deliberately vague: what's enforced differs by slot mode
                                (opening hours vs. the configured ranges), and the exact
                                reason replaces this line the moment it's wrong. */}
                            {customTimeError || "Enter the time you'd like — we'll check it against our booking times."}
                        </p>
                    </div>
                )}

                {askPeople && (
                    <div className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl border-2 border-gray-100 bg-gray-50">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                            <Users className="h-4 w-4 text-gray-400" />
                            Number of people
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setPersons((p) => Math.max(1, p - 1))}
                                disabled={persons <= 1}
                                aria-label="Decrease"
                                className="h-7 w-7 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white text-gray-700 disabled:opacity-40"
                            >
                                <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm font-bold text-gray-900">{persons}</span>
                            <button
                                type="button"
                                onClick={() => setPersons((p) => Math.min(MAX_PERSONS, p + 1))}
                                disabled={persons >= MAX_PERSONS}
                                aria-label="Increase"
                                className="h-7 w-7 flex items-center justify-center rounded-full border-2 text-white disabled:opacity-40"
                                style={{ backgroundColor: accentColor, borderColor: accentColor }}
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
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
                                        setCustomTime("");
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
                                            // A preset pick overrides any typed time.
                                            setCustomTime("");
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
            </>
        );

    return (
        <div className={className}>
            {optional ? (
                // Opt-in row: ticking adds a slot; un-ticking removes it (order ASAP).
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={opted}
                        onChange={toggleOpted}
                        className="h-4 w-4 rounded border-gray-300"
                        style={{ accentColor }}
                    />
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        {reservation ? "Book a table slot" : "Prebook for later"}
                    </span>
                </label>
            ) : (
                <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                        {reservation ? "Slot booking" : "Book a slot"}
                    </span>
                </div>
            )}

            {opted && bookingBody}
        </div>
    );
}
