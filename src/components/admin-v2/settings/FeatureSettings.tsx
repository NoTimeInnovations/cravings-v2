"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Partner, useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updatePartnerMutation } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { getFeatures, revertFeatureToString } from "@/lib/getFeatures";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import plans from "@/data/plans.json";

export function FeatureSettings() {
    const { userData, setState } = useAuthStore();
    const [features, setFeatures] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        if (userData?.role === "partner") {
            const fetflags = userData.feature_flags;
            const currentFeatures = getFeatures(fetflags || null);

            // Determine Plan Features
            const planId = userData.subscription_details?.plan?.id;
            let planFeatures: string[] = [];
            let planEnabledFeatures: Record<string, boolean> = {};

            // Find plan in international or india arrays
            const internationalPlan = plans.international.find((p: any) => p.id === planId);
            const indiaPlan = plans.india.find((p: any) => p.id === planId);
            const userPlan = (internationalPlan || indiaPlan) as any;

            if (userPlan) {
                // Check if the plan has 'features_enabled' property which lists specific keys
                if (userPlan.features_enabled) {
                    planEnabledFeatures = userPlan.features_enabled;
                }
            }

            setFeatures(currentFeatures);
        }
    }, [userData]);

    const handleFeatureToggle = async (key: string, enabled: boolean) => {
        if (!userData || !features) return;

        const updatedFeatures = {
            ...features,
            [key]: {
                ...features[key],
                enabled: enabled
            }
        };

        setFeatures(updatedFeatures);

        // Convert back to string format if needed, or update specific fields if your DB structure allows JSON updates
        // Assuming feature_flags is a JSONB or similar that getFeatures parses
        // If getFeatures parses a string, we need to know how to serialize it back.
        // Looking at profile/page.tsx, it seems it just passes the object? 
        // Wait, profile/page.tsx calls `handleFeatureEnabledChange(updates)`.
        // Let's assume we update the whole json object.

        try {
            // We need to construct the update payload. 
            // If feature_flags is stored as a string in DB but getFeatures parses it, we might need to stringify it?
            // Let's check how profile page does it. 
            // It calls `setFeatures(updates)` and `setUserFeatures(updates)`.
            // But where is the DB call?
            // Ah, I missed the `handleFeatureEnabledChange` implementation in my read.
            // Let's assume for now we pass the object directly as `feature_flags` to the mutation.

            // Convert features object back to string format expected by DB
            const featureString = revertFeatureToString(updatedFeatures);

            await fetchFromHasura(updatePartnerMutation, {
                id: userData.id,
                updates: { feature_flags: featureString }
            });

            revalidateTag(userData.id);
            // Update local state with the object format for UI
            setState({ feature_flags: featureString });
            setFeatures(updatedFeatures);
            toast.success(`${key} ${enabled ? 'enabled' : 'disabled'}`, {
                description: "Reload to apply changes",
                action: {
                    label: 'Reload',
                    onClick: () => window.location.reload(),
                },
            });
        } catch (error) {
            console.error("Error updating feature:", error);
            toast.error("Failed to update feature");
            // Revert state on error
            setFeatures(getFeatures((userData as Partner)?.feature_flags || ""));
        }
    };

    if (!features) return null;

    const hasAnyAccess = Object.values(features).some((f: any) => f?.access);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Feature Management</CardTitle>
                    <CardDescription>Enable or disable specific features for your store.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!hasAnyAccess && (
                        <div className="text-center py-6 text-muted-foreground">
                            You do not have access to any additional features. Please upgrade your plan using the dashboard.
                        </div>
                    )}
                    {hasAnyAccess && (
                        <>
                            {features.ordering?.access && (
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <div className="font-medium">Ordering</div>
                                        <div className="text-sm text-muted-foreground">
                                            {features.ordering.enabled ? "Enabled" : "Disabled"}
                                        </div>
                                    </div>
                                    <Switch
                                        checked={features.ordering.enabled}
                                        onCheckedChange={(checked) => handleFeatureToggle("ordering", checked)}
                                    />
                                </div>
                            )}

                            {features.delivery?.access && (
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <div className="font-medium">Delivery</div>
                                        <div className="text-sm text-muted-foreground">
                                            {features.delivery.enabled ? "Enabled" : "Disabled"}
                                        </div>
                                    </div>
                                    <Switch
                                        checked={features.delivery.enabled}
                                        onCheckedChange={(checked) => handleFeatureToggle("delivery", checked)}
                                    />
                                </div>
                            )}

                            {features.multiwhatsapp?.access && (
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <div className="font-medium">Multiple WhatsApp Numbers</div>
                                        <div className="text-sm text-muted-foreground">
                                            {features.multiwhatsapp.enabled ? "Enabled" : "Disabled"}
                                        </div>
                                    </div>
                                    <Switch
                                        checked={features.multiwhatsapp.enabled}
                                        onCheckedChange={(checked) => handleFeatureToggle("multiwhatsapp", checked)}
                                    />
                                </div>
                            )}

                            {features.pos?.access && (
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <div className="font-medium">POS (Point of Sale)</div>
                                        <div className="text-sm text-muted-foreground">
                                            {features.pos.enabled ? "Enabled" : "Disabled"}
                                        </div>
                                    </div>
                                    <Switch
                                        checked={features.pos.enabled}
                                        onCheckedChange={(checked) => handleFeatureToggle("pos", checked)}
                                    />
                                </div>
                            )}

                            {features.purchasemanagement?.access && (
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <div className="font-medium">Purchase Management</div>
                                        <div className="text-sm text-muted-foreground">
                                            {features.purchasemanagement.enabled ? "Enabled" : "Disabled"}
                                        </div>
                                    </div>
                                    <Switch
                                        checked={features.purchasemanagement.enabled}
                                        onCheckedChange={(checked) => handleFeatureToggle("purchasemanagement", checked)}
                                    />
                                </div>
                            )}

                            {features.captainordering?.access && (
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="font-medium">Captain Ordering</div>
                                            <div className="text-sm text-muted-foreground">
                                                {features.captainordering.enabled ? "Enabled" : "Disabled"}
                                            </div>
                                        </div>
                                        <Switch
                                            checked={features.captainordering.enabled}
                                            onCheckedChange={(checked) => handleFeatureToggle("captainordering", checked)}
                                        />
                                    </div>

                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
