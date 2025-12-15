"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneralSettings } from "./settings/GeneralSettings";
import { LocationSettings } from "./settings/LocationSettings";
import { DeliverySettings } from "./settings/DeliverySettings";
import { PaymentLegalSettings } from "./settings/PaymentLegalSettings";
import { FeatureSettings } from "./settings/FeatureSettings";

import { Button } from "@/components/ui/button";
import { LogOut, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

function FloatingSaveButton() {
    const { saveAction, isSaving, hasChanges } = useAdminSettingsStore();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (saveAction && hasChanges) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [saveAction, hasChanges]);

    if (!isVisible || !saveAction) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <Button
                onClick={saveAction}
                disabled={isSaving}
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-xl rounded-full h-12 px-6"
            >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                <span className="font-semibold">Save Changes</span>
            </Button>
        </div>
    );
}

export function AdminV2Settings() {
    const { userData, signOut, features } = useAuthStore();
    const router = useRouter();

    const showOrderRelatedSettings = features?.ordering?.enabled;

    const firstQrCodeId = (userData as any)?.qr_codes?.[0]?.id;
    const hotelNameSlug = (userData as any)?.name?.replace(/ /g, "-");

    const handleViewMenu = () => {
        if (hotelNameSlug && firstQrCodeId) {
            const url = `https://www.cravings.live/qrScan/${hotelNameSlug}/${firstQrCodeId}`;
            window.open(url, "_blank");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between gap-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">Manage your store configurations.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleViewMenu}
                        className="flex items-center gap-2 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
                    >
                        <ExternalLink className="h-4 w-4" />
                        <span className="inline">View Menu</span>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="flex w-full sm:w-auto overflow-x-auto justify-start">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                    {showOrderRelatedSettings && (
                        <>
                            <TabsTrigger value="delivery">Delivery</TabsTrigger>
                            <TabsTrigger value="payment">Payment & Legal</TabsTrigger>
                        </>
                    )}
                    <TabsTrigger value="features">Features</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <GeneralSettings />
                </TabsContent>

                <TabsContent value="location" className="space-y-4">
                    <LocationSettings />
                </TabsContent>

                {showOrderRelatedSettings && (
                    <>
                        <TabsContent value="delivery" className="space-y-4">
                            <DeliverySettings />
                        </TabsContent>

                        <TabsContent value="payment" className="space-y-4">
                            <PaymentLegalSettings />
                        </TabsContent>
                    </>
                )}

                <TabsContent value="features" className="space-y-4">
                    <FeatureSettings />
                </TabsContent>
            </Tabs>

            <FloatingSaveButton />
        </div>
    );
}
