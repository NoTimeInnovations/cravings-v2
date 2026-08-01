"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
    getDiscountsQuery,
    createDiscountMutation,
    updateDiscountMutation,
    deleteDiscountMutation,
} from "@/api/discounts";
import { Loader2, Plus, Trash2, Tag, Copy, Check, Search, Pencil } from "lucide-react";
import { getMenu } from "@/api/menu";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { isDiscountStackingEnabled } from "@/lib/discountUtils";
import { describeBxgy, type BxgyBuyType, type BxgyRewardType } from "@/lib/bxgy";

type DiscountType = "percentage" | "flat" | "freebie" | "bxgy";

type Discount = {
    id: string;
    code: string;
    description: string | null;
    terms_conditions: string | null;
    discount_type: DiscountType;
    discount_value: number;
    min_order_value: number | null;
    max_discount_amount: number | null;
    usage_limit: number | null;
    per_user_usage_limit: number | null;
    used_count: number;
    is_active: boolean;
    starts_at: string | null;
    expires_at: string | null;
    valid_days: string | null;
    valid_time_from: string | null;
    valid_time_to: string | null;
    discount_order_types: string | null;
    discount_on_total: boolean;
    has_coupon: boolean;
    applicable_on: string | null;
    category_item_ids: string | null;
    rank: number | null;
    freebie_item_count: number | null;
    freebie_item_ids: string | null;
    pp_discount_id: string | null;
    pp_overwrite_enabled: boolean;
    show_on_storefront: boolean;
    // BXGY — the condition that earns the reward, and the reward itself. All
    // NULL on the other three types.
    bxgy_buy_type: string | null;
    bxgy_buy_item_ids: string | null;
    bxgy_buy_quantity: number | null;
    bxgy_buy_value: number | null;
    bxgy_reward_type: string | null;
    bxgy_reward_value: number | null;
    bxgy_max_repeat: number | null;
    created_at: string;
};

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ORDER_TYPES = [
    { value: "1", label: "Delivery" },
    { value: "2", label: "Pickup" },
    { value: "3", label: "Dine-in" },
];

const emptyForm = {
    code: "",
    description: "",
    terms_conditions: "",
    discount_type: "percentage" as DiscountType,
    discount_value: "",
    min_order_value: "",
    max_discount_amount: "",
    usage_limit: "",
    per_user_usage_limit: "",
    starts_at: "",
    expires_at: "",
    valid_days: "All" as string,
    discount_order_types: ["1", "2", "3"] as string[],
    discount_on_total: true,
    has_coupon: true,
    applicable_on: "All",
    category_item_ids: "",
    rank: "",
    freebie_item_ids: "",
    freebie_item_count: "",
    show_on_storefront: true,
    bxgy_buy_type: "items" as BxgyBuyType,
    bxgy_buy_item_ids: "",
    bxgy_buy_quantity: "2",
    bxgy_buy_value: "",
    bxgy_reward_type: "freebie" as BxgyRewardType,
    bxgy_reward_value: "",
    bxgy_max_repeat: "1",
};

function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function toLocalDatetime(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
}

type PickedItem = { id: string; name: string };

/**
 * Search-and-chip menu item picker. Three fields need one — the freebie items, a
 * BXGY buy condition, and a BXGY freebie reward — so it lives here rather than
 * being pasted three times. Owns only its search box; the selection lives with
 * the caller, which also decides what to write onto the form.
 */
function MenuItemPicker({
    label,
    hint,
    menuItems,
    selected,
    onChange,
}: {
    label: string;
    hint?: string;
    menuItems: { id: string; name: string; price: number }[];
    selected: PickedItem[];
    onChange: (next: PickedItem[]) => void;
}) {
    const [search, setSearch] = useState("");
    const matches = menuItems.filter(
        (item) =>
            item.name.toLowerCase().includes(search.toLowerCase()) &&
            !selected.some((s) => s.id === item.id),
    );

    return (
        <div className="space-y-2 sm:col-span-2">
            <Label>
                {label}
                {hint && <span className="text-muted-foreground text-xs ml-1">{hint}</span>}
            </Label>
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {selected.map((item) => (
                        <span
                            key={item.id}
                            className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs"
                        >
                            {item.name}
                            <button
                                type="button"
                                onClick={() => onChange(selected.filter((i) => i.id !== item.id))}
                            >
                                <Trash2 className="h-3 w-3 hover:text-red-600" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search menu items..."
                    className="pl-8"
                />
            </div>
            {search && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                    {matches.slice(0, 10).map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center"
                            onClick={() => {
                                onChange([...selected, { id: item.id, name: item.name }]);
                                setSearch("");
                            }}
                        >
                            <span>{item.name}</span>
                            <span className="text-muted-foreground text-xs">₹{item.price}</span>
                        </button>
                    ))}
                    {matches.length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No items found</p>
                    )}
                </div>
            )}
        </div>
    );
}

export function DiscountCodeSettings() {
    const { userData, setState } = useAuthStore();
    // One discount per bill by default; partners opt into stacking.
    const [stacking, setStacking] = useState(false);
    const [savingStacking, setSavingStacking] = useState(false);
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [togglingPpId, setTogglingPpId] = useState<string | null>(null);
    const [togglingStorefrontId, setTogglingStorefrontId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [allDays, setAllDays] = useState(true);
    const [menuItems, setMenuItems] = useState<{ id: string; name: string; price: number }[]>([]);
    const [selectedFreebieItems, setSelectedFreebieItems] = useState<PickedItem[]>([]);
    const [selectedBxgyBuyItems, setSelectedBxgyBuyItems] = useState<PickedItem[]>([]);

    // Resolve ids back to chips when opening an existing discount for edit.
    const chipsFor = (csv: string | null | undefined): PickedItem[] =>
        (csv ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((id) => menuItems.find((m) => m.id === id))
            .filter((m): m is { id: string; name: string; price: number } => !!m)
            .map((m) => ({ id: m.id, name: m.name }));

    const menuNameOf = (id: string) => menuItems.find((m) => m.id === id)?.name;

    useEffect(() => {
        if (userData?.id) {
            fetchDiscounts();
            fetchMenuItems();
        }
    }, [userData?.id]);

    useEffect(() => {
        setStacking(isDiscountStackingEnabled((userData as any)?.delivery_rules));
    }, [userData]);

    // delivery_rules is a shared blob (delivery, round-off, parcel charges…), so
    // read-modify-write — never replace it wholesale from here.
    const saveStacking = async (value: boolean) => {
        if (!userData?.id) return;
        const previous = stacking;
        setStacking(value);
        setSavingStacking(true);
        try {
            const rules = { ...((userData as any)?.delivery_rules || {}), discount_stacking: value };
            await updatePartner(userData.id, { delivery_rules: rules } as any);
            revalidateTag(userData.id);
            setState({ delivery_rules: rules } as any);
            toast.success(value ? "Multiple discounts allowed" : "One discount per order");
        } catch (e) {
            console.error("Failed to save discount stacking:", e);
            setStacking(previous);
            toast.error("Could not save that setting");
        } finally {
            setSavingStacking(false);
        }
    };

    const fetchMenuItems = async () => {
        if (!userData?.id) return;
        try {
            const res = await fetchFromHasura(getMenu, { partner_id: userData.id });
            setMenuItems(res.menu ?? []);
        } catch {
            // silent fail - menu items are only needed for freebie
        }
    };

    const fetchDiscounts = async () => {
        if (!userData?.id) return;
        setLoading(true);
        try {
            const res = await fetchFromHasura(getDiscountsQuery, { partner_id: userData.id });
            setDiscounts(res.discounts ?? []);
        } catch {
            toast.error("Failed to load discounts");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm(emptyForm);
        setSelectedDays([]);
        setAllDays(true);
        setSelectedFreebieItems([]);
        setSelectedBxgyBuyItems([]);
        setEditingId(null);
        setShowForm(false);
    };

    const buildPayload = (forUpdate: boolean, code: string) => {
        const isPct = form.discount_type === "percentage";
        const isFreebie = form.discount_type === "freebie";
        const isBxgy = form.discount_type === "bxgy";
        // A BXGY reward may also be a freebie, in which case it stores its items
        // in the same freebie_* columns the standalone freebie type uses.
        const wantsFreebieItems = isFreebie || (isBxgy && form.bxgy_reward_type === "freebie");
        // max_discount_amount caps a percentage discount, and any BXGY reward —
        // a repeating flat/freebie reward is exactly where a cap earns its keep.
        const capsApply = isPct || isBxgy;
        const payload: any = {
            code,
            discount_type: form.discount_type,
            // discount_value is NOT NULL; the types that carry their amount
            // elsewhere store 0 rather than leaving the column unset.
            discount_value: isFreebie || isBxgy ? 0 : Number(form.discount_value),
            discount_on_total: form.discount_on_total,
            has_coupon: form.has_coupon,
            applicable_on: form.applicable_on,
            valid_days: allDays ? "All" : selectedDays.join(","),
            discount_order_types: form.discount_order_types.join(","),
            description: form.description.trim() || null,
            terms_conditions: form.terms_conditions.trim() || null,
            min_order_value: form.min_order_value ? Number(form.min_order_value) : null,
            max_discount_amount: capsApply && form.max_discount_amount ? Number(form.max_discount_amount) : null,
            usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
            per_user_usage_limit: form.per_user_usage_limit ? Number(form.per_user_usage_limit) : null,
            starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
            expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
            rank: form.rank ? Number(form.rank) : null,
            category_item_ids:
                form.applicable_on !== "All" && form.category_item_ids.trim()
                    ? form.category_item_ids.trim()
                    : null,
            freebie_item_ids: wantsFreebieItems ? form.freebie_item_ids.trim() : null,
            freebie_item_count: wantsFreebieItems
                ? form.freebie_item_count
                    ? Number(form.freebie_item_count)
                    : 1
                : null,
            show_on_storefront: form.show_on_storefront,
            // Every bxgy_* column is cleared on the other types, so switching an
            // existing discount away from BXGY doesn't leave a stale condition
            // behind for the readers to trip over.
            bxgy_buy_type: isBxgy ? form.bxgy_buy_type : null,
            bxgy_buy_item_ids:
                isBxgy && form.bxgy_buy_type === "items" ? form.bxgy_buy_item_ids.trim() : null,
            bxgy_buy_quantity:
                isBxgy && form.bxgy_buy_type !== "order_value"
                    ? Number(form.bxgy_buy_quantity) || 1
                    : null,
            bxgy_buy_value:
                isBxgy && form.bxgy_buy_type === "order_value"
                    ? Number(form.bxgy_buy_value) || 0
                    : null,
            bxgy_reward_type: isBxgy ? form.bxgy_reward_type : null,
            bxgy_reward_value:
                isBxgy && form.bxgy_reward_type !== "freebie"
                    ? Number(form.bxgy_reward_value) || 0
                    : null,
            // A percentage reward is applied once however many times the cart
            // qualifies (3× 20% would be 60% off the bill, not 20% thrice), so
            // it stores no repeat at all.
            bxgy_max_repeat:
                isBxgy && form.bxgy_reward_type !== "percentage"
                    ? Number(form.bxgy_max_repeat) || 1
                    : null,
        };
        if (!forUpdate) {
            payload.partner_id = userData!.id;
            payload.is_active = true;
            payload.used_count = 0;
        }
        return payload;
    };

    const startEdit = (disc: Discount) => {
        const days = disc.valid_days && disc.valid_days !== "All" ? disc.valid_days.split(",").map((d) => d.trim()) : [];
        const types = disc.discount_order_types
            ? disc.discount_order_types.split(",").map((t) => t.trim()).filter(Boolean)
            : ["1", "2", "3"];

        setForm({
            code: disc.code,
            description: disc.description ?? "",
            terms_conditions: disc.terms_conditions ?? "",
            discount_type: disc.discount_type,
            discount_value:
                disc.discount_type === "freebie" || disc.discount_type === "bxgy"
                    ? ""
                    : String(disc.discount_value ?? ""),
            min_order_value: disc.min_order_value != null ? String(disc.min_order_value) : "",
            max_discount_amount: disc.max_discount_amount != null ? String(disc.max_discount_amount) : "",
            usage_limit: disc.usage_limit != null ? String(disc.usage_limit) : "",
            per_user_usage_limit: disc.per_user_usage_limit != null ? String(disc.per_user_usage_limit) : "",
            starts_at: toLocalDatetime(disc.starts_at),
            expires_at: toLocalDatetime(disc.expires_at),
            valid_days: disc.valid_days ?? "All",
            discount_order_types: types,
            discount_on_total: disc.discount_on_total,
            has_coupon: disc.has_coupon,
            applicable_on: disc.applicable_on ?? "All",
            category_item_ids: disc.category_item_ids ?? "",
            rank: disc.rank != null ? String(disc.rank) : "",
            freebie_item_ids: disc.freebie_item_ids ?? "",
            freebie_item_count: disc.freebie_item_count != null ? String(disc.freebie_item_count) : "",
            show_on_storefront: disc.show_on_storefront ?? true,
            bxgy_buy_type: (disc.bxgy_buy_type as BxgyBuyType) ?? "items",
            bxgy_buy_item_ids: disc.bxgy_buy_item_ids ?? "",
            bxgy_buy_quantity: disc.bxgy_buy_quantity != null ? String(disc.bxgy_buy_quantity) : "2",
            bxgy_buy_value: disc.bxgy_buy_value != null ? String(disc.bxgy_buy_value) : "",
            bxgy_reward_type: (disc.bxgy_reward_type as BxgyRewardType) ?? "freebie",
            bxgy_reward_value: disc.bxgy_reward_value != null ? String(disc.bxgy_reward_value) : "",
            bxgy_max_repeat: disc.bxgy_max_repeat != null ? String(disc.bxgy_max_repeat) : "1",
        });
        setAllDays(!disc.valid_days || disc.valid_days === "All");
        setSelectedDays(days);

        // Hydrate the item chips by matching IDs against the menu cache. A BXGY
        // reward can be a freebie too, so it fills the same chip list.
        const hasFreebieItems =
            disc.discount_type === "freebie" ||
            (disc.discount_type === "bxgy" && disc.bxgy_reward_type === "freebie");
        setSelectedFreebieItems(hasFreebieItems ? chipsFor(disc.freebie_item_ids) : []);
        setSelectedBxgyBuyItems(
            disc.discount_type === "bxgy" ? chipsFor(disc.bxgy_buy_item_ids) : [],
        );

        setEditingId(disc.id);
        setShowForm(true);
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleSave = async () => {
        if (!userData?.id) return;
        // The code is what the CUSTOMER types, so it's only required when the
        // discount actually asks for one. An auto-applying discount still needs
        // a code internally — it's NOT NULL and half the unique key
        // (partner_id, code), and it's the identifier written onto every order
        // that used it — so generate one rather than making the partner invent
        // a code no one will ever see.
        const code = form.code.trim().toUpperCase() || (form.has_coupon ? "" : generateCode());
        if (!code) return toast.error("Code is required");
        if (form.discount_type !== "freebie" && form.discount_type !== "bxgy") {
            if (!form.discount_value || Number(form.discount_value) <= 0) return toast.error("Discount value must be greater than 0");
            if (form.discount_type === "percentage" && Number(form.discount_value) > 100) return toast.error("Percentage cannot exceed 100");
        }
        if (form.discount_type === "freebie" && !form.freebie_item_ids.trim()) return toast.error("Freebie item IDs are required");

        // BXGY needs BOTH halves to be complete: a condition the cart can meet,
        // and a reward worth something. Half a rule would save happily and then
        // silently never apply.
        if (form.discount_type === "bxgy") {
            if (form.bxgy_buy_type === "order_value") {
                if (!form.bxgy_buy_value || Number(form.bxgy_buy_value) <= 0)
                    return toast.error("Set the order value that earns the reward");
            } else {
                if (!form.bxgy_buy_quantity || Number(form.bxgy_buy_quantity) <= 0)
                    return toast.error("Set how many items the customer must buy");
                if (form.bxgy_buy_type === "items" && !form.bxgy_buy_item_ids.trim())
                    return toast.error("Pick the items that count towards the offer");
            }
            if (form.bxgy_reward_type === "freebie") {
                if (!form.freebie_item_ids.trim()) return toast.error("Pick the free item(s) to give");
            } else {
                if (!form.bxgy_reward_value || Number(form.bxgy_reward_value) <= 0)
                    return toast.error("Reward value must be greater than 0");
                if (form.bxgy_reward_type === "percentage" && Number(form.bxgy_reward_value) > 100)
                    return toast.error("Percentage cannot exceed 100");
            }
        }

        setSaving(true);
        try {
            if (editingId) {
                const updates = buildPayload(true, code);
                const res = await fetchFromHasura(updateDiscountMutation, { id: editingId, updates });
                const updated: Discount = res.update_discounts_by_pk;
                setDiscounts((prev) => prev.map((d) => (d.id === editingId ? { ...d, ...updated } : d)));
                toast.success("Discount updated");
            } else {
                const object = buildPayload(false, code);
                const res = await fetchFromHasura(createDiscountMutation, { object });
                setDiscounts((prev) => [res.insert_discounts_one, ...prev]);
                toast.success("Discount created");
            }
            resetForm();
        } catch (err: any) {
            if (err?.message?.includes("Uniqueness violation") || err?.message?.includes("unique")) {
                toast.error("A discount with this code already exists");
            } else {
                toast.error(editingId ? "Failed to update discount" : "Failed to create discount");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id: string, is_active: boolean) => {
        setTogglingId(id);
        try {
            await fetchFromHasura(updateDiscountMutation, { id, updates: { is_active } });
            setDiscounts((prev) => prev.map((c) => (c.id === id ? { ...c, is_active } : c)));
        } catch {
            toast.error("Failed to update discount");
        } finally {
            setTogglingId(null);
        }
    };

    // Toggles whether the next Petpooja menu push is allowed to overwrite this
    // discount. When off, pp_menu_insert skips the discount on upsert so local
    // edits aren't clobbered by the partner re-publishing from Petpooja.
    const handlePpOverwriteToggle = async (id: string, enabled: boolean) => {
        setTogglingPpId(id);
        try {
            await fetchFromHasura(updateDiscountMutation, {
                id,
                updates: { pp_overwrite_enabled: enabled },
            });
            setDiscounts((prev) =>
                prev.map((c) =>
                    c.id === id ? { ...c, pp_overwrite_enabled: enabled } : c,
                ),
            );
            toast.success(
                enabled
                    ? "Petpooja sync will overwrite this discount."
                    : "This discount is now protected from Petpooja sync.",
            );
        } catch {
            toast.error("Failed to update Petpooja sync setting");
        } finally {
            setTogglingPpId(null);
        }
    };

    // Show/hide this discount's card on the customer store page. When off, the
    // banner/carousel can take its place instead of the discount-only card.
    const handleStorefrontToggle = async (id: string, show: boolean) => {
        setTogglingStorefrontId(id);
        try {
            await fetchFromHasura(updateDiscountMutation, { id, updates: { show_on_storefront: show } });
            setDiscounts((prev) => prev.map((c) => (c.id === id ? { ...c, show_on_storefront: show } : c)));
            toast.success(show ? "Discount will show on your store page." : "Discount hidden from your store page.");
        } catch {
            toast.error("Failed to update visibility");
        } finally {
            setTogglingStorefrontId(null);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await fetchFromHasura(deleteDiscountMutation, { id });
            setDiscounts((prev) => prev.filter((c) => c.id !== id));
            toast.success("Discount deleted");
        } catch {
            toast.error("Failed to delete discount");
        } finally {
            setDeletingId(null);
        }
    };

    const toggleDay = (day: string) => {
        setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
    };

    const toggleOrderType = (val: string) => {
        setForm((prev) => ({
            ...prev,
            discount_order_types: prev.discount_order_types.includes(val)
                ? prev.discount_order_types.filter((v) => v !== val)
                : [...prev.discount_order_types, val],
        }));
    };

    const formatOrderTypes = (types: string | null) => {
        if (!types) return "All";
        const map: Record<string, string> = { "1": "Delivery", "2": "Pickup", "3": "Dine-in" };
        return types.split(",").map((t) => map[t.trim()] || t.trim()).join(", ");
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Discounts</CardTitle>
                            <CardDescription>Create and manage discounts for your customers.</CardDescription>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => {
                                if (showForm) {
                                    resetForm();
                                } else {
                                    setEditingId(null);
                                    setShowForm(true);
                                }
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            New Discount
                        </Button>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5 pr-3">
                            <Label className="text-sm">Allow multiple discounts on one order</Label>
                            <p className="text-xs text-muted-foreground">
                                Off by default: only one discount applies per bill, and adding
                                another replaces it. Turn on to let discounts stack and subtract
                                together. Applies at the counter (POS); online checkout always
                                takes a single discount.
                            </p>
                        </div>
                        <Switch
                            checked={stacking}
                            disabled={savingStacking}
                            onCheckedChange={saveStacking}
                        />
                    </div>
                </CardHeader>

                {showForm && (
                    <CardContent className="border-t pt-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground">
                                    {editingId ? "Edit discount" : "New discount"}
                                </h3>
                                {editingId && (
                                    <span className="text-xs text-muted-foreground">
                                        Editing existing code
                                    </span>
                                )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Code */}
                                <div className="space-y-2">
                                    <Label>
                                        Code
                                        {!form.has_coupon && (
                                            <span className="text-muted-foreground text-xs ml-1">
                                                (optional — auto-applied, so customers never type it)
                                            </span>
                                        )}
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={form.code}
                                            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                            placeholder={form.has_coupon ? "e.g. SAVE10" : "Leave blank to generate one"}
                                            className="uppercase"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={() => setForm({ ...form, code: generateCode() })}
                                            className="shrink-0"
                                        >
                                            Auto
                                        </Button>
                                    </div>
                                </div>

                                {/* Discount Type */}
                                <div className="space-y-2">
                                    <Label>Discount Type</Label>
                                    <Select
                                        value={form.discount_type}
                                        onValueChange={(v) => setForm({ ...form, discount_type: v as DiscountType })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                                            <SelectItem value="freebie">Freebie (Free Item)</SelectItem>
                                            <SelectItem value="bxgy">BXGY (Buy X, Get Y)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Discount Value — BXGY carries its amount in the reward fields below */}
                                {form.discount_type !== "freebie" && form.discount_type !== "bxgy" && (
                                <div className="space-y-2">
                                    <Label>{form.discount_type === "percentage" ? "Discount (%)" : "Discount Amount (₹)"}</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max={form.discount_type === "percentage" ? "100" : undefined}
                                        value={form.discount_value}
                                        onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                                        placeholder={form.discount_type === "percentage" ? "e.g. 10" : "e.g. 50"}
                                    />
                                </div>
                                )}

                                {/* Freebie Fields */}
                                {form.discount_type === "freebie" && (
                                <>
                                    <MenuItemPicker
                                        label="Select Free Item(s)"
                                        menuItems={menuItems}
                                        selected={selectedFreebieItems}
                                        onChange={(next) => {
                                            setSelectedFreebieItems(next);
                                            setForm((prev) => ({
                                                ...prev,
                                                freebie_item_ids: next.map((i) => i.id).join(","),
                                                freebie_item_count: String(next.length || 1),
                                            }));
                                        }}
                                    />
                                </>
                                )}

                                {/* BXGY — the condition on the left, the reward on the right */}
                                {form.discount_type === "bxgy" && (
                                <>
                                    <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-4 space-y-4">
                                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                                            <h4 className="text-sm font-semibold">Buy X, Get Y</h4>
                                            <p className="text-xs text-orange-700 font-medium">
                                                {describeBxgy(
                                                    {
                                                        bxgy_buy_type: form.bxgy_buy_type,
                                                        bxgy_buy_item_ids: form.bxgy_buy_item_ids,
                                                        bxgy_buy_quantity: form.bxgy_buy_quantity,
                                                        bxgy_buy_value: form.bxgy_buy_value,
                                                        bxgy_reward_type: form.bxgy_reward_type,
                                                        bxgy_reward_value: form.bxgy_reward_value,
                                                        bxgy_max_repeat: form.bxgy_max_repeat,
                                                        freebie_item_ids: form.freebie_item_ids,
                                                        freebie_item_count: form.freebie_item_count,
                                                    },
                                                    { nameOf: menuNameOf },
                                                )}
                                            </p>
                                        </div>

                                        {/* ---- Buy (the condition) ---- */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Customer must…</Label>
                                                <Select
                                                    value={form.bxgy_buy_type}
                                                    onValueChange={(v) =>
                                                        setForm({ ...form, bxgy_buy_type: v as BxgyBuyType })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="items">Buy specific items</SelectItem>
                                                        <SelectItem value="quantity">Buy any items (by count)</SelectItem>
                                                        <SelectItem value="order_value">Spend an order value</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {form.bxgy_buy_type === "order_value" ? (
                                                <div className="space-y-2">
                                                    <Label>Order Value (₹)</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={form.bxgy_buy_value}
                                                        onChange={(e) => setForm({ ...form, bxgy_buy_value: e.target.value })}
                                                        placeholder="e.g. 500"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label>Quantity to buy</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={form.bxgy_buy_quantity}
                                                        onChange={(e) => setForm({ ...form, bxgy_buy_quantity: e.target.value })}
                                                        placeholder="e.g. 2"
                                                    />
                                                </div>
                                            )}

                                            {form.bxgy_buy_type === "items" && (
                                                <MenuItemPicker
                                                    label="Qualifying items"
                                                    hint="(any of these count towards the quantity)"
                                                    menuItems={menuItems}
                                                    selected={selectedBxgyBuyItems}
                                                    onChange={(next) => {
                                                        setSelectedBxgyBuyItems(next);
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            bxgy_buy_item_ids: next.map((i) => i.id).join(","),
                                                        }));
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* ---- Get (the reward) ---- */}
                                        <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
                                            <div className="space-y-2">
                                                <Label>…and gets</Label>
                                                <Select
                                                    value={form.bxgy_reward_type}
                                                    onValueChange={(v) =>
                                                        setForm({ ...form, bxgy_reward_type: v as BxgyRewardType })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="freebie">A free item</SelectItem>
                                                        <SelectItem value="flat">Flat amount off (₹)</SelectItem>
                                                        <SelectItem value="percentage">Percentage off (%)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {form.bxgy_reward_type !== "freebie" && (
                                                <div className="space-y-2">
                                                    <Label>
                                                        {form.bxgy_reward_type === "percentage"
                                                            ? "Reward (%)"
                                                            : "Reward Amount (₹)"}
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max={form.bxgy_reward_type === "percentage" ? "100" : undefined}
                                                        value={form.bxgy_reward_value}
                                                        onChange={(e) => setForm({ ...form, bxgy_reward_value: e.target.value })}
                                                        placeholder={form.bxgy_reward_type === "percentage" ? "e.g. 50" : "e.g. 100"}
                                                    />
                                                </div>
                                            )}

                                            {form.bxgy_reward_type === "freebie" && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label>
                                                            Free units of each item
                                                            <span className="text-muted-foreground text-xs ml-1">(per reward)</span>
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={form.freebie_item_count}
                                                            onChange={(e) => setForm({ ...form, freebie_item_count: e.target.value })}
                                                            placeholder="e.g. 1"
                                                        />
                                                    </div>
                                                    <MenuItemPicker
                                                        label="Free item(s)"
                                                        hint="(the customer gets all of these)"
                                                        menuItems={menuItems}
                                                        selected={selectedFreebieItems}
                                                        onChange={(next) => {
                                                            setSelectedFreebieItems(next);
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                freebie_item_ids: next.map((i) => i.id).join(","),
                                                            }));
                                                        }}
                                                    />
                                                </>
                                            )}

                                            {/* A percentage reward is applied once no matter how many
                                                times the cart qualifies — 3× 20% would be 60% off the
                                                whole bill — so it has no repeat to set. */}
                                            {form.bxgy_reward_type !== "percentage" && (
                                                <div className="space-y-2">
                                                    <Label>
                                                        Max times per order
                                                        <span className="text-muted-foreground text-xs ml-1">
                                                            (buy 4 on a &quot;buy 2&quot; offer → 2 rewards)
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={form.bxgy_max_repeat}
                                                        onChange={(e) => setForm({ ...form, bxgy_max_repeat: e.target.value })}
                                                        placeholder="e.g. 1"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                                )}

                                {/* Min Order Value */}
                                <div className="space-y-2">
                                    <Label>Min Order Value (₹) <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={form.min_order_value}
                                        onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                                        placeholder="e.g. 200"
                                    />
                                </div>

                                {/* Max Discount Cap — also worth having on BXGY, where a
                                    repeating flat/freebie reward can otherwise run away. */}
                                {(form.discount_type === "percentage" || form.discount_type === "bxgy") && (
                                    <div className="space-y-2">
                                        <Label>Max Discount Cap (₹) <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={form.max_discount_amount}
                                            onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                                            placeholder="e.g. 100"
                                        />
                                    </div>
                                )}

                                {/* Usage Limit */}
                                <div className="space-y-2">
                                    <Label>Usage Limit <span className="text-muted-foreground text-xs">(optional, blank = unlimited)</span></Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={form.usage_limit}
                                        onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                                        placeholder="e.g. 100"
                                        autoComplete="off"
                                        name="discount-usage-limit"
                                    />
                                </div>

                                {/* Per-Customer Usage Limit */}
                                <div className="space-y-2">
                                    <Label>Per-Customer Usage Limit <span className="text-muted-foreground text-xs">(optional, blank = unlimited per customer)</span></Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={form.per_user_usage_limit}
                                        onChange={(e) => setForm({ ...form, per_user_usage_limit: e.target.value })}
                                        placeholder="e.g. 5"
                                        autoComplete="off"
                                        name="discount-per-user-usage-limit"
                                    />
                                </div>

                                {/* Rank */}
                                <div className="space-y-2">
                                    <Label>Priority / Rank <span className="text-muted-foreground text-xs">(optional, lower = higher priority)</span></Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={form.rank}
                                        onChange={(e) => setForm({ ...form, rank: e.target.value })}
                                        placeholder="e.g. 1"
                                    />
                                </div>

                                {/* Starts At */}
                                <div className="space-y-2">
                                    <Label>Start Date & Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.starts_at}
                                        onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                                    />
                                </div>

                                {/* Expires At */}
                                <div className="space-y-2">
                                    <Label>End Date & Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.expires_at}
                                        onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                                    />
                                </div>

                                {/* Applicable On */}
                                <div className="space-y-2">
                                    <Label>Applicable On</Label>
                                    <Select
                                        value={form.applicable_on}
                                        onValueChange={(v) => setForm({ ...form, applicable_on: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Items</SelectItem>
                                            <SelectItem value="Specific">Specific Categories/Items</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Category/Item IDs */}
                                {form.applicable_on !== "All" && (
                                    <div className="space-y-2">
                                        <Label>Category / Item IDs <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                        <Input
                                            value={form.category_item_ids}
                                            onChange={(e) => setForm({ ...form, category_item_ids: e.target.value })}
                                            placeholder="e.g. cat1,cat2,item3"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label>Description <span className="text-muted-foreground text-xs">(optional, shown to customers)</span></Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="e.g. Holi special offer - Get 10% OFF on orders above ₹499"
                                    rows={2}
                                />
                            </div>

                            {/* Terms & Conditions */}
                            <div className="space-y-2">
                                <Label>Terms & Conditions <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Textarea
                                    value={form.terms_conditions}
                                    onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })}
                                    placeholder="e.g. * Valid on minimum order of ₹499&#10;* Maximum discount ₹150"
                                    rows={3}
                                />
                            </div>

                            {/* Valid Days */}
                            <div className="space-y-2">
                                <Label>Valid Days</Label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="all-days"
                                            checked={allDays}
                                            onCheckedChange={(checked) => {
                                                setAllDays(!!checked);
                                                if (checked) setSelectedDays([]);
                                            }}
                                        />
                                        <label htmlFor="all-days" className="text-sm">All Days</label>
                                    </div>
                                    {!allDays && ALL_DAYS.map((day) => (
                                        <div key={day} className="flex items-center gap-1.5">
                                            <Checkbox
                                                id={`day-${day}`}
                                                checked={selectedDays.includes(day)}
                                                onCheckedChange={() => toggleDay(day)}
                                            />
                                            <label htmlFor={`day-${day}`} className="text-sm">{day}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Order Types */}
                            <div className="space-y-2">
                                <Label>Order Types</Label>
                                <div className="flex items-center gap-4">
                                    {ORDER_TYPES.map((ot) => (
                                        <div key={ot.value} className="flex items-center gap-1.5">
                                            <Checkbox
                                                id={`ot-${ot.value}`}
                                                checked={form.discount_order_types.includes(ot.value)}
                                                onCheckedChange={() => toggleOrderType(ot.value)}
                                            />
                                            <label htmlFor={`ot-${ot.value}`} className="text-sm">{ot.label}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Switches */}
                            <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="discount-on-total"
                                        checked={form.discount_on_total}
                                        onCheckedChange={(checked) => setForm({ ...form, discount_on_total: checked })}
                                    />
                                    <Label htmlFor="discount-on-total">Discount on Total</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="has-coupon"
                                        checked={form.has_coupon}
                                        onCheckedChange={(checked) => setForm({ ...form, has_coupon: checked })}
                                    />
                                    <Label htmlFor="has-coupon">Requires Coupon Code</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="show-on-storefront"
                                        checked={form.show_on_storefront}
                                        onCheckedChange={(checked) => setForm({ ...form, show_on_storefront: checked })}
                                    />
                                    <Label htmlFor="show-on-storefront">Show on store page</Label>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    {editingId ? "Save changes" : "Create Discount"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={resetForm}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}

                <CardContent className={showForm ? "border-t pt-4" : ""}>
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : discounts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
                            <Tag className="h-8 w-8 opacity-40" />
                            <p className="text-sm">No discounts yet. Create one to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {discounts.map((disc) => {
                                const isExpired = disc.expires_at && new Date(disc.expires_at) < new Date();
                                const notStarted = disc.starts_at && new Date(disc.starts_at) > new Date();
                                const isLimitReached = disc.usage_limit != null && disc.used_count >= disc.usage_limit;

                                return (
                                    <div
                                        key={disc.id}
                                        className="flex items-center justify-between border rounded-lg p-4 gap-4"
                                    >
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono font-semibold text-sm tracking-wider">{disc.code}</span>
                                                <Badge variant={disc.discount_type === "freebie" || disc.discount_type === "bxgy" ? "default" : disc.discount_type === "percentage" ? "secondary" : "outline"} className="text-xs">
                                                    {disc.discount_type === "bxgy"
                                                        ? describeBxgy(disc, { nameOf: menuNameOf })
                                                        : disc.discount_type === "freebie"
                                                        ? `Free Item${disc.freebie_item_count && disc.freebie_item_count > 1 ? ` x${disc.freebie_item_count}` : ""}`
                                                        : disc.discount_type === "percentage"
                                                        ? `${disc.discount_value}% off`
                                                        : `₹${disc.discount_value} off`}
                                                </Badge>
                                                {disc.rank && <Badge variant="outline" className="text-xs">#{disc.rank}</Badge>}
                                                {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                                                {notStarted && !isExpired && <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">Scheduled</Badge>}
                                                {isLimitReached && !isExpired && <Badge variant="destructive" className="text-xs">Limit reached</Badge>}
                                                {!disc.has_coupon && <Badge variant="outline" className="text-xs">Auto-apply</Badge>}
                                                {disc.pp_discount_id && (
                                                    <Badge variant="outline" className="text-xs">Petpooja</Badge>
                                                )}
                                                {disc.pp_discount_id && !disc.pp_overwrite_enabled && (
                                                    <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                                        Locked from sync
                                                    </Badge>
                                                )}
                                            </div>
                                            {disc.description && (
                                                <p className="text-xs text-muted-foreground truncate">{disc.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                {disc.min_order_value && <span>Min: ₹{disc.min_order_value}</span>}
                                                {disc.max_discount_amount && <span>Max: ₹{disc.max_discount_amount}</span>}
                                                <span>Used: {disc.used_count}{disc.usage_limit ? ` / ${disc.usage_limit}` : ""}</span>
                                                {disc.per_user_usage_limit && <span>Per customer: {disc.per_user_usage_limit}</span>}
                                                {disc.discount_order_types && <span>Types: {formatOrderTypes(disc.discount_order_types)}</span>}
                                                {disc.valid_days && disc.valid_days !== "All" && <span>Days: {disc.valid_days}</span>}
                                                {disc.starts_at && (
                                                    <span>From: {new Date(disc.starts_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                                                )}
                                                {disc.expires_at && (
                                                    <span>Until: {new Date(disc.expires_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-foreground h-8 w-8"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(disc.code);
                                                    setCopiedId(disc.id);
                                                    setTimeout(() => setCopiedId(null), 2000);
                                                }}
                                            >
                                                {copiedId === disc.id
                                                    ? <Check className="h-4 w-4 text-green-500" />
                                                    : <Copy className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => startEdit(disc)}
                                                className={`h-8 w-8 ${editingId === disc.id ? "text-orange-600" : "text-muted-foreground hover:text-foreground"}`}
                                                title="Edit discount"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <div
                                                className="flex flex-col items-end gap-1"
                                                title="Show this discount as a card on your store page. Turn off to let the banner/carousel show instead."
                                            >
                                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                    On page
                                                </span>
                                                <Switch
                                                    checked={disc.show_on_storefront ?? true}
                                                    disabled={togglingStorefrontId === disc.id}
                                                    onCheckedChange={(checked) =>
                                                        handleStorefrontToggle(disc.id, checked)
                                                    }
                                                />
                                            </div>
                                            <div
                                                className="flex flex-col items-end gap-1"
                                                title="Allow Petpooja menu sync to overwrite this discount. Turn off to keep your local edits."
                                            >
                                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                    PP sync
                                                </span>
                                                <Switch
                                                    checked={disc.pp_overwrite_enabled}
                                                    disabled={togglingPpId === disc.id}
                                                    onCheckedChange={(checked) =>
                                                        handlePpOverwriteToggle(disc.id, checked)
                                                    }
                                                />
                                            </div>
                                            <Switch
                                                checked={disc.is_active}
                                                disabled={togglingId === disc.id || !!isExpired || !!isLimitReached}
                                                onCheckedChange={(checked) => handleToggle(disc.id, checked)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={deletingId === disc.id}
                                                onClick={() => handleDelete(disc.id)}
                                                className="text-muted-foreground hover:text-destructive h-8 w-8"
                                            >
                                                {deletingId === disc.id
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
