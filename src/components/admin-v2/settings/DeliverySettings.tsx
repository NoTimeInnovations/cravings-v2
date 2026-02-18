"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { countryCodes } from "@/utils/countryCodes";

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
    const [whatsappNumbers, setWhatsappNumbers] = useState<{ number: string; area: string }[]>([]);
    const [countryCode, setCountryCode] = useState("+91");

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

            // Initialize WhatsApp numbers
            setWhatsappNumbers(
                userData.whatsapp_numbers?.length > 0
                    ? userData.whatsapp_numbers
                    : [{ number: userData.phone || "", area: "default" }]
            );

            // Initialize country code
            setCountryCode(userData.country_code || "+91");
        }
    }, [userData]);

    const handleSaveDelivery = useCallback(async () => {
        if (!userData) return;

        // Validate WhatsApp numbers
        for (const item of whatsappNumbers) {
            if (!item.number || item.number.length !== 10) {
                toast.error(`Please enter a valid WhatsApp Number for ${item.area || "unnamed area"}`);
                return;
            }
            if (!item.area) {
                toast.error("Please specify an area for each number");
                return;
            }
        }

        setIsSaving(true);
        try {
            const updates = {
                delivery_rate: deliveryRate,
                delivery_rules: deliveryRules,
                whatsapp_numbers: whatsappNumbers,
                country_code: countryCode
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
    }, [userData, deliveryRate, deliveryRules, whatsappNumbers, countryCode, setState]);

    const { setSaveAction, setIsSaving: setGlobalIsSaving, setHasChanges } = useAdminSettingsStore();

    useEffect(() => {
        setSaveAction(handleSaveDelivery);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [handleSaveDelivery, setSaveAction, setHasChanges]);

    useEffect(() => {
        setGlobalIsSaving(isSaving);
    }, [isSaving, setGlobalIsSaving]);

    // Check for changes
    useEffect(() => {
        if (!userData) return;
        const data = userData as any;

        const initialRate = data.delivery_rate || 0;

        const hasAdvancedRules = data.delivery_rules?.delivery_ranges && data.delivery_rules.delivery_ranges.length > 0;
        const hasLegacyRules = data.delivery_rules?.first_km_range;
        const deliveryMode = data.delivery_rules?.delivery_mode || (hasAdvancedRules ? "advanced" : "basic");

        const initialRules = {
            delivery_radius: data.delivery_rules?.delivery_radius || 5,
            delivery_ranges: data.delivery_rules?.delivery_ranges || [],
            first_km_range: data.delivery_rules?.first_km_range || (deliveryMode === "basic" && !hasLegacyRules ? { km: 1, rate: 0 } : undefined),
            delivery_mode: deliveryMode,
            is_fixed_rate: data.delivery_rules?.is_fixed_rate || false,
            minimum_order_amount: data.delivery_rules?.minimum_order_amount || 0,
            delivery_time_allowed: data.delivery_rules?.delivery_time_allowed || null,
            isDeliveryActive: data.delivery_rules?.isDeliveryActive ?? true,
            needDeliveryLocation: data.delivery_rules?.needDeliveryLocation ?? true,
        };

        const initialWhatsapp = data.whatsapp_numbers?.length > 0
            ? data.whatsapp_numbers
            : [{ number: data.phone || "", area: "default" }];
        const initialCountryCode = data.country_code || "+91";

        const hasChanges =
            deliveryRate !== initialRate ||
            JSON.stringify(deliveryRules) !== JSON.stringify(initialRules) ||
            JSON.stringify(whatsappNumbers) !== JSON.stringify(initialWhatsapp) ||
            countryCode !== initialCountryCode;

        setHasChanges(hasChanges);

    }, [
        userData,
        deliveryRate,
        deliveryRules,
        whatsappNumbers,
        countryCode,
        setHasChanges
    ]);

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

    const addWhatsappNumber = () => {
        setWhatsappNumbers(prev => [...prev, { number: "", area: "" }]);
    };

    const removeWhatsappNumber = (index: number) => {
        if (whatsappNumbers.length === 1) {
            toast.error("You must have at least one WhatsApp number");
            return;
        }
        setWhatsappNumbers(prev => prev.filter((_, i) => i !== index));
    };

    const updateWhatsappNumber = (index: number, field: "number" | "area", value: string) => {
        setWhatsappNumbers(prev => {
            const newNumbers = [...prev];
            newNumbers[index] = { ...newNumbers[index], [field]: value };
            return newNumbers;
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
                                        <Label className="text-base font-semibold">Variable Pricing</Label>
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

            <Card>
                <CardHeader>
                    <CardTitle>Delivery Contact Numbers</CardTitle>
                    <CardDescription>Manage WhatsApp numbers for different delivery areas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Country Code</Label>
                        <Select value={countryCode} onValueChange={setCountryCode}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {countryCodes.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {c.flag} {c.name} ({c.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        {whatsappNumbers.map((item, idx) => (
                            <div key={idx} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/20">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Area/Location</Label>
                                    <Input
                                        value={item.area}
                                        onChange={(e) => updateWhatsappNumber(idx, "area", e.target.value)}
                                        placeholder="e.g., Downtown, North Zone"
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">WhatsApp Number (10 digits)</Label>
                                    <Input
                                        value={item.number}
                                        onChange={(e) => updateWhatsappNumber(idx, "number", e.target.value)}
                                        placeholder="9876543210"
                                        maxLength={10}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => removeWhatsappNumber(idx)}
                                    disabled={whatsappNumbers.length === 1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addWhatsappNumber}>
                        <Plus className="mr-2 h-4 w-4" /> Add WhatsApp Number
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        Add multiple WhatsApp numbers for different delivery areas to help customers contact the right person.
                    </p>
                </CardContent>
            </Card>

        </div>
    );
}
