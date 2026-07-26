"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/constants";
import { readableTextColor } from "@/lib/brandColor";
import { MenuPrice } from "./MenuPrice";
import useOrderStore from "@/store/orderStore";
import { useCustomizerStore } from "@/store/customizerStore";
import type { ModifierGroup } from "@/store/menuStore_hasura";

/** Selection-rule summary shown in a group's pill. */
function ruleHint(g: ModifierGroup): string {
    const required = g.min >= 1;
    if (g.max === 1) return required ? "Required · choose 1" : "Optional · choose 1";
    return required ? `Choose ${g.min}–${g.max}` : `Optional · up to ${g.max}`;
}

/** Bordered veg / non-veg mark (dot for veg, triangle for non-veg) — matches the
 *  storefront item cards / detail sheets. */
function VegMark({ isVeg }: { isVeg: boolean }) {
    const color = isVeg ? "#16a34a" : "#dc2626";
    return (
        <div
            className="flex h-[15px] w-[15px] items-center justify-center rounded-[3px] border-[1.5px] shrink-0"
            style={{ borderColor: color }}
        >
            {isVeg ? (
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            ) : (
                <span
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: "3.5px solid transparent",
                        borderRight: "3.5px solid transparent",
                        borderBottom: `6px solid ${color}`,
                    }}
                />
            )}
        </div>
    );
}

/** A group heading pill (right-aligned) — "Required · choose 1" etc. Turns red
 *  when a required minimum isn't met yet. */
function GroupPill({ text, error, accent }: { text: string; error?: boolean; accent: string }) {
    const color = error ? "#dc2626" : accent;
    return (
        <span
            className="text-xs px-2 py-0.5 rounded font-medium border whitespace-nowrap"
            style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
        >
            {text}
        </span>
    );
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
                "w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-black/[0.02]"
            )}
            style={
                selected
                    ? { borderColor: accent, backgroundColor: `${accent}0F` }
                    : { borderColor: "#e5e7eb" }
            }
        >
            <span className="flex items-center gap-3 min-w-0">
                <span
                    className={cn(
                        "flex items-center justify-center shrink-0 w-5 h-5 border-2",
                        single ? "rounded-full" : "rounded-[5px]"
                    )}
                    style={
                        selected
                            ? { backgroundColor: accent, borderColor: accent }
                            : { borderColor: "#cbd5e1" }
                    }
                >
                    {selected && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                </span>
                <span className="font-medium text-gray-900 truncate">{label}</span>
            </span>
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                {priceLabel}
            </span>
        </button>
    );
}

/**
 * Single, globally-mounted bottom sheet that lets a customer (or POS operator, via
 * `onAdd`) configure an item's variant + customization (addon) groups, then adds
 * ONE composite line to the cart. Styled to match the storefront's variant detail
 * sheet (hero image, veg mark, "ADD TO CART" bar) so every theme shares one look.
 * Opened from any ItemCard via useCustomizerStore for items with `addon_groups`.
 */
export default function ItemCustomizationSheet() {
    const { isOpen, payload, close } = useCustomizerStore();
    const addItem = useOrderStore((s) => s.addItem);

    const item = payload?.item;
    const hotelData = payload?.hotelData;
    const currency = payload?.currency ?? "₹";
    const accent = payload?.accent || "#111827";
    const onAccent = readableTextColor(accent);

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
            <div className="fixed inset-x-0 bottom-0 z-[9999] mx-auto w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Close */}
                <button
                    type="button"
                    onClick={close}
                    className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm text-gray-600 hover:text-gray-900"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1">
                    {/* Drag handle */}
                    <div className="sticky top-0 z-10 flex justify-center bg-white pt-2.5 pb-1">
                        <div className="h-1 w-8 rounded-full bg-gray-200" />
                    </div>

                    {/* Hero image */}
                    {item.image_url && (
                        <div className="mx-3 mt-1 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
                            <img
                                src={item.image_url.replace("+", "%2B")}
                                alt={item.name}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    )}

                    {/* Header: veg mark + name + description */}
                    <div className="p-4 pb-2">
                        <div className="flex items-center gap-2">
                            {item.is_veg !== null && item.is_veg !== undefined && (
                                <VegMark isVeg={item.is_veg} />
                            )}
                            <h3 className="text-left font-bold text-lg text-gray-900 capitalize">
                                {item.name}
                            </h3>
                        </div>
                        {item.description && (
                            <p className="text-sm text-gray-400 mt-1 leading-relaxed whitespace-pre-line">
                                {item.description}
                            </p>
                        )}
                    </div>

                    <div className="border-t border-gray-100 mx-4" />

                    {/* Option groups */}
                    <div className="p-4 space-y-5">
                        {/* Variant as a required single-select "Size" group */}
                        {hasVariants && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-base text-gray-900">Size</h4>
                                    <GroupPill
                                        text="Required · choose 1"
                                        error={!variant}
                                        accent={accent}
                                    />
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
                                <div key={g.id}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold text-base text-gray-900">
                                            {g.name}
                                        </h4>
                                        <GroupPill
                                            text={
                                                unmet && g.min >= 1
                                                    ? `Choose at least ${g.min}`
                                                    : ruleHint(g)
                                            }
                                            error={unmet && g.min >= 1}
                                            accent={accent}
                                        />
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
                </div>

                {/* Sticky footer: quantity + ADD TO CART */}
                <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
                    <div
                        className="flex items-center gap-1 rounded-full border px-1 py-1 shrink-0"
                        style={{ borderColor: `${accent}4D`, backgroundColor: `${accent}0F` }}
                    >
                        <button
                            type="button"
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            disabled={qty <= 1}
                            className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40 active:scale-90"
                            style={{ color: accent }}
                            aria-label="Decrease quantity"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <span
                            className="min-w-[2ch] text-center text-sm font-extrabold"
                            style={{ color: accent }}
                        >
                            {qty}
                        </span>
                        <button
                            type="button"
                            onClick={() => setQty((q) => q + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full active:scale-90"
                            style={{ color: accent }}
                            aria-label="Increase quantity"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        type="button"
                        disabled={!canAdd}
                        onClick={handleAdd}
                        className="flex-1 flex items-center justify-between rounded-2xl px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed"
                        style={
                            canAdd
                                ? { backgroundColor: accent, color: onAccent }
                                : { backgroundColor: "#d1d5db", color: "#6b7280" }
                        }
                    >
                        <span>{canAdd ? "Add to cart" : "Select options"}</span>
                        {canAdd && (
                            <MenuPrice
                                forceSymbolLtr
                                currency={currency}
                                amount={formatPrice(total, hotelData?.id)}
                            />
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}
