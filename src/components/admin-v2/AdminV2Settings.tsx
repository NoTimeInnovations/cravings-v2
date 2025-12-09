"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneralSettings } from "./settings/GeneralSettings";
import { LocationSettings } from "./settings/LocationSettings";
import { DeliverySettings } from "./settings/DeliverySettings";
import { PaymentLegalSettings } from "./settings/PaymentLegalSettings";
import { FeatureSettings } from "./settings/FeatureSettings";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export function AdminV2Settings() {
    const { signOut } = useAuthStore();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut();
        router.push("/auth");
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">Manage your store preferences and configurations.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Log Out</span>
                </Button>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="flex w-full sm:w-auto overflow-x-auto justify-start">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                    <TabsTrigger value="delivery">Delivery</TabsTrigger>
                    <TabsTrigger value="payment">Payment & Legal</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <GeneralSettings />
                </TabsContent>

                <TabsContent value="location" className="space-y-4">
                    <LocationSettings />
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4">
                    <DeliverySettings />
                </TabsContent>

                <TabsContent value="payment" className="space-y-4">
                    <PaymentLegalSettings />
                </TabsContent>

                <TabsContent value="features" className="space-y-4">
                    <FeatureSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
