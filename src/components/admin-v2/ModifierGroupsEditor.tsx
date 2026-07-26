"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import type { ModifierGroup, ModifierOption } from "@/store/menuStore_hasura";

interface ModifierGroupsEditorProps {
    value: ModifierGroup[];
    onChange: (groups: ModifierGroup[]) => void;
    /** Read-only (e.g. Petpooja-owned menus) — hides add/remove controls. */
    disabled?: boolean;
    currencySymbol?: string;
}

export function createEmptyOption(): ModifierOption {
    return { id: uuidv4(), name: "", price: 0 };
}

export function createEmptyGroup(): ModifierGroup {
    return { id: uuidv4(), name: "", min: 0, max: 1, options: [createEmptyOption()] };
}

/** Drop half-filled rows and clamp min/max so we never persist junk.
 *  Call this before saving to the DB. */
export function sanitizeModifierGroups(groups: ModifierGroup[]): ModifierGroup[] {
    return (groups || [])
        .map((g) => {
            const options = (g.options || [])
                .filter((o) => (o.name || "").trim() !== "")
                .map((o) => ({
                    ...o,
                    name: o.name.trim(),
                    price: Number(o.price) || 0,
                }));
            let max = g.max === 1 ? 1 : Math.max(2, Math.floor(Number(g.max) || 2));
            if (options.length <= 1) max = 1;
            else if (max > options.length) max = options.length;
            const min = Math.min(Math.max(0, Math.floor(Number(g.min) || 0)), max);
            return { ...g, name: (g.name || "").trim(), min, max, options };
        })
        .filter((g) => g.name !== "" && g.options.length > 0);
}

/** Human-readable summary of a group's selection rule. */
function ruleText(g: ModifierGroup): string {
    const req = g.min >= 1 ? "Required" : "Optional";
    const sel = g.max === 1 ? "choose 1" : `choose up to ${g.max}`;
    return `${req} · ${sel}`;
}

export function ModifierGroupsEditor({
    value,
    onChange,
    disabled = false,
    currencySymbol = "₹",
}: ModifierGroupsEditorProps) {
    const patchGroup = (gi: number, patch: Partial<ModifierGroup>) =>
        onChange(value.map((g, i) => (i === gi ? { ...g, ...patch } : g)));

    const patchOption = (gi: number, oi: number, patch: Partial<ModifierOption>) =>
        patchGroup(gi, {
            options: value[gi].options.map((o, i) => (i === oi ? { ...o, ...patch } : o)),
        });

    const addGroup = () => onChange([...value, createEmptyGroup()]);
    const removeGroup = (gi: number) => onChange(value.filter((_, i) => i !== gi));
    const addOption = (gi: number) =>
        patchGroup(gi, { options: [...value[gi].options, createEmptyOption()] });
    const removeOption = (gi: number, oi: number) =>
        patchGroup(gi, { options: value[gi].options.filter((_, i) => i !== oi) });

    const setSingle = (gi: number) =>
        patchGroup(gi, { max: 1, min: Math.min(value[gi].min, 1) });
    const setMultiple = (gi: number) =>
        patchGroup(gi, { max: Math.max(2, value[gi].options.length) });

    // Single-select: exactly one default (radio). Multi-select: toggle (checkbox).
    const setDefaultSingle = (gi: number, oi: number) =>
        patchGroup(gi, {
            options: value[gi].options.map((o, i) => ({ ...o, is_default: i === oi })),
        });

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>Customizations</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md">
                        Let customers customize this item — choose base, patty, cheese, extra
                        toppings, etc. Option prices are added on top of the item price.
                    </p>
                </div>
                {!disabled && (
                    <Button type="button" variant="outline" size="sm" onClick={addGroup}>
                        <Plus className="h-4 w-4 mr-2" /> Add Group
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {value.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No customizations added.
                    </p>
                ) : (
                    value.map((group, gi) => (
                        <div
                            key={group.id}
                            className="border rounded-lg p-4 space-y-3 bg-muted/30"
                        >
                            {/* Group name + delete */}
                            <div className="flex items-start gap-2">
                                <Input
                                    placeholder="Group name (e.g. Choose your patty)"
                                    value={group.name}
                                    disabled={disabled}
                                    onChange={(e) => patchGroup(gi, { name: e.target.value })}
                                    className="font-medium"
                                />
                                {!disabled && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeGroup(gi)}
                                        title="Remove group"
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>

                            {/* Selection rules */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex rounded-md border overflow-hidden">
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        className={cn(
                                            "px-3 py-1.5 text-sm transition-colors disabled:opacity-60",
                                            group.max === 1
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background hover:bg-accent"
                                        )}
                                        onClick={() => setSingle(gi)}
                                    >
                                        Single choice
                                    </button>
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        className={cn(
                                            "px-3 py-1.5 text-sm transition-colors disabled:opacity-60",
                                            group.max !== 1
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background hover:bg-accent"
                                        )}
                                        onClick={() => setMultiple(gi)}
                                    >
                                        Multiple choice
                                    </button>
                                </div>

                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <Switch
                                        checked={group.min >= 1}
                                        disabled={disabled}
                                        onCheckedChange={(c) => patchGroup(gi, { min: c ? 1 : 0 })}
                                    />
                                    Required
                                </label>

                                {group.max !== 1 && (
                                    <label className="flex items-center gap-2 text-sm">
                                        Max
                                        <Input
                                            type="number"
                                            min={2}
                                            className="w-20 h-8"
                                            value={group.max}
                                            disabled={disabled}
                                            onChange={(e) =>
                                                patchGroup(gi, {
                                                    max: Math.max(2, parseInt(e.target.value) || 2),
                                                })
                                            }
                                        />
                                    </label>
                                )}

                                <span className="text-xs text-muted-foreground ml-auto">
                                    {ruleText(group)}
                                </span>
                            </div>

                            {/* Options */}
                            <div className="space-y-2">
                                {group.options.map((opt, oi) => (
                                    <div key={opt.id} className="flex items-center gap-2">
                                        {group.max === 1 ? (
                                            <input
                                                type="radio"
                                                name={`default-${group.id}`}
                                                checked={!!opt.is_default}
                                                disabled={disabled}
                                                onChange={() => setDefaultSingle(gi, oi)}
                                                title="Preselected by default"
                                                className="accent-primary shrink-0"
                                            />
                                        ) : (
                                            <input
                                                type="checkbox"
                                                checked={!!opt.is_default}
                                                disabled={disabled}
                                                onChange={() =>
                                                    patchOption(gi, oi, { is_default: !opt.is_default })
                                                }
                                                title="Preselected by default"
                                                className="accent-primary shrink-0"
                                            />
                                        )}
                                        <Input
                                            placeholder="Option (e.g. Double patty)"
                                            value={opt.name}
                                            disabled={disabled}
                                            onChange={(e) =>
                                                patchOption(gi, oi, { name: e.target.value })
                                            }
                                            className="flex-1"
                                        />
                                        <div className="relative w-28 shrink-0">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                                +{currencySymbol}
                                            </span>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={opt.price}
                                                disabled={disabled}
                                                onChange={(e) =>
                                                    patchOption(gi, oi, {
                                                        price: parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                className="pl-9"
                                            />
                                        </div>
                                        {!disabled && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeOption(gi, oi)}
                                                title="Remove option"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {!disabled && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => addOption(gi)}
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> Add option
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
