// Prebooking (scheduled orders) helpers shared by the checkout modals.
// All times are treated as restaurant-local; no timezone conversion is applied
// (the customer's device clock is used to filter past/too-soon slots).

import { PrebookingSettings } from "@/store/orderStore";
import { getFeatures } from "@/lib/getFeatures";

/** Slot granularity offered to the customer, in minutes. */
export const PREBOOK_SLOT_INTERVAL_MIN = 30;

export type PrebookOrderType = "delivery" | "takeaway" | "dine_in";

export function parsePrebookingSettings(raw: unknown): PrebookingSettings | null {
    if (!raw) return null;
    try {
        const p = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!p || typeof p !== "object") return null;
        return p as PrebookingSettings;
    } catch {
        return null;
    }
}

/** True when the partner has the prebooking flag enabled and valid settings. */
export function isPrebookingEnabled(featureFlags: string | null | undefined): boolean {
    return !!getFeatures(featureFlags || null).prebooking?.enabled;
}

/** Map a cravings order to the prebooking order-type key. */
export function resolvePrebookOrderType(
    type?: string | null,
    isTakeaway?: boolean
): PrebookOrderType {
    if (type === "table_order") return "dine_in";
    if (type === "delivery" && isTakeaway) return "takeaway";
    return "delivery";
}

export function isOrderTypeAllowed(
    settings: PrebookingSettings,
    orderType: PrebookOrderType
): boolean {
    return (settings.allowed_order_types ?? []).includes(orderType);
}

function toMinutes(hhmm: string): number {
    const [h, m] = (hhmm || "00:00").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

function fmt(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
}

/**
 * Valid "HH:MM" slots for a given date, within that weekday's enabled window and
 * at least `min_lead_time_minutes` from now (absolute, so multi-day lead times work).
 */
export function getPrebookingSlots(
    settings: PrebookingSettings,
    dateStr: string,
    now: Date = new Date()
): string[] {
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return [];
    const weekday = date.getDay();
    const win = (settings.windows ?? []).find((w) => w.day === weekday);
    if (!win || !win.enabled) return [];

    const start = toMinutes(win.from);
    const end = toMinutes(win.to);
    if (end <= start) return [];

    const earliestAbs = now.getTime() + (settings.min_lead_time_minutes ?? 0) * 60_000;
    const slots: string[] = [];
    for (let t = start; t <= end; t += PREBOOK_SLOT_INTERVAL_MIN) {
        const slotAbs = new Date(`${dateStr}T${fmt(t)}:00`).getTime();
        if (slotAbs < earliestAbs) continue;
        slots.push(fmt(t));
    }
    return slots;
}

/** Selectable dates (today … max_advance_days) that have at least one valid slot. */
export function getPrebookingDates(
    settings: PrebookingSettings,
    now: Date = new Date()
): { value: string; label: string }[] {
    const out: { value: string; label: string }[] = [];
    const maxDays = Math.max(0, settings.max_advance_days ?? 0);
    for (let i = 0; i <= maxDays; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const dateStr = ymd(d);
        if (getPrebookingSlots(settings, dateStr, now).length === 0) continue;
        const label =
            i === 0
                ? "Today"
                : i === 1
                  ? "Tomorrow"
                  : d.toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                    });
        out.push({ value: dateStr, label });
    }
    return out;
}

/** "14:30" -> "2:30 PM" for display. */
export function formatSlotLabel(hhmm: string): string {
    const [h24, m] = (hhmm || "00:00").split(":").map(Number);
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** "2026-06-10" -> "Wed, 10 Jun" for display (or Today/Tomorrow). */
export function formatPrebookDateLabel(dateStr: string, now: Date = new Date()): string {
    if (!dateStr) return "";
    if (dateStr === ymd(now)) return "Today";
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (dateStr === ymd(tomorrow)) return "Tomorrow";
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
