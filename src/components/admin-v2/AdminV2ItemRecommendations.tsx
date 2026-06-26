"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft,
    Search,
    Plus,
    Check,
    X,
    ArrowUp,
    ArrowDown,
    Sparkles,
    UtensilsCrossed,
} from "lucide-react";
import { useMenuStore, MenuItem } from "@/store/menuStore_hasura";
import { useAuthStore, Partner } from "@/store/authStore";
import { formatPrice } from "@/lib/constants";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import Img from "../Img";
import { toast } from "sonner";

interface AdminV2ItemRecommendationsProps {
    item: MenuItem;
    onBack: (itemId?: string) => void;
}

// Smallest meaningful price for an item (base price, or cheapest variant).
function displayPrice(item: MenuItem): number {
    if (item.variants && item.variants.length > 0) {
        return Math.min(...item.variants.map((v) => v.price ?? 0));
    }
    return item.price ?? 0;
}

export function AdminV2ItemRecommendations({ item, onBack }: AdminV2ItemRecommendationsProps) {
    const { items: menu, setRecommendations } = useMenuStore();
    const { userData } = useAuthStore();
    const currency = (userData as Partner)?.currency || "₹";

    const [search, setSearch] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Candidate pool: every other item in the menu (the current item can't
    // recommend itself).
    const candidates = useMemo(
        () => menu.filter((m) => m.id && m.id !== item.id),
        [menu, item.id],
    );

    const byId = useMemo(() => {
        const map = new Map<string, MenuItem>();
        candidates.forEach((m) => map.set(m.id as string, m));
        return map;
    }, [candidates]);

    // Selected ids, in display order. Seed from the item's saved recommendations,
    // dropping any that no longer resolve to a live menu item.
    const [selectedIds, setSelectedIds] = useState<string[]>(() =>
        (item.recommendations || []).filter((id) => menu.some((m) => m.id === id && m.id !== item.id)),
    );

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const filteredCandidates = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = q
            ? candidates.filter(
                  (m) =>
                      m.name.toLowerCase().includes(q) ||
                      formatDisplayName(m.category?.name || "").toLowerCase().includes(q),
              )
            : candidates;
        // Unselected first, then selected — keeps the "add" affordance prominent.
        return [...list].sort((a, b) => {
            const aSel = selectedSet.has(a.id as string) ? 1 : 0;
            const bSel = selectedSet.has(b.id as string) ? 1 : 0;
            if (aSel !== bSel) return aSel - bSel;
            return a.name.localeCompare(b.name);
        });
    }, [candidates, search, selectedSet]);

    const toggle = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const remove = (id: string) => setSelectedIds((prev) => prev.filter((x) => x !== id));

    const move = (index: number, dir: -1 | 1) => {
        setSelectedIds((prev) => {
            const next = [...prev];
            const target = index + dir;
            if (target < 0 || target >= next.length) return prev;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            // Reciprocal: this also adds/removes the current item from each
            // selected item's own list (A → B implies B → A).
            await setRecommendations(item.id!, selectedIds);
            onBack(item.id!);
        } catch (error) {
            console.error("Failed to save recommendations:", error);
            toast.error("Failed to save recommendations");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => onBack()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            Recommendations
                        </h2>
                        <p className="text-muted-foreground">
                            Pick items to suggest when <span className="font-medium text-foreground">{item.name}</span> is added to the cart
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isSubmitting} className="hidden sm:inline-flex">
                    {isSubmitting ? "Saving..." : `Save${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Candidate picker */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add items</CardTitle>
                            <div className="relative pt-2">
                                <Search className="absolute left-2.5 top-[1.15rem] h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search items by name or category..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredCandidates.length === 0 ? (
                                <div className="text-center py-10 text-sm text-muted-foreground">
                                    {candidates.length === 0
                                        ? "No other menu items to recommend yet."
                                        : "No items match your search."}
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                    {filteredCandidates.map((m) => {
                                        const id = m.id as string;
                                        const isSel = selectedSet.has(id);
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => toggle(id)}
                                                className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${
                                                    isSel
                                                        ? "border-primary/40 bg-primary/5"
                                                        : "bg-card hover:bg-accent"
                                                }`}
                                            >
                                                <div className="h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted">
                                                    {m.image_url ? (
                                                        <Img src={m.image_url} alt={m.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                            <UtensilsCrossed className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium">{m.name}</p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {formatDisplayName(m.category?.name || "")} · {currency}
                                                        {formatPrice(displayPrice(m), userData?.id)}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${
                                                        isSel ? "bg-primary text-primary-foreground" : "border text-muted-foreground"
                                                    }`}
                                                >
                                                    {isSel ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Selected / ordered list */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Selected</span>
                                <span className="text-sm font-normal text-muted-foreground">
                                    {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedIds.length === 0 ? (
                                <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                                    No recommendations yet.
                                    <br />
                                    Tap items on the left to add them.
                                </div>
                            ) : (
                                <>
                                    <p className="mb-3 text-xs text-muted-foreground">
                                        Shown in this order on the storefront.
                                    </p>
                                    <div className="space-y-2">
                                        {selectedIds.map((id, index) => {
                                            const m = byId.get(id);
                                            if (!m) return null;
                                            return (
                                                <div
                                                    key={id}
                                                    className="flex items-center gap-2 rounded-lg border bg-card p-2"
                                                >
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                                                        {index + 1}
                                                    </span>
                                                    <div className="h-9 w-9 shrink-0 rounded-md overflow-hidden bg-muted">
                                                        {m.image_url ? (
                                                            <Img src={m.image_url} alt={m.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                                <UtensilsCrossed className="h-3.5 w-3.5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</p>
                                                    <div className="flex shrink-0 items-center">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            disabled={index === 0}
                                                            onClick={() => move(index, -1)}
                                                            aria-label="Move up"
                                                        >
                                                            <ArrowUp className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            disabled={index === selectedIds.length - 1}
                                                            onClick={() => move(index, 1)}
                                                            aria-label="Move down"
                                                        >
                                                            <ArrowDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => remove(id)}
                                                            aria-label="Remove"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" className="w-full" onClick={() => onBack()}>
                            Cancel
                        </Button>
                        <Button type="button" className="w-full" onClick={handleSave} disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
