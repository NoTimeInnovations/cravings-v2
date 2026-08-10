"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CalendarClock, ChevronLeft, ChevronRight, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { useAuthStore } from "@/store/authStore";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { ItemPreorderRule } from "@/store/orderStore";
import { mergePrebookingConfig, normalizeItemPreorder, formatLeadTime } from "@/lib/prebooking";

/**
 * Preorder Items — "this dish needs notice".
 *
 * A cake that must be baked, a biryani only made on Sundays. Marking a dish here
 * makes scheduling MANDATORY for any cart containing it (even when "Make it
 * optional" is on in the Prebooking tab) and pushes the earliest bookable slot
 * out by the dish's notice.
 *
 * ── Where the config lives ────────────────────────────────────────────────────
 *
 * In `partners.prebooking_settings.item_preorder`, keyed by menu item id — NOT a
 * column on `menu`. Two reasons, both load-bearing:
 *   1. items added to a cart from an OFFER card carry a reduced menu selection,
 *      so a menu column would read `undefined` at checkout and the rule would
 *      silently never fire for promoted dishes;
 *   2. `prebooking_settings` is already selected by the storefront query and both
 *      auth queries, so nothing else has to learn a new field.
 *
 * ── The save is a FULL-COLUMN overwrite ───────────────────────────────────────
 *
 * Like the two sibling tabs, this writes the whole `prebooking_settings` column
 * (there is no field-level patch). It rebuilds from mergePrebookingConfig(raw) so
 * a save here cannot drop a setting owned by Prebooking or Slot Booking — and
 * `item_preorder` is in that whitelist for the mirror-image reason.
 */

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PAGE_SIZE = 10;

type MenuRow = { id: string; name: string };

/** Notice is stored in minutes; the editor shows whichever unit reads best. */
type Unit = "minutes" | "hours" | "days";
const UNIT_MINUTES: Record<Unit, number> = { minutes: 1, hours: 60, days: 1440 };

/** Pick the largest unit that divides the value exactly, so 1440 shows as "1 day"
 *  rather than "1440 minutes" when a saved config is loaded back. */
function splitLead(minutes: number): { value: number; unit: Unit } {
    if (minutes > 0 && minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" };
    if (minutes > 0 && minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
    return { value: minutes, unit: "minutes" };
}

/** Editor state for one dish. `value`/`unit` are kept apart from the stored
 *  minutes so typing "0" or switching unit mid-edit doesn't round-trip badly. */
type Draft = { value: number; unit: Unit; days: number[] };

const DEFAULT_DRAFT: Draft = { value: 24, unit: "hours", days: [] };

function draftToRule(d: Draft): ItemPreorderRule {
    return {
        lead_minutes: Math.max(0, Math.round(d.value)) * UNIT_MINUTES[d.unit],
        days: d.days.slice().sort((a, b) => a - b),
    };
}

function rulesEqual(a: Record<string, ItemPreorderRule>, b: Record<string, ItemPreorderRule>): boolean {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every(
        (k) =>
            a[k].lead_minutes === b[k].lead_minutes &&
            (a[k].days ?? []).join(",") === (b[k].days ?? []).join(","),
    );
}

export function PreorderItemsSettings() {
    const { userData, setState } = useAuthStore();
    const { setSaveAction, setHasChanges, setIsSaving } = useAdminSettingsStore();

    const [loading, setLoading] = useState(true);
    const [menu, setMenu] = useState<MenuRow[]>([]);
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [saved, setSaved] = useState<Record<string, ItemPreorderRule>>({});
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const partnerId = (userData as any)?.id as string | undefined;
    const cfg = useMemo(
        () => mergePrebookingConfig((userData as any)?.prebooking_settings),
        [(userData as any)?.prebooking_settings],
    );

    // Load the menu once, and seed the drafts from what's saved.
    useEffect(() => {
        if (!partnerId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetchFromHasura(
                    `query PreorderMenu($partner_id: uuid!) {
                        menu(
                            where: { partner_id: { _eq: $partner_id }, deletion_status: { _eq: 0 } }
                            order_by: { priority: asc }
                        ) { id name }
                    }`,
                    { partner_id: partnerId },
                );
                if (cancelled) return;
                setMenu(res?.menu || []);
            } catch (e) {
                console.error("[PreorderItems] menu fetch failed:", e);
                if (!cancelled) toast.error("Couldn't load your menu");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [partnerId]);

    useEffect(() => {
        const rules = normalizeItemPreorder(cfg.item_preorder);
        setSaved(rules);
        const next: Record<string, Draft> = {};
        for (const [id, r] of Object.entries(rules)) {
            const { value, unit } = splitLead(r.lead_minutes);
            next[id] = { value, unit, days: r.days ?? [] };
        }
        setDrafts(next);
    }, [cfg]);

    // What would be written right now.
    const pending = useMemo(() => {
        const out: Record<string, ItemPreorderRule> = {};
        for (const [id, d] of Object.entries(drafts)) out[id] = draftToRule(d);
        return out;
    }, [drafts]);

    const handleSave = useCallback(async () => {
        if (!partnerId) return;
        // Drop rules for dishes that no longer exist, so the blob can't grow
        // forever. Guarded on a non-empty menu: pruning against a failed fetch
        // would silently wipe every rule the partner has.
        const pruned = menu.length
            ? Object.fromEntries(Object.entries(pending).filter(([id]) => menu.some((m) => m.id === id)))
            : pending;
        // The sibling tabs never set this, which leaves `disabled={isSaving}` on
        // the floating button dead — and this save is a FULL-COLUMN overwrite, so
        // a double-click fires two of them.
        setIsSaving(true);
        try {
            const payload = JSON.stringify({ ...cfg, item_preorder: pruned });
            await updatePartner(partnerId, { prebooking_settings: payload });
            revalidateTag(partnerId);
            setState({ prebooking_settings: payload } as any);
            setSaved(pruned);
            toast.success("Preorder items saved");
            setHasChanges(false);
        } catch (e) {
            console.error("[PreorderItems] save failed:", e);
            toast.error("Failed to save preorder items");
        } finally {
            setIsSaving(false);
        }
    }, [partnerId, cfg, pending, menu, setState, setHasChanges, setIsSaving]);

    // Register the floating Save, but only while something actually changed —
    // the sibling tabs mark themselves dirty on load, which makes it far too easy
    // to press Save and write back a stale copy of the whole column.
    const dirty = !rulesEqual(pending, saved);
    useEffect(() => {
        setHasChanges(dirty);
        setSaveAction(dirty ? handleSave : null);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [dirty, handleSave, setSaveAction, setHasChanges]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return menu;
        return menu.filter((m) => m.name.toLowerCase().includes(q));
    }, [menu, search]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    // Clamp rather than trust: filtering shrinks the list under the cursor, and a
    // page number left over from the previous filter would render an empty list
    // that reads as "no items".
    const safePage = Math.min(page, pageCount);
    const paged = useMemo(
        () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [filtered, safePage],
    );
    useEffect(() => {
        setPage(1);
    }, [search]);

    const enabledCount = Object.keys(pending).length;
    // Rolling slots are all "later today", so a notice measured in days can never
    // be satisfied and the customer would see an empty date list.
    const rollingWarning =
        cfg.slot_mode === "rolling" && enabledCount > 0
            ? "Your slot type is “Rolling from now”, which only offers times later today. Items needing more than a few hours' notice can't be booked at all — switch the Prebooking tab to “Fixed time ranges”."
            : null;
    const prebookingOff = cfg.prebooking_enabled === false && enabledCount > 0;

    const toggleItem = (id: string, on: boolean) =>
        setDrafts((prev) => {
            const next = { ...prev };
            if (on) next[id] = prev[id] ?? { ...DEFAULT_DRAFT };
            else delete next[id];
            return next;
        });

    const patchItem = (id: string, patch: Partial<Draft>) =>
        setDrafts((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));

    const toggleDay = (id: string, day: number) =>
        setDrafts((prev) => {
            const d = prev[id];
            if (!d) return prev;
            const days = d.days.includes(day) ? d.days.filter((x) => x !== day) : [...d.days, day];
            return { ...prev, [id]: { ...d, days: days.sort((a, b) => a - b) } };
        });

    if (loading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5" />
                        Preorder Items
                    </CardTitle>
                    <CardDescription>
                        Mark the dishes you need notice for. When a customer&apos;s basket contains one,
                        checkout asks them to schedule the order and only offers slots far enough ahead.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {prebookingOff && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <p className="text-sm text-amber-800">
                                Prebooking is switched off, so customers have no way to choose a time and these
                                items can&apos;t be scheduled. Turn it on in the Prebooking tab — and switch on
                                &ldquo;Make it optional&rdquo; there if you only want scheduling for these dishes.
                            </p>
                        </div>
                    )}
                    {rollingWarning && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <p className="text-sm text-amber-800">{rollingWarning}</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
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
                            {enabledCount === 0
                                ? "No preorder items yet"
                                : `${enabledCount} item${enabledCount === 1 ? "" : "s"} need notice`}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {paged.map((item) => {
                            const draft = drafts[item.id];
                            const on = !!draft;
                            return (
                                <div key={item.id} className="rounded-lg border p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate font-medium">{item.name}</div>
                                            {on && (
                                                <div className="text-xs text-muted-foreground">
                                                    {draftToRule(draft).lead_minutes > 0
                                                        ? `Needs ${formatLeadTime(draftToRule(draft).lead_minutes)} notice`
                                                        : "Must be scheduled"}
                                                    {draft.days.length > 0 &&
                                                        ` · only ${draft.days.map((d) => DAY_LABELS[d]).join(", ")}`}
                                                </div>
                                            )}
                                        </div>
                                        <Switch checked={on} onCheckedChange={(c) => toggleItem(item.id, !!c)} />
                                    </div>

                                    {on && (
                                        <div className="mt-3 space-y-3 border-t pt-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Notice required</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={String(draft.value)}
                                                        onChange={(e) =>
                                                            patchItem(item.id, {
                                                                value: Math.max(0, parseInt(e.target.value) || 0),
                                                            })
                                                        }
                                                        className="h-9 w-24 bg-white"
                                                    />
                                                    <Select
                                                        value={draft.unit}
                                                        onValueChange={(v) => patchItem(item.id, { unit: v as Unit })}
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
                                                    How far ahead the order must be placed. 0 still forces the customer
                                                    to choose a slot.
                                                </p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Only made on</Label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {DAY_LABELS.map((label, day) => {
                                                        const active = draft.days.includes(day);
                                                        return (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => toggleDay(item.id, day)}
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
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {filtered.length === 0 && (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                {menu.length === 0
                                    ? "You don't have any menu items yet."
                                    : "No items found matching your search."}
                            </p>
                        )}
                    </div>

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
                                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
                                {filtered.length}
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
                </CardContent>
            </Card>
        </div>
    );
}
