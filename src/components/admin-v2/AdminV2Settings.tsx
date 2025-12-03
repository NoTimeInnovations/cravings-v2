"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneralSettings } from "./settings/GeneralSettings";
import { LocationSettings } from "./settings/LocationSettings";
import { DeliverySettings } from "./settings/DeliverySettings";
import { PaymentLegalSettings } from "./settings/PaymentLegalSettings";
import { FeatureSettings } from "./settings/FeatureSettings";

export function AdminV2Settings() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your store preferences and configurations.</p>
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
