"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { PrebookingScope } from "@/store/orderStore";
import { formatLeadTime } from "@/lib/prebooking";

/**
 * "Applies to: all items / specific items" — the scope block shared by the
 * Prebooking and Slot Booking tabs.
 *
 * ONE component rather than two copies on purpose. The V1/V2 checkout modals in
 * this repo are the cautionary tale: two parallel implementations of the same
 * prebooking wiring that have already drifted (V1's Place Order button was
 * missing a guard V2 had). Two settings tabs editing the same shape would go the
 * same way.
 *
 * It owns no persistence. The parent tab holds the state and writes the whole
 * `prebooking_settings` column, because that is how both tabs already save and a
 * second writer would race them.
 */

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PAGE_SIZE = 10;

type MenuRow = { id: string; name: string };

/** Notice is stored in minutes; the editor shows whichever unit reads best. */
export type LeadUnit = "minutes" | "hours" | "days";
const UNIT_MINUTES: Record<LeadUnit, number> = { minutes: 1, hours: 60, days: 1440 };

/** Largest unit that divides exactly, so a saved 1440 comes back as "1 day"
 *  rather than "1440 minutes". */
export function splitLead(minutes: number): { value: number; unit: LeadUnit } {
    if (minutes > 0 && minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" };
    if (minutes > 0 && minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
    return { value: Math.max(0, minutes), unit: "minutes" };
}

export function leadToMinutes(value: number, unit: LeadUnit): number {
    return Math.max(0, Math.round(value)) * UNIT_MINUTES[unit];
}

export interface PreorderScopeValue {
    scope: PrebookingScope;
    itemIds: string[];
    leadValue: number;
    leadUnit: LeadUnit;
    days: number[];
}

export function PreorderScopePicker({
    partnerId,
    value,
    onChange,
    /** "order" (delivery/takeaway) or "table" (dine-in) — only affects wording. */
    kind,
    /** True when this tab is in rolling-slot mode, where a notice of more than a
     *  few hours can never be satisfied. */
    rolling = false,
}: {
    partnerId: string | undefined;
    value: PreorderScopeValue;
    onChange: (next: PreorderScopeValue) => void;
    kind: "order" | "table";
    rolling?: boolean;
}) {
    const [loading, setLoading] = useState(true);
    const [menu, setMenu] = useState<MenuRow[]>([]);
    const [loadError, setLoadError] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // Only fetch the menu once the partner actually scopes — an unscoped store
    // never opens this list, and the query is unbounded.
    const needsMenu = value.scope === "items";
    const [reloadKey, setReloadKey] = useState(0);
    useEffect(() => {
        if (!partnerId || !needsMenu || menu.length) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setLoadError(false);
            try {
                const res = await fetchFromHasura(
                    `query PreorderScopeMenu($partner_id: uuid!) {
                        menu(
                            where: { partner_id: { _eq: $partner_id }, deletion_status: { _eq: 0 } }
                            order_by: { priority: asc }
                        ) { id name }
                    }`,
                    { partner_id: partnerId },
                );
                if (!cancelled) setMenu(res?.menu || []);
            } catch (e) {
                console.error("[PreorderScope] menu fetch failed:", e);
                if (!cancelled) {
                    // MUST be distinguishable from an empty menu. Rendering "You
                    // don't have any menu items yet" after a failed fetch invites
                    // the partner to conclude their dishes are gone — and the
                    // selected-item chips below would be the only thing standing
                    // between them and clearing a list they can't see.
                    setLoadError(true);
                    toast.error("Couldn't load your menu");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [partnerId, needsMenu, menu.length, reloadKey]);

    const selected = useMemo(() => new Set(value.itemIds), [value.itemIds]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return menu;
        return menu.filter((m) => m.name.toLowerCase().includes(q));
    }, [menu, search]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    // Clamp rather than trust: filtering shrinks the list under the cursor, and a
    // page left over from the previous filter would render empty, which reads as
    // "no items" rather than "you scrolled past the end".
    const safePage = Math.min(page, pageCount);
    const paged = useMemo(
        () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [filtered, safePage],
    );
    useEffect(() => {
        setPage(1);
    }, [search]);

    const set = (patch: Partial<PreorderScopeValue>) => onChange({ ...value, ...patch });

    const toggleItem = (id: string, on: boolean) =>
        set({
            itemIds: on ? [...value.itemIds, id] : value.itemIds.filter((x) => x !== id),
        });

    const toggleDay = (day: number) =>
        set({
            days: value.days.includes(day)
                ? value.days.filter((d) => d !== day)
                : [...value.days, day].sort((a, b) => a - b),
        });

    const leadMinutes = leadToMinutes(value.leadValue, value.leadUnit);
    const noun = kind === "table" ? "table booking" : "scheduling";

    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label>Applies to</Label>
                <p className="text-xs text-muted-foreground">
                    {kind === "table"
                        ? "Ask every customer to book a table, or only those ordering certain dishes."
                        : "Offer scheduling on every order, or only on orders containing certain dishes — a cake you need a day's notice for, say."}
                </p>
                <Select
                    value={value.scope}
                    onValueChange={(v) => set({ scope: v as PrebookingScope })}
                >
                    <SelectTrigger className="w-full bg-white sm:w-[260px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All items</SelectItem>
                        <SelectItem value="items">Specific items only</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {value.scope === "items" && (
                <div className="space-y-4 rounded-lg border p-3">
                    {/* An empty list means "applies to nothing", which would read as
                        the feature being broken. The checkout treats it as unscoped
                        and this says so, rather than failing silently. */}
                    {value.itemIds.length === 0 && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <p className="text-sm text-amber-800">
                                Pick at least one item below. Until you do, {noun} keeps applying to
                                every order.
                            </p>
                        </div>
                    )}

                    {rolling && leadMinutes > 0 && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <p className="text-sm text-amber-800">
                                Your slot type is &ldquo;Rolling from now&rdquo;, which only offers
                                times later today. A notice of {formatLeadTime(leadMinutes)} can&apos;t
                                be met, so customers would see no available times — switch to
                                &ldquo;Fixed time ranges&rdquo; above.
                            </p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs">Notice required</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min={0}
                                value={String(value.leadValue)}
                                onChange={(e) =>
                                    set({ leadValue: Math.max(0, parseInt(e.target.value) || 0) })
                                }
                                className="h-9 w-24 bg-white"
                            />
                            <Select
                                value={value.leadUnit}
                                onValueChange={(v) => set({ leadUnit: v as LeadUnit })}
                            >
                                <SelectTrigger className="h-9 w-[120px] bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="minutes">Minutes</SelectItem>
                                    <SelectItem value="hours">Hours</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            How far ahead these items must be ordered. 0 still asks the customer to
                            pick a time.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Only made on</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {DAY_LABELS.map((label, day) => {
                                const active = value.days.includes(day);
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                            active
                                                ? "border-orange-500 bg-orange-500 text-white"
                                                : "border-gray-200 bg-white text-gray-600"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Leave all unselected to allow any day you take bookings.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search items..."
                                    className="bg-white pl-10"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {value.itemIds.length} selected
                            </span>
                        </div>

                        {loading && !menu.length ? (
                            <div className="space-y-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {paged.map((item) => (
                                    <label
                                        key={item.id}
                                        className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2.5"
                                    >
                                        <Checkbox
                                            checked={selected.has(item.id)}
                                            onCheckedChange={(c) => toggleItem(item.id, !!c)}
                                        />
                                        <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                                    </label>
                                ))}
                                {filtered.length === 0 &&
                                    (loadError ? (
                                        <div className="flex flex-col items-center gap-2 py-6">
                                            <p className="text-sm text-red-600">
                                                Couldn&apos;t load your menu. Your selected items are safe.
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="bg-white"
                                                onClick={() => setReloadKey((k) => k + 1)}
                                            >
                                                Try again
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="py-6 text-center text-sm text-muted-foreground">
                                            {menu.length === 0
                                                ? "You don't have any menu items yet."
                                                : "No items found matching your search."}
                                        </p>
                                    ))}
                            </div>
                        )}

                        {/* Selected items that the current filter/page hides — otherwise
                            "3 selected" with an empty-looking list is unexplainable, and
                            a partner cannot un-pick a dish they can't find. */}
                        {value.itemIds.filter((id) => !paged.some((m) => m.id === id)).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {value.itemIds
                                    .filter((id) => !paged.some((m) => m.id === id))
                                    .map((id) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => toggleItem(id, false)}
                                            className="rounded-full border bg-gray-50 px-2.5 py-1 text-xs text-gray-700 hover:border-red-300 hover:text-red-600"
                                            title="Remove"
                                        >
                                            {menu.find((m) => m.id === id)?.name ?? "Selected item"} ×
                                        </button>
                                    ))}
                            </div>
                        )}

                        {filtered.length > PAGE_SIZE && (
                            <div className="flex items-center justify-between gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="bg-white"
                                    onClick={() => setPage(Math.max(1, safePage - 1))}
                                    disabled={safePage <= 1}
                                >
                                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                    {(safePage - 1) * PAGE_SIZE + 1}–
                                    {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="bg-white"
                                    onClick={() => setPage(Math.min(pageCount, safePage + 1))}
                                    disabled={safePage >= pageCount}
                                >
                                    Next <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
