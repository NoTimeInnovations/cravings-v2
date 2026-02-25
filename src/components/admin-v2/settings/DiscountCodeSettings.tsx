"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
    getDiscountCodesQuery,
    createDiscountCodeMutation,
    updateDiscountCodeMutation,
    deleteDiscountCodeMutation,
} from "@/api/discountCodes";
import { Loader2, Plus, Trash2, Tag, Copy, Check } from "lucide-react";

type DiscountCode = {
    id: string;
    code: string;
    discount_type: "percentage" | "flat";
    discount_value: number;
    min_order_value: number | null;
    max_discount_amount: number | null;
    usage_limit: number | null;
    used_count: number;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
};

const emptyForm = {
    code: "",
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: "",
    min_order_value: "",
    max_discount_amount: "",
    usage_limit: "",
    expires_at: "",
};

function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function DiscountCodeSettings() {
    const { userData } = useAuthStore();
    const [codes, setCodes] = useState<DiscountCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (userData?.id) fetchCodes();
    }, [userData?.id]);

    const fetchCodes = async () => {
        if (!userData?.id) return;
        setLoading(true);
        try {
            const res = await fetchFromHasura(getDiscountCodesQuery, { partner_id: userData.id });
            setCodes(res.discount_codes ?? []);
        } catch {
            toast.error("Failed to load discount codes");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!userData?.id) return;
        if (!form.code.trim()) return toast.error("Code is required");
        if (!form.discount_value || Number(form.discount_value) <= 0) return toast.error("Discount value must be greater than 0");
        if (form.discount_type === "percentage" && Number(form.discount_value) > 100) return toast.error("Percentage cannot exceed 100");

        setCreating(true);
        try {
            const object: any = {
                partner_id: userData.id,
                code: form.code.trim().toUpperCase(),
                discount_type: form.discount_type,
                discount_value: Number(form.discount_value),
                is_active: true,
                used_count: 0,
            };
            if (form.min_order_value) object.min_order_value = Number(form.min_order_value);
            if (form.max_discount_amount && form.discount_type === "percentage") object.max_discount_amount = Number(form.max_discount_amount);
            if (form.usage_limit) object.usage_limit = Number(form.usage_limit);
            if (form.expires_at) object.expires_at = new Date(form.expires_at).toISOString();

            const res = await fetchFromHasura(createDiscountCodeMutation, { object });
            setCodes((prev) => [res.insert_discount_codes_one, ...prev]);
            setForm(emptyForm);
            setShowForm(false);
            toast.success("Discount code created");
        } catch (err: any) {
            if (err?.message?.includes("Uniqueness violation") || err?.message?.includes("unique")) {
                toast.error("A code with this name already exists");
            } else {
                toast.error("Failed to create discount code");
            }
        } finally {
            setCreating(false);
        }
    };

    const handleToggle = async (id: string, is_active: boolean) => {
        setTogglingId(id);
        try {
            await fetchFromHasura(updateDiscountCodeMutation, { id, updates: { is_active } });
            setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active } : c)));
        } catch {
            toast.error("Failed to update code");
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await fetchFromHasura(deleteDiscountCodeMutation, { id });
            setCodes((prev) => prev.filter((c) => c.id !== id));
            toast.success("Discount code deleted");
        } catch {
            toast.error("Failed to delete code");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Discount Codes</CardTitle>
                            <CardDescription>Create and manage discount codes for your customers.</CardDescription>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setShowForm((v) => !v)}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            New Code
                        </Button>
                    </div>
                </CardHeader>

                {showForm && (
                    <CardContent className="border-t pt-6">
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
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

                                <div className="space-y-2">
                                    <Label>Discount Type</Label>
                                    <Select
                                        value={form.discount_type}
                                        onValueChange={(v) => setForm({ ...form, discount_type: v as "percentage" | "flat" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

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

                                <div className="space-y-2">
                                    <Label>Expiry Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input
                                        type="date"
                                        value={form.expires_at}
                                        onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                                        min={new Date().toISOString().split("T")[0]}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={handleCreate}
                                    disabled={creating}
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Create Code
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => { setShowForm(false); setForm(emptyForm); }}
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
                    ) : codes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
                            <Tag className="h-8 w-8 opacity-40" />
                            <p className="text-sm">No discount codes yet. Create one to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {codes.map((code) => {
                                const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                                const isLimitReached = code.usage_limit != null && code.used_count >= code.usage_limit;

                                return (
                                    <div
                                        key={code.id}
                                        className="flex items-center justify-between border rounded-lg p-4 gap-4"
                                    >
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono font-semibold text-sm tracking-wider">{code.code}</span>
                                                <Badge variant={code.discount_type === "percentage" ? "secondary" : "outline"} className="text-xs">
                                                    {code.discount_type === "percentage"
                                                        ? `${code.discount_value}% off`
                                                        : `₹${code.discount_value} off`}
                                                </Badge>
                                                {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                                                {isLimitReached && !isExpired && <Badge variant="destructive" className="text-xs">Limit reached</Badge>}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                {code.min_order_value && <span>Min order: ₹{code.min_order_value}</span>}
                                                {code.max_discount_amount && <span>Max: ₹{code.max_discount_amount}</span>}
                                                <span>Used: {code.used_count}{code.usage_limit ? ` / ${code.usage_limit}` : ""}</span>
                                                {code.expires_at && (
                                                    <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-foreground h-8 w-8"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(code.code);
                                                    setCopiedId(code.id);
                                                    setTimeout(() => setCopiedId(null), 2000);
                                                }}
                                            >
                                                {copiedId === code.id
                                                    ? <Check className="h-4 w-4 text-green-500" />
                                                    : <Copy className="h-4 w-4" />}
                                            </Button>
                                            <Switch
                                                checked={code.is_active}
                                                disabled={togglingId === code.id || !!isExpired || !!isLimitReached}
                                                onCheckedChange={(checked) => handleToggle(code.id, checked)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={deletingId === code.id}
                                                onClick={() => handleDelete(code.id)}
                                                className="text-muted-foreground hover:text-destructive h-8 w-8"
                                            >
                                                {deletingId === code.id
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
