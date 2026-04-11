"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Loader2, Save } from "lucide-react";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";

const DEFAULT_POST_PAYMENT_MESSAGE = "Send payment screenshot to WhatsApp after payment";

export function PaymentLegalSettings() {
    const { userData, setState } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);

    const [upiId, setUpiId] = useState("");
    const [showPaymentQr, setShowPaymentQr] = useState(false);
    const [postPaymentMessage, setPostPaymentMessage] = useState(DEFAULT_POST_PAYMENT_MESSAGE);
    const [fssaiLicenceNo, setFssaiLicenceNo] = useState("");

    // Payment Methods State
    const [acceptCod, setAcceptCod] = useState(true);
    const [cashfreeMerchantId, setCashfreeMerchantId] = useState("");
    const [acceptPaymentsViaCashfree, setAcceptPaymentsViaCashfree] = useState(false);

    // GST State
    const [gstNo, setGstNo] = useState("");
    const [gstPercentage, setGstPercentage] = useState(0);
    const [gstEnabled, setGstEnabled] = useState(false);

    useEffect(() => {
        if (userData?.role === "partner") {
            setUpiId(userData.upi_id || "");
            setShowPaymentQr(userData.show_payment_qr || false);
            setPostPaymentMessage(userData.post_payment_message || DEFAULT_POST_PAYMENT_MESSAGE);
            setFssaiLicenceNo(userData.fssai_licence_no || "");
            setGstNo(userData.gst_no || "");
            setGstPercentage(userData.gst_percentage || 0);
            setGstEnabled((userData.gst_percentage || 0) > 0);
            setAcceptCod((userData as any).accept_cod ?? true);
            setCashfreeMerchantId((userData as any).cashfree_merchant_id || "");
            setAcceptPaymentsViaCashfree((userData as any).accept_payments_via_cashfree || false);
        }
    }, [userData]);

    const handleSavePayment = useCallback(async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            const updates = {
                upi_id: upiId,
                show_payment_qr: showPaymentQr,
                post_payment_message: postPaymentMessage.trim() || null,
                fssai_licence_no: fssaiLicenceNo,
                gst_no: gstNo,
                gst_percentage: gstEnabled ? gstPercentage : 0,
                accept_cod: acceptCod,
                cashfree_merchant_id: cashfreeMerchantId.trim() || null,
                accept_payments_via_cashfree: acceptPaymentsViaCashfree,
            };

            await updatePartner(userData.id, updates);

            revalidateTag(userData.id);
            setState(updates);
            toast.success("Payment & Legal settings updated successfully");
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    }, [userData, upiId, showPaymentQr, postPaymentMessage, fssaiLicenceNo, gstNo, gstEnabled, gstPercentage, acceptCod, cashfreeMerchantId, acceptPaymentsViaCashfree, setState]);

    const { setSaveAction, setIsSaving: setGlobalIsSaving, setHasChanges } = useAdminSettingsStore();

    useEffect(() => {
        setSaveAction(handleSavePayment);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [handleSavePayment, setSaveAction, setHasChanges]);

    useEffect(() => {
        setGlobalIsSaving(isSaving);
    }, [isSaving, setGlobalIsSaving]);

    // Check for changes
    useEffect(() => {
        if (!userData) return;
        const data = userData as any;

        const initialUpi = data.upi_id || "";
        const initialQr = data.show_payment_qr || false;
        const initialPostPaymentMessage = data.post_payment_message || DEFAULT_POST_PAYMENT_MESSAGE;
        const initialFssai = data.fssai_licence_no || "";
        const initialGstNo = data.gst_no || "";
        const initialGstPerc = data.gst_percentage || 0;
        const initialGstEnabled = (data.gst_percentage || 0) > 0;
        const initialAcceptCod = data.accept_cod ?? true;
        const initialCashfreeMerchantId = data.cashfree_merchant_id || "";
        const initialAcceptCashfree = data.accept_payments_via_cashfree || false;

        const hasChanges =
            upiId !== initialUpi ||
            showPaymentQr !== initialQr ||
            postPaymentMessage !== initialPostPaymentMessage ||
            fssaiLicenceNo !== initialFssai ||
            gstNo !== initialGstNo ||
            gstPercentage !== initialGstPerc ||
            gstEnabled !== initialGstEnabled ||
            acceptCod !== initialAcceptCod ||
            cashfreeMerchantId !== initialCashfreeMerchantId ||
            acceptPaymentsViaCashfree !== initialAcceptCashfree;

        setHasChanges(hasChanges);

    }, [
        upiId,
        showPaymentQr,
        postPaymentMessage,
        fssaiLicenceNo,
        gstNo,
        gstPercentage,
        gstEnabled,
        acceptCod,
        cashfreeMerchantId,
        acceptPaymentsViaCashfree,
        userData,
        setHasChanges
    ]);

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
                            <p className="text-sm text-muted-foreground">Display UPI QR screen after customer places an order.</p>
                        </div>
                        <Switch checked={showPaymentQr} onCheckedChange={setShowPaymentQr} />
                    </div>

                    {showPaymentQr && (
                        <div className="space-y-2 border rounded-lg p-4">
                            <Label className="text-base">Message Under QR Code</Label>
                            <p className="text-sm text-muted-foreground">
                                Shown to the customer below the payment QR code.
                            </p>
                            <Input
                                value={postPaymentMessage}
                                onChange={(e) => setPostPaymentMessage(e.target.value)}
                                placeholder="e.g. Pay and show screenshot to staff"
                                maxLength={120}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Choose which payment methods customers can use at checkout.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Cash on Delivery</Label>
                            <p className="text-sm text-muted-foreground">
                                Allow customers to pay at the time of delivery or pickup.
                            </p>
                        </div>
                        <Switch checked={acceptCod} onCheckedChange={setAcceptCod} />
                    </div>

                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Cashfree Online Payment</Label>
                            <p className="text-sm text-muted-foreground">
                                Accept online payments via Cashfree (UPI, Cards, Netbanking).
                            </p>
                        </div>
                        <Switch
                            checked={acceptPaymentsViaCashfree}
                            onCheckedChange={setAcceptPaymentsViaCashfree}
                            disabled={!cashfreeMerchantId.trim()}
                        />
                    </div>

                    {acceptPaymentsViaCashfree && (
                        <div className="space-y-2 border rounded-lg p-4">
                            <Label>Cashfree Merchant ID</Label>
                            <Input
                                value={cashfreeMerchantId}
                                onChange={(e) => setCashfreeMerchantId(e.target.value)}
                                placeholder="Enter your Cashfree Merchant ID"
                            />
                        </div>
                    )}

                    {!acceptPaymentsViaCashfree && (
                        <div className="space-y-2 border rounded-lg p-4">
                            <Label>Cashfree Merchant ID</Label>
                            <Input
                                value={cashfreeMerchantId}
                                onChange={(e) => setCashfreeMerchantId(e.target.value)}
                                placeholder="Enter Merchant ID to enable Cashfree"
                            />
                        </div>
                    )}
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
