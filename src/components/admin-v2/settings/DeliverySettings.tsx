"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore, Partner } from "@/store/authStore";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updatePartnerMutation } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { DeliveryRules, DeliveryRange } from "@/store/orderStore";

export function DeliverySettings() {
    const { userData, setState } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);

    const [deliveryRate, setDeliveryRate] = useState(0);
    const [deliveryRules, setDeliveryRules] = useState<DeliveryRules>({
        delivery_radius: 5,
        delivery_ranges: [],
        delivery_mode: "basic",
        is_fixed_rate: false,
        minimum_order_amount: 0,
        delivery_time_allowed: null,
        isDeliveryActive: true,
        needDeliveryLocation: true,
    });

    const currencySymbol = (userData as Partner)?.currency || "₹";

    useEffect(() => {
        if (userData?.role === "partner") {
            setDeliveryRate(userData.delivery_rate || 0);

            const hasAdvancedRules = userData.delivery_rules?.delivery_ranges && userData.delivery_rules.delivery_ranges.length > 0;
            const hasLegacyRules = userData.delivery_rules?.first_km_range;
            const deliveryMode = userData.delivery_rules?.delivery_mode || (hasAdvancedRules ? "advanced" : "basic");

            setDeliveryRules({
                delivery_radius: userData.delivery_rules?.delivery_radius || 5,
                delivery_ranges: userData.delivery_rules?.delivery_ranges || [],
                first_km_range: userData.delivery_rules?.first_km_range || (deliveryMode === "basic" && !hasLegacyRules ? { km: 1, rate: 0 } : undefined),
                delivery_mode: deliveryMode,
                is_fixed_rate: userData.delivery_rules?.is_fixed_rate || false,
                minimum_order_amount: userData.delivery_rules?.minimum_order_amount || 0,
                delivery_time_allowed: userData.delivery_rules?.delivery_time_allowed || null,
                isDeliveryActive: userData.delivery_rules?.isDeliveryActive ?? true,
                needDeliveryLocation: userData.delivery_rules?.needDeliveryLocation ?? true,
            });
        }
    }, [userData]);

    const handleSaveDelivery = async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            const updates = {
                delivery_rate: deliveryRate,
                delivery_rules: deliveryRules
            };

            await fetchFromHasura(updatePartnerMutation, {
                id: userData.id,
                updates
            });

            revalidateTag(userData.id);
            setState(updates);
            toast.success("Delivery settings updated successfully");
        } catch (error) {
            console.error("Error updating delivery settings:", error);
            toast.error("Failed to update delivery settings");
        } finally {
            setIsSaving(false);
        }
    };

    const addRange = () => {
        const newRange: DeliveryRange = { from_km: 0, to_km: 1, rate: 0 };
        setDeliveryRules(prev => ({
            ...prev,
            delivery_ranges: [...(prev.delivery_ranges || []), newRange]
        }));
    };

    const removeRange = (index: number) => {
        setDeliveryRules(prev => ({
            ...prev,
            delivery_ranges: (prev.delivery_ranges || []).filter((_, i) => i !== index)
        }));
    };

    const updateRange = (index: number, field: keyof DeliveryRange, value: number) => {
        setDeliveryRules(prev => {
            const newRanges = [...(prev.delivery_ranges || [])];
            newRanges[index] = { ...newRanges[index], [field]: value };
            return { ...prev, delivery_ranges: newRanges };
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Delivery Configuration</CardTitle>
                    <CardDescription>Configure how you handle deliveries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Enable Delivery</Label>
                            <p className="text-sm text-muted-foreground">Turn delivery on or off.</p>
                        </div>
                        <Switch
                            checked={deliveryRules.isDeliveryActive}
                            onCheckedChange={(checked) => setDeliveryRules(prev => ({ ...prev, isDeliveryActive: checked }))}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Need Delivery Location?</Label>
                            <Select
                                value={deliveryRules.needDeliveryLocation ? "yes" : "no"}
                                onValueChange={(val) => setDeliveryRules(prev => ({
                                    ...prev,
                                    needDeliveryLocation: val === "yes",
                                    is_fixed_rate: val === "yes" ? prev.is_fixed_rate : true
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yes">Yes</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Minimum Order Amount ({currencySymbol})</Label>
                            <Input
                                type="number"
                                min="0"
                                value={deliveryRules.minimum_order_amount}
                                onChange={(e) => setDeliveryRules(prev => ({ ...prev, minimum_order_amount: Number(e.target.value) }))}
                            />
                        </div>
                    </div>

                    {deliveryRules.needDeliveryLocation && (
                        <>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Delivery Radius (km)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={deliveryRules.delivery_radius}
                                        onChange={(e) => setDeliveryRules(prev => ({ ...prev, delivery_radius: Number(e.target.value) }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pricing Type</Label>
                                    <Select
                                        value={deliveryRules.is_fixed_rate ? "fixed" : "variable"}
                                        onValueChange={(val) => setDeliveryRules(prev => ({ ...prev, is_fixed_rate: val === "fixed" }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fixed">Fixed Rate</SelectItem>
                                            <SelectItem value="variable">Variable (Distance Based)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {deliveryRules.is_fixed_rate ? (
                                <div className="space-y-2">
                                    <Label>Fixed Delivery Charge ({currencySymbol})</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={deliveryRate}
                                        onChange={(e) => setDeliveryRate(Number(e.target.value))}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">Variable Pricing Logic</Label>
                                        <Select
                                            value={deliveryRules.delivery_mode || "basic"}
                                            onValueChange={(val: "basic" | "advanced") => setDeliveryRules(prev => ({
                                                ...prev,
                                                delivery_mode: val,
                                                delivery_ranges: val === "advanced" ? (prev.delivery_ranges?.length ? prev.delivery_ranges : []) : undefined,
                                                first_km_range: val === "basic" ? (prev.first_km_range || { km: 1, rate: 0 }) : undefined
                                            }))}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="basic">Basic (Base + Per KM)</SelectItem>
                                                <SelectItem value="advanced">Advanced (Ranges)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {deliveryRules.delivery_mode === "basic" && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Base Distance (First X km)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={deliveryRules.first_km_range?.km || 0}
                                                    onChange={(e) => setDeliveryRules(prev => ({
                                                        ...prev,
                                                        first_km_range: { ...prev.first_km_range!, km: Number(e.target.value) }
                                                    }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Base Charge ({currencySymbol})</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={deliveryRules.first_km_range?.rate || 0}
                                                    onChange={(e) => setDeliveryRules(prev => ({
                                                        ...prev,
                                                        first_km_range: { ...prev.first_km_range!, rate: Number(e.target.value) }
                                                    }))}
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Charge Per Additional KM ({currencySymbol})</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={deliveryRate}
                                                    onChange={(e) => setDeliveryRate(Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {deliveryRules.delivery_mode === "advanced" && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                {(deliveryRules.delivery_ranges || []).map((range, idx) => (
                                                    <div key={idx} className="flex items-end gap-2">
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs">From (km)</Label>
                                                            <Input type="number" min="0" value={range.from_km} onChange={(e) => updateRange(idx, "from_km", Number(e.target.value))} />
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs">To (km)</Label>
                                                            <Input type="number" min="0" value={range.to_km} onChange={(e) => updateRange(idx, "to_km", Number(e.target.value))} />
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs">Rate ({currencySymbol})</Label>
                                                            <Input type="number" min="0" value={range.rate} onChange={(e) => updateRange(idx, "rate", Number(e.target.value))} />
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRange(idx)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={addRange}>
                                                <Plus className="mr-2 h-4 w-4" /> Add Range
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <div className="space-y-2">
                        <Label>Delivery Time Window</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="time"
                                value={deliveryRules.delivery_time_allowed?.from || ""}
                                onChange={(e) => setDeliveryRules(prev => ({
                                    ...prev,
                                    delivery_time_allowed: { from: e.target.value, to: prev.delivery_time_allowed?.to || "23:59" }
                                }))}
                            />
                            <span>to</span>
                            <Input
                                type="time"
                                value={deliveryRules.delivery_time_allowed?.to || ""}
                                onChange={(e) => setDeliveryRules(prev => ({
                                    ...prev,
                                    delivery_time_allowed: { from: prev.delivery_time_allowed?.from || "00:00", to: e.target.value }
                                }))}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveDelivery} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
