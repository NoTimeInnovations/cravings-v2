"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updatePartnerMutation } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Loader2, Save } from "lucide-react";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";



export function PaymentLegalSettings() {
    const { userData, setState } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);


    const [upiId, setUpiId] = useState("");
    const [showPaymentQr, setShowPaymentQr] = useState(false);
    const [fssaiLicenceNo, setFssaiLicenceNo] = useState("");

    // GST State
    const [gstNo, setGstNo] = useState("");
    const [gstPercentage, setGstPercentage] = useState(0);
    const [gstEnabled, setGstEnabled] = useState(false);

    useEffect(() => {
        if (userData?.role === "partner") {

            setUpiId(userData.upi_id || "");
            setShowPaymentQr(userData.show_payment_qr || false);
            setFssaiLicenceNo(userData.fssai_licence_no || "");
            setGstNo(userData.gst_no || "");
            setGstPercentage(userData.gst_percentage || 0);
            setGstEnabled((userData.gst_percentage || 0) > 0);
        }
    }, [userData]);

    const handleSavePayment = useCallback(async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            const updates = {

                upi_id: upiId,
                show_payment_qr: showPaymentQr,
                fssai_licence_no: fssaiLicenceNo,
                gst_no: gstNo,
                gst_percentage: gstEnabled ? gstPercentage : 0
            };

            await fetchFromHasura(updatePartnerMutation, {
                id: userData.id,
                updates
            });

            revalidateTag(userData.id);
            setState(updates);
            toast.success("Payment & Legal settings updated successfully");
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    }, [userData, upiId, showPaymentQr, fssaiLicenceNo, gstNo, gstEnabled, gstPercentage, setState]);

    const { setSaveAction, setIsSaving: setGlobalIsSaving } = useAdminSettingsStore();

    useEffect(() => {
        setSaveAction(handleSavePayment);
        return () => setSaveAction(null);
    }, [handleSavePayment, setSaveAction]);

    useEffect(() => {
        setGlobalIsSaving(isSaving);
    }, [isSaving]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Payment Configuration</CardTitle>
                    <CardDescription>Manage payment methods.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">


                    <div className="space-y-2">
                        <Label>UPI ID</Label>
                        <Input
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="username@upi"
                        />
                    </div>

                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Show Payment QR</Label>
                            <p className="text-sm text-muted-foreground">Display QR code on receipts/checkout.</p>
                        </div>
                        <Switch checked={showPaymentQr} onCheckedChange={setShowPaymentQr} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Legal & Taxes</CardTitle>
                    <CardDescription>Manage GST and licensing information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>FSSAI Licence No.</Label>
                        <Input
                            value={fssaiLicenceNo}
                            onChange={(e) => setFssaiLicenceNo(e.target.value)}
                            placeholder="Enter licence number"
                        />
                    </div>

                    <div className="space-y-4 border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Enable GST</Label>
                                <p className="text-sm text-muted-foreground">Apply GST to orders.</p>
                            </div>
                            <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
                        </div>

                        {gstEnabled && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>GST Number</Label>
                                    <Input
                                        value={gstNo}
                                        onChange={(e) => setGstNo(e.target.value)}
                                        placeholder="GSTIN"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>GST Percentage (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={gstPercentage}
                                        onChange={(e) => setGstPercentage(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>


        </div >
    );
}
