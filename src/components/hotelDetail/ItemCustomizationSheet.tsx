"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/constants";
import { MenuPrice } from "./MenuPrice";
import useOrderStore from "@/store/orderStore";
import { useCustomizerStore } from "@/store/customizerStore";
import type { ModifierGroup } from "@/store/menuStore_hasura";

/** Selection-rule summary shown next to a group heading. */
function ruleHint(g: ModifierGroup): string {
    const required = g.min >= 1;
    if (g.max === 1) return required ? "Required · choose 1" : "Optional · choose 1";
    return required ? `Choose ${g.min}–${g.max}` : `Optional · up to ${g.max}`;
}

function OptionRow({
    selected,
    disabled,
    single,
    label,
    priceLabel,
    accent,
    onClick,
}: {
    selected: boolean;
    disabled?: boolean;
    single: boolean;
    label: string;
    priceLabel: React.ReactNode;
    accent: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors",
                selected ? "border-2" : "border",
                disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-black/[0.03]"
            )}
            style={selected ? { borderColor: accent } : undefined}
        >
            <span className="flex items-center gap-3 min-w-0">
                <span
                    className={cn(
                        "flex items-center justify-center shrink-0 w-5 h-5 border",
                        single ? "rounded-full" : "rounded"
                    )}
                    style={
                        selected ? { backgroundColor: accent, borderColor: accent } : undefined
                    }
                >
                    {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </span>
                <span className="font-medium truncate">{label}</span>
            </span>
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                {priceLabel}
            </span>
        </button>
    );
}

/**
 * Single, globally-mounted bottom sheet that lets a customer configure an item's
 * variant + customization (addon) groups, then adds ONE composite line to the
 * cart. Opened from any menu-style ItemCard via useCustomizerStore for items
 * that have `addon_groups`. Pure-variant / plain items never open this — they
 * keep their existing add path.
 */
export default function ItemCustomizationSheet() {
    const { isOpen, payload, close } = useCustomizerStore();
    const addItem = useOrderStore((s) => s.addItem);

    const item = payload?.item;
    const hotelData = payload?.hotelData;
    const currency = payload?.currency ?? "₹";
    const accent = payload?.accent || "#111827";

    const hasVariants = (item?.variants?.length ?? 0) > 0;
    const groups: ModifierGroup[] = item?.addon_groups ?? [];

    const [variantName, setVariantName] = useState<string | null>(null);
    const [selections, setSelections] = useState<Record<string, string[]>>({});
    const [qty, setQty] = useState(1);

    // (Re)initialise whenever the sheet opens (or opens for a different item):
    // preselect defaults + the first variant, reset quantity.
    useEffect(() => {
        if (!isOpen || !item) return;
        const initSel: Record<string, string[]> = {};
        (item.addon_groups ?? []).forEach((g) => {
            initSel[g.id] = g.options.filter((o) => o.is_default).map((o) => o.id);
        });
        setSelections(initSel);
        setVariantName(
            (item.variants?.length ?? 0) > 0 ? item.variants![0].name : null
        );
        setQty(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, item?.id]);

    const variant = item?.variants?.find((v) => v.name === variantName) ?? null;

    const toggleOption = (g: ModifierGroup, oid: string) => {
        setSelections((prev) => {
            const cur = prev[g.id] ?? [];
            if (g.max === 1) {
                // Single-select (radio). Allow clearing only when the group is optional.
                if (cur.includes(oid)) return g.min >= 1 ? prev : { ...prev, [g.id]: [] };
                return { ...prev, [g.id]: [oid] };
            }
            if (cur.includes(oid)) return { ...prev, [g.id]: cur.filter((x) => x !== oid) };
            if (cur.length >= g.max) return prev; // at max — ignore extra picks
            return { ...prev, [g.id]: [...cur, oid] };
        });
    };

    const addonDelta = groups.reduce(
        (sum, g) =>
            sum +
            (selections[g.id] ?? []).reduce((s, oid) => {
                const o = g.options.find((x) => x.id === oid);
                return s + (o?.price || 0);
            }, 0),
        0
    );
    const base = variant ? variant.price : payload?.basePrice ?? item?.price ?? 0;
    const unitPrice = Math.max(0, base + addonDelta);
    const total = unitPrice * qty;

    const variantOk = !hasVariants || !!variant;
    const groupsOk = groups.every((g) => {
        const c = selections[g.id]?.length ?? 0;
        return c >= g.min && c <= g.max;
    });
    const canAdd = variantOk && groupsOk;

    const handleAdd = () => {
        if (!item || !canAdd) return;

        const optionEntries = groups.flatMap((g) =>
            (selections[g.id] ?? []).map((oid) => {
                const o = g.options.find((x) => x.id === oid)!;
                return {
                    group_id: g.id,
                    group_name: g.name,
                    option_id: o.id,
                    option_name: o.name,
                    price: o.price || 0,
                    pp_addon_group_id: g.pp_addon_group_id,
                    pp_addon_item_id: o.pp_addon_item_id,
                };
            })
        );

        // Composite line key: base | variant | sorted option ids. Two different
        // configurations become distinct cart lines; an identical repeat increments
        // quantity (handled by orderStore.addItem, which dedups on `id`).
        const optionIds = optionEntries.map((e) => e.option_id).sort();
        const compositeId = `${item.id}|${variantName ?? ""}|${optionIds.join(",")}`;
        const summaryParts = [
            ...(variantName ? [variantName] : []),
            ...optionEntries.map((e) => e.option_name),
        ];
        const name = summaryParts.length
            ? `${item.name} (${summaryParts.join(", ")})`
            : item.name;

        const line = {
            ...item,
            id: compositeId,
            name,
            price: unitPrice,
            variantSelections: variant
                ? [
                      {
                          id: (variant as any).id,
                          name: variant.name,
                          price: variant.price,
                          quantity: 1,
                      },
                  ]
                : [],
            selectedModifiers: optionEntries,
        };

        if (payload?.onAdd) {
            payload.onAdd(line, qty);
        } else {
            for (let i = 0; i < qty; i++) addItem(line as any);
        }
        close();
        toast.success(`${item.name} added to cart`);
    };

    if (!isOpen || !item) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[9998] bg-black/50 animate-in fade-in"
                onClick={close}
            />
            {/* Bottom sheet */}
            <div className="fixed inset-x-0 bottom-0 z-[9999] bg-white rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="px-5 pt-4 pb-3 border-b flex items-start gap-3">
                    {item.image_url && (
                        <img
                            src={item.image_url.replace("+", "%2B")}
                            alt={item.name}
                            className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold capitalize leading-tight">
                            {item.name}
                        </h2>
                        {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {item.description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        className="shrink-0 text-gray-400 hover:text-gray-700 text-2xl leading-none px-1"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="px-5 py-4 space-y-5 overflow-y-auto">
                    {/* Variant as a required single-select group */}
                    {hasVariants && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-base">Size</h3>
                                <span className="text-xs text-muted-foreground">
                                    Required · choose 1
                                </span>
                            </div>
                            <div className="space-y-2">
                                {item.variants!.map((v) => (
                                    <OptionRow
                                        key={v.name}
                                        single
                                        accent={accent}
                                        selected={variantName === v.name}
                                        onClick={() => setVariantName(v.name)}
                                        label={v.name}
                                        priceLabel={
                                            <MenuPrice
                                                currency={currency}
                                                amount={formatPrice(v.price, hotelData?.id)}
                                            />
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Customization (addon) groups */}
                    {groups.map((g) => {
                        const count = selections[g.id]?.length ?? 0;
                        const single = g.max === 1;
                        const unmet = count < g.min;
                        return (
                            <div key={g.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-base">{g.name}</h3>
                                    <span
                                        className={cn(
                                            "text-xs",
                                            unmet ? "text-red-500" : "text-muted-foreground"
                                        )}
                                    >
                                        {unmet && g.min >= 1
                                            ? `Choose at least ${g.min}`
                                            : ruleHint(g)}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {g.options.map((o) => {
                                        const sel = (selections[g.id] ?? []).includes(o.id);
                                        const atMax = !single && count >= g.max && !sel;
                                        return (
                                            <OptionRow
                                                key={o.id}
                                                single={single}
                                                accent={accent}
                                                selected={sel}
                                                disabled={atMax}
                                                onClick={() => toggleOption(g, o.id)}
                                                label={o.name}
                                                priceLabel={
                                                    o.price > 0 ? (
                                                        <span>
                                                            +
                                                            <MenuPrice
                                                                currency={currency}
                                                                amount={formatPrice(o.price, hotelData?.id)}
                                                            />
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-600">Free</span>
                                                    )
                                                }
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer: quantity + add */}
                <div className="border-t px-5 py-4 flex items-center gap-3 bg-white">
                    <div className="flex items-center gap-3 border rounded-full px-3 py-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            className="active:scale-90 disabled:opacity-40"
                            disabled={qty <= 1}
                            aria-label="Decrease quantity"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-5 text-center font-semibold">{qty}</span>
                        <button
                            type="button"
                            onClick={() => setQty((q) => q + 1)}
                            className="active:scale-90"
                            aria-label="Increase quantity"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        type="button"
                        disabled={!canAdd}
                        onClick={handleAdd}
                        style={{ backgroundColor: canAdd ? accent : undefined }}
                        className={cn(
                            "flex-1 rounded-full py-3 px-4 text-white font-semibold flex items-center justify-center gap-1.5",
                            !canAdd && "bg-gray-300 cursor-not-allowed"
                        )}
                    >
                        {canAdd ? (
                            <>
                                Add
                                <span aria-hidden>·</span>
                                <MenuPrice
                                    currency={currency}
                                    amount={formatPrice(total, hotelData?.id)}
                                />
                            </>
                        ) : (
                            "Select required options"
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}
