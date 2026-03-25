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
import { Loader2, Plus, Trash2, Tag, Copy, Check, Search } from "lucide-react";
import { getMenu } from "@/api/menu";

type Discount = {
    id: string;
    code: string;
    description: string | null;
    terms_conditions: string | null;
    discount_type: "percentage" | "flat" | "freebie";
    discount_value: number;
    min_order_value: number | null;
    max_discount_amount: number | null;
    usage_limit: number | null;
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
    discount_type: "percentage" as "percentage" | "flat" | "freebie",
    discount_value: "",
    min_order_value: "",
    max_discount_amount: "",
    usage_limit: "",
    starts_at: "",
    expires_at: "",
    valid_days: "All" as string,
    valid_time_from: "",
    valid_time_to: "",
    discount_order_types: ["1", "2", "3"] as string[],
    discount_on_total: true,
    has_coupon: true,
    applicable_on: "All",
    category_item_ids: "",
    rank: "",
    freebie_item_ids: "",
    freebie_item_count: "",
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

export function DiscountCodeSettings() {
    const { userData } = useAuthStore();
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [allDays, setAllDays] = useState(true);
    const [menuItems, setMenuItems] = useState<{ id: string; name: string; price: number }[]>([]);
    const [freebieSearch, setFreebieSearch] = useState("");
    const [selectedFreebieItems, setSelectedFreebieItems] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        if (userData?.id) {
            fetchDiscounts();
            fetchMenuItems();
        }
    }, [userData?.id]);

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

    const handleCreate = async () => {
        if (!userData?.id) return;
        if (!form.code.trim()) return toast.error("Code is required");
        if (form.discount_type !== "freebie") {
            if (!form.discount_value || Number(form.discount_value) <= 0) return toast.error("Discount value must be greater than 0");
            if (form.discount_type === "percentage" && Number(form.discount_value) > 100) return toast.error("Percentage cannot exceed 100");
        }
        if (form.discount_type === "freebie" && !form.freebie_item_ids.trim()) return toast.error("Freebie item IDs are required");

        setCreating(true);
        try {
            const object: any = {
                partner_id: userData.id,
                code: form.code.trim().toUpperCase(),
                discount_type: form.discount_type,
                discount_value: form.discount_type === "freebie" ? 0 : Number(form.discount_value),
                is_active: true,
                used_count: 0,
                discount_on_total: form.discount_on_total,
                has_coupon: form.has_coupon,
                applicable_on: form.applicable_on,
                valid_days: allDays ? "All" : selectedDays.join(","),
                discount_order_types: form.discount_order_types.join(","),
            };
            if (form.discount_type === "freebie") {
                object.freebie_item_ids = form.freebie_item_ids.trim();
                object.freebie_item_count = form.freebie_item_count ? Number(form.freebie_item_count) : 1;
            }
            if (form.description.trim()) object.description = form.description.trim();
            if (form.terms_conditions.trim()) object.terms_conditions = form.terms_conditions.trim();
            if (form.min_order_value) object.min_order_value = Number(form.min_order_value);
            if (form.max_discount_amount && form.discount_type === "percentage") object.max_discount_amount = Number(form.max_discount_amount);
            if (form.usage_limit) object.usage_limit = Number(form.usage_limit);
            if (form.starts_at) object.starts_at = new Date(form.starts_at).toISOString();
            if (form.expires_at) object.expires_at = new Date(form.expires_at).toISOString();
            if (form.valid_time_from) object.valid_time_from = form.valid_time_from;
            if (form.valid_time_to) object.valid_time_to = form.valid_time_to;
            if (form.applicable_on !== "All" && form.category_item_ids.trim()) object.category_item_ids = form.category_item_ids.trim();
            if (form.rank) object.rank = Number(form.rank);

            const res = await fetchFromHasura(createDiscountMutation, { object });
            setDiscounts((prev) => [res.insert_discounts_one, ...prev]);
            setForm(emptyForm);
            setSelectedDays([]);
            setAllDays(true);
            setSelectedFreebieItems([]);
            setFreebieSearch("");
            setShowForm(false);
            toast.success("Discount created");
        } catch (err: any) {
            if (err?.message?.includes("Uniqueness violation") || err?.message?.includes("unique")) {
                toast.error("A discount with this code already exists");
            } else {
                toast.error("Failed to create discount");
            }
        } finally {
            setCreating(false);
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
                            onClick={() => setShowForm((v) => !v)}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            New Discount
                        </Button>
                    </div>
                </CardHeader>

                {showForm && (
                    <CardContent className="border-t pt-6">
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Code */}
                                <div className="space-y-2">
                                    <Label>Code</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={form.code}
                                            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                            placeholder="e.g. SAVE10"
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
                                        onValueChange={(v) => setForm({ ...form, discount_type: v as "percentage" | "flat" | "freebie" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                                            <SelectItem value="freebie">Freebie (Free Item)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Discount Value */}
                                {form.discount_type !== "freebie" && (
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
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label>Select Free Item(s)</Label>
                                        {selectedFreebieItems.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {selectedFreebieItems.map((item) => (
                                                    <span key={item.id} className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs">
                                                        {item.name}
                                                        <button type="button" onClick={() => {
                                                            setSelectedFreebieItems((prev) => prev.filter((i) => i.id !== item.id));
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                freebie_item_ids: prev.freebie_item_ids.split(",").filter((id) => id !== item.id).join(","),
                                                                freebie_item_count: String(selectedFreebieItems.length - 1 || 1),
                                                            }));
                                                        }}>
                                                            <Trash2 className="h-3 w-3 hover:text-red-600" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                value={freebieSearch}
                                                onChange={(e) => setFreebieSearch(e.target.value)}
                                                placeholder="Search menu items..."
                                                className="pl-8"
                                            />
                                        </div>
                                        {freebieSearch && (
                                            <div className="border rounded-md max-h-40 overflow-y-auto">
                                                {menuItems
                                                    .filter((item) =>
                                                        item.name.toLowerCase().includes(freebieSearch.toLowerCase()) &&
                                                        !selectedFreebieItems.some((s) => s.id === item.id)
                                                    )
                                                    .slice(0, 10)
                                                    .map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center"
                                                            onClick={() => {
                                                                setSelectedFreebieItems((prev) => [...prev, { id: item.id, name: item.name }]);
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    freebie_item_ids: prev.freebie_item_ids ? `${prev.freebie_item_ids},${item.id}` : item.id,
                                                                    freebie_item_count: String(selectedFreebieItems.length + 1),
                                                                }));
                                                                setFreebieSearch("");
                                                            }}
                                                        >
                                                            <span>{item.name}</span>
                                                            <span className="text-muted-foreground text-xs">₹{item.price}</span>
                                                        </button>
                                                    ))}
                                                {menuItems.filter((item) =>
                                                    item.name.toLowerCase().includes(freebieSearch.toLowerCase()) &&
                                                    !selectedFreebieItems.some((s) => s.id === item.id)
                                                ).length === 0 && (
                                                    <p className="px-3 py-2 text-sm text-muted-foreground">No items found</p>
                                                )}
                                            </div>
                                        )}
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

                                {/* Max Discount Cap */}
                                {form.discount_type === "percentage" && (
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

                                {/* Valid Time From/To */}
                                <div className="space-y-2">
                                    <Label>Valid Time From <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input
                                        type="time"
                                        value={form.valid_time_from}
                                        onChange={(e) => setForm({ ...form, valid_time_from: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Valid Time To <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input
                                        type="time"
                                        value={form.valid_time_to}
                                        onChange={(e) => setForm({ ...form, valid_time_to: e.target.value })}
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
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={handleCreate}
                                    disabled={creating}
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Create Discount
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => { setShowForm(false); setForm(emptyForm); setSelectedDays([]); setAllDays(true); setSelectedFreebieItems([]); setFreebieSearch(""); }}
                                    disabled={creating}
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
                                                <Badge variant={disc.discount_type === "freebie" ? "default" : disc.discount_type === "percentage" ? "secondary" : "outline"} className="text-xs">
                                                    {disc.discount_type === "freebie"
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
                                            </div>
                                            {disc.description && (
                                                <p className="text-xs text-muted-foreground truncate">{disc.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                {disc.min_order_value && <span>Min: ₹{disc.min_order_value}</span>}
                                                {disc.max_discount_amount && <span>Max: ₹{disc.max_discount_amount}</span>}
                                                <span>Used: {disc.used_count}{disc.usage_limit ? ` / ${disc.usage_limit}` : ""}</span>
                                                {disc.discount_order_types && <span>Types: {formatOrderTypes(disc.discount_order_types)}</span>}
                                                {disc.valid_days && disc.valid_days !== "All" && <span>Days: {disc.valid_days}</span>}
                                                {disc.valid_time_from && disc.valid_time_to && (
                                                    <span>{disc.valid_time_from} - {disc.valid_time_to}</span>
                                                )}
                                                {disc.starts_at && (
                                                    <span>From: {new Date(disc.starts_at).toLocaleDateString()}</span>
                                                )}
                                                {disc.expires_at && (
                                                    <span>Until: {new Date(disc.expires_at).toLocaleDateString()}</span>
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
