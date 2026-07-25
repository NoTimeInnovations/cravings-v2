"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WhatsappNumberBanner } from "./WhatsappNumberBanner";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Bike, ShoppingBag, Utensils } from "lucide-react";
import { OrderTypesEnabled, DEFAULT_ORDER_TYPES_ENABLED } from "@/store/orderStore";
import { parseOrderTypesEnabled } from "@/lib/prebooking";
import { getFeatures } from "@/lib/getFeatures";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";

const ROWS: { key: keyof OrderTypesEnabled; label: string; desc: string; icon: any }[] = [
    { key: "delivery", label: "Delivery", desc: "Customers can order for delivery to their address.", icon: Bike },
    { key: "takeaway", label: "Takeaway", desc: "Customers can order for pickup.", icon: ShoppingBag },
    { key: "dine_in", label: "Dine-in", desc: "Customers can book a table (requires the Prebooking feature).", icon: Utensils },
];

export function OrderTypesSettings() {
    const { userData, setState } = useAuthStore();
    const { setSaveAction, setHasChanges } = useAdminSettingsStore();

    const [cfg, setCfg] = useState<OrderTypesEnabled>(DEFAULT_ORDER_TYPES_ENABLED);
    const [initialLoaded, setInitialLoaded] = useState(false);

    const prebookingOn = !!getFeatures((userData as any)?.feature_flags || null).prebooking?.enabled;

    useEffect(() => {
        if (!userData) return;
        setCfg(parseOrderTypesEnabled((userData as any)?.order_types_enabled));
        setInitialLoaded(true);
    }, [userData]);

    const handleSave = useCallback(async () => {
        if (!userData) return;
        try {
            const payload = JSON.stringify(cfg);
            await updatePartner((userData as any).id, { order_types_enabled: payload });
            revalidateTag((userData as any).id);
            setState({ order_types_enabled: payload } as any);
            toast.success("Order types saved");
            setHasChanges(false);
        } catch (e) {
            console.error("Error saving order types:", e);
            toast.error("Failed to save order types");
        }
    }, [cfg, userData, setState, setHasChanges]);

    useEffect(() => {
        if (!initialLoaded) return;
        setHasChanges(true);
        setSaveAction(handleSave);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [cfg, initialLoaded, handleSave, setSaveAction, setHasChanges]);

    return (
        <div className="space-y-4">
            <WhatsappNumberBanner />
            <Card>
                <CardHeader>
                    <CardTitle>Order Types</CardTitle>
                    <CardDescription>
                        Choose which order types your store offers. Disabled types are hidden from
                        customers at onboarding and checkout.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {ROWS.map((row) => {
                        const Icon = row.icon;
                        const isDineIn = row.key === "dine_in";
                        return (
                            <div key={row.key} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div className="space-y-0.5">
                                        <div className="font-medium">{row.label}</div>
                                        <div className="text-sm text-muted-foreground">{row.desc}</div>
                                        {isDineIn && !prebookingOn && (
                                            <div className="text-xs text-amber-600">
                                                Enable the Prebooking feature for dine-in to appear to customers.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Switch
                                    checked={cfg[row.key]}
                                    onCheckedChange={(v) => setCfg((p) => ({ ...p, [row.key]: v }))}
                                />
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
