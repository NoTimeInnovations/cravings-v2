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
import OwnRazorpayCard from "@/components/OwnRazorpayCard";

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

    // Delivery rider's "Show QR" source: "none" hides the button, "upi" reuses
    // partner UPI id, "cashfree" creates a per-order Cashfree UPI QR.
    const [deliveryQrMethod, setDeliveryQrMethod] = useState<"none" | "upi" | "cashfree">("none");

    // Per-order-method payment matrix (delivery/takeaway × online/cash). Online
    // requires Cashfree configured. Defaults derive from the global flags when
    // the partner hasn't set it yet (so existing behaviour is preserved).
    const [paymentModes, setPaymentModes] = useState<{
        delivery: { online: boolean; cash: boolean };
        takeaway: { online: boolean; cash: boolean };
        dine_in: { online: boolean; cash: boolean };
    }>({
        delivery: { online: false, cash: true },
        takeaway: { online: false, cash: true },
        dine_in: { online: false, cash: true },
    });

    // GST State
    const [gstNo, setGstNo] = useState("");
    const [gstPercentage, setGstPercentage] = useState(0);
    const [gstEnabled, setGstEnabled] = useState(false);

    // Round Off: when on, checkout adds a "Round Off" charge so the total is a
    // whole number. Stored inside delivery_rules (the billing-config blob).
    // Defaults to false.
    const [roundOff, setRoundOff] = useState(false);

    // Use VAT: when on, bills / checkout label the tax as "VAT" instead of the
    // India-style "GST" (CGST+SGST split). Stored inside delivery_rules (the
    // billing-config blob). UAE partners always show VAT regardless. Default false.
    const [useVat, setUseVat] = useState(false);

    // TRN (Tax Registration Number) — the UAE VAT registration id printed on tax
    // invoices. Stored inside delivery_rules (the billing-config blob) alongside
    // use_vat, since it's part of the same VAT configuration.
    const [trn, setTrn] = useState("");

    useEffect(() => {
        if (userData?.role === "partner") {
            setUpiId(userData.upi_id || "");
            setShowPaymentQr(userData.show_payment_qr || false);
            setPostPaymentMessage(userData.post_payment_message || DEFAULT_POST_PAYMENT_MESSAGE);
            setFssaiLicenceNo(userData.fssai_licence_no || "");
            setGstNo(userData.gst_no || "");
            setGstPercentage(userData.gst_percentage || 0);
            setGstEnabled((userData.gst_percentage || 0) > 0);
            setRoundOff(!!(userData as any).delivery_rules?.round_off);
            setUseVat(!!(userData as any).delivery_rules?.use_vat);
            setTrn((userData as any).delivery_rules?.trn || "");
            setAcceptCod((userData as any).accept_cod ?? true);
            setCashfreeMerchantId((userData as any).cashfree_merchant_id || "");
            setAcceptPaymentsViaCashfree((userData as any).accept_payments_via_cashfree || false);
            const dqm = (userData as any).delivery_qr_method;
            setDeliveryQrMethod(dqm === "upi" || dqm === "cashfree" ? dqm : "none");

            // Per-method matrix: use saved payment_modes; for any unset method/flag
            // fall back to the global online (cashfree) / cash (cod) values.
            const pm = (userData as any).payment_modes;
            const baseOnline = (userData as any).accept_payments_via_cashfree || false;
            const baseCash = (userData as any).accept_cod ?? true;
            setPaymentModes({
                delivery: {
                    online: pm?.delivery?.online ?? baseOnline,
                    cash: pm?.delivery?.cash ?? baseCash,
                },
                takeaway: {
                    online: pm?.takeaway?.online ?? baseOnline,
                    cash: pm?.takeaway?.cash ?? baseCash,
                },
                dine_in: {
                    online: pm?.dine_in?.online ?? baseOnline,
                    cash: pm?.dine_in?.cash ?? baseCash,
                },
            });
        }
    }, [userData]);

    const handleSavePayment = useCallback(async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            // Merge round_off into the existing delivery_rules (read-modify-write)
            // so we don't clobber delivery pricing / windows owned by DeliverySettings.
            const existingDeliveryRules = (userData as any).delivery_rules || {};
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
                delivery_qr_method: deliveryQrMethod,
                payment_modes: paymentModes,
                delivery_rules: { ...existingDeliveryRules, round_off: roundOff, use_vat: useVat, trn: trn.trim() || null },
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
    }, [userData, upiId, showPaymentQr, postPaymentMessage, fssaiLicenceNo, gstNo, gstEnabled, gstPercentage, acceptCod, cashfreeMerchantId, acceptPaymentsViaCashfree, deliveryQrMethod, paymentModes, roundOff, useVat, trn, setState]);

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
        const initialDeliveryQrMethod = data.delivery_qr_method || "none";
        const initialRoundOff = !!data.delivery_rules?.round_off;
        const initialUseVat = !!data.delivery_rules?.use_vat;
        const initialTrn = data.delivery_rules?.trn || "";
        const initialPaymentModes = (() => {
            const pm = data.payment_modes;
            const bo = data.accept_payments_via_cashfree || false;
            const bc = data.accept_cod ?? true;
            return {
                delivery: { online: pm?.delivery?.online ?? bo, cash: pm?.delivery?.cash ?? bc },
                takeaway: { online: pm?.takeaway?.online ?? bo, cash: pm?.takeaway?.cash ?? bc },
                dine_in: { online: pm?.dine_in?.online ?? bo, cash: pm?.dine_in?.cash ?? bc },
            };
        })();

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
            acceptPaymentsViaCashfree !== initialAcceptCashfree ||
            deliveryQrMethod !== initialDeliveryQrMethod ||
            roundOff !== initialRoundOff ||
            useVat !== initialUseVat ||
            trn.trim() !== initialTrn ||
            JSON.stringify(paymentModes) !== JSON.stringify(initialPaymentModes);

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
        deliveryQrMethod,
        paymentModes,
        roundOff,
        useVat,
        trn,
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

            {(userData as any)?.id && <OwnRazorpayCard partnerId={(userData as any).id} />}

            <Card>
                <CardHeader>
                    <CardTitle>Payment options by order type</CardTitle>
                    <CardDescription>
                        Choose which payment options customers see for each order type. &ldquo;Online&rdquo; requires Cashfree to be configured above.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {([
                        { key: "delivery" as const, label: "Delivery", cashLabel: "Pay on delivery" },
                        { key: "takeaway" as const, label: "Takeaway", cashLabel: "Pay at store" },
                        { key: "dine_in" as const, label: "Dine-in", cashLabel: "Pay at table" },
                    ]).map(({ key, label, cashLabel }) => {
                        const cfg = paymentModes[key];
                        const onlineAvailable = acceptPaymentsViaCashfree && !!cashfreeMerchantId.trim();
                        const bothOff = !(cfg.online && onlineAvailable) && !cfg.cash;
                        const set = (field: "online" | "cash", val: boolean) =>
                            setPaymentModes((prev) => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
                        return (
                            <div key={key} className="border rounded-lg p-4 space-y-3">
                                <div className="font-medium">{label}</div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm">Online (Cashfree)</Label>
                                        {!onlineAvailable && (
                                            <p className="text-xs text-muted-foreground">Enable Cashfree above to allow online.</p>
                                        )}
                                    </div>
                                    <Switch
                                        checked={cfg.online && onlineAvailable}
                                        disabled={!onlineAvailable}
                                        onCheckedChange={(v) => set("online", v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">{cashLabel} (cash)</Label>
                                    <Switch checked={cfg.cash} onCheckedChange={(v) => set("cash", v)} />
                                </div>
                                {bothOff && (
                                    <p className="text-xs text-rose-600">
                                        ⚠ No payment option enabled — customers won&apos;t be able to check out for {label.toLowerCase()}.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Delivery Rider Cash Collection QR</CardTitle>
                    <CardDescription>
                        What the rider&apos;s &ldquo;Show QR&rdquo; button displays when collecting payment at the door.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {([
                        {
                            value: "none" as const,
                            label: "No QR",
                            desc: "Hide the Show QR button in the rider app.",
                            disabled: false,
                            hint: null as string | null,
                        },
                        {
                            value: "upi" as const,
                            label: "UPI ID",
                            desc: "Show your UPI ID as a QR. Customer scans and pays in their UPI app.",
                            disabled: !upiId.trim(),
                            hint: !upiId.trim() ? "Set your UPI ID above first." : null,
                        },
                        {
                            value: "cashfree" as const,
                            label: "Cashfree",
                            desc: "Generate a per-order Cashfree UPI QR. Payment auto-marks the order as paid.",
                            disabled: !acceptPaymentsViaCashfree || !cashfreeMerchantId.trim(),
                            hint: !acceptPaymentsViaCashfree || !cashfreeMerchantId.trim()
                                ? "Enable Cashfree Online Payment above and set the Merchant ID first."
                                : null,
                        },
                    ]).map((opt) => {
                        const active = deliveryQrMethod === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                disabled={opt.disabled}
                                onClick={() => setDeliveryQrMethod(opt.value)}
                                className={`w-full flex items-start gap-3 border rounded-lg p-4 text-left transition ${
                                    active
                                        ? "border-primary bg-primary/5"
                                        : "border-input hover:bg-accent"
                                } ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                <div
                                    className={`mt-1 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                                        active ? "border-primary bg-primary" : "border-input"
                                    }`}
                                />
                                <div className="flex-1">
                                    <Label className="text-base">{opt.label}</Label>
                                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                                    {opt.hint && (
                                        <p className="text-xs text-amber-600 mt-1">{opt.hint}</p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
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

                        <div className="flex items-center justify-between border-t pt-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Use VAT</Label>
                                <p className="text-sm text-muted-foreground">
                                    Label the tax as &quot;VAT&quot; on bills and checkout instead of the
                                    India-style GST (CGST + SGST). UAE stores always show VAT.
                                </p>
                            </div>
                            <Switch checked={useVat} onCheckedChange={setUseVat} />
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            <Label>TRN (Tax Registration Number)</Label>
                            <p className="text-sm text-muted-foreground">
                                Your VAT Tax Registration Number (UAE).
                            </p>
                            <Input
                                value={trn}
                                onChange={(e) => setTrn(e.target.value)}
                                placeholder="15-digit Tax Registration Number"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Round Off</Label>
                            <p className="text-sm text-muted-foreground">
                                Add a &quot;Round Off&quot; line at checkout so the bill total is rounded to the nearest whole number (down below .50, up from .50).
                            </p>
                        </div>
                        <Switch checked={roundOff} onCheckedChange={setRoundOff} />
                    </div>
                </CardContent>
            </Card>


        </div >
    );
}
