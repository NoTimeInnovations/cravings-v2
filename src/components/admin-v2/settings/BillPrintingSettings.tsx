"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";

export function BillPrintingSettings() {
    const { userData, setState } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);

    // When on, the item names logged for /bill and /kot printing are prefixed
    // with their category (e.g. "Biryani - Chicken Biryani"). Stored inside
    // delivery_rules (the billing/printing config blob) so it rides along the
    // same partner row the round-off toggle uses — no schema change.
    const [includeCategoryName, setIncludeCategoryName] = useState(false);

    useEffect(() => {
        if (userData) {
            const data = userData as any;
            setIncludeCategoryName(!!data.delivery_rules?.bill_include_category_name);
        }
    }, [userData]);

    const handleSave = useCallback(async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            // Read-modify-write delivery_rules so we don't clobber round-off /
            // delivery pricing owned by other settings sections.
            const existingDeliveryRules = (userData as any).delivery_rules || {};
            const updates = {
                delivery_rules: {
                    ...existingDeliveryRules,
                    bill_include_category_name: includeCategoryName,
                },
            };

            await updatePartner(userData.id, updates);

            revalidateTag(userData.id);
            setState(updates);
            toast.success("Bill printing settings updated successfully");
        } catch (error) {
            console.error("Error updating bill printing settings:", error);
            toast.error("Failed to update bill printing settings");
        } finally {
            setIsSaving(false);
        }
    }, [userData, includeCategoryName, setState]);

    const { setSaveAction, setIsSaving: setGlobalIsSaving, setHasChanges } = useAdminSettingsStore();

    useEffect(() => {
        setSaveAction(handleSave);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [handleSave, setSaveAction, setHasChanges]);

    useEffect(() => {
        setGlobalIsSaving(isSaving);
    }, [isSaving, setGlobalIsSaving]);

    useEffect(() => {
        if (!userData) return;
        const data = userData as any;
        const initial = !!data.delivery_rules?.bill_include_category_name;
        setHasChanges(includeCategoryName !== initial);
    }, [includeCategoryName, userData, setHasChanges]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bill Printing</CardTitle>
                    <CardDescription>
                        Control how printed bills and kitchen tickets (KOT) are formatted.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Include category name with item name</Label>
                            <p className="text-sm text-muted-foreground">
                                When on, each item on the printed bill and KOT shows its category
                                before the name (e.g. &quot;Biryani - Chicken Biryani&quot;).
                            </p>
                        </div>
                        <Switch checked={includeCategoryName} onCheckedChange={setIncludeCategoryName} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
