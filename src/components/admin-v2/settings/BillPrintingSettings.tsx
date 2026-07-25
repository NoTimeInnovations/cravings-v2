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
import { getBillLayout, isFullArabic, isBillDetailQrEnabled, type BillLayout } from "@/lib/printLayout";

// Layout choices, mirrored in the desktop print app (main.js VALID_BILL_LAYOUTS)
// and rendered by the /bill page (billLayouts.tsx).
const LAYOUT_OPTIONS: { value: BillLayout; title: string; desc: string }[] = [
    { value: "default", title: "Default", desc: "Standard Menuthere receipt" },
    { value: "invoice", title: "Tax Invoice", desc: "Bilingual ZATCA simplified tax invoice" },
    { value: "uae", title: "UAE Invoice", desc: "UAE VAT slip — VAT/Net labels always bilingual" },
];

export function BillPrintingSettings() {
    const { userData, setState } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);

    // All three toggles live inside delivery_rules (the billing/printing config
    // blob) so they ride along the same partner row — no schema change. The
    // /bill and /kot print pages read them (and pass them to the desktop print
    // app in their print payload), so changing them here updates the printed
    // bill/KOT in the browser and on the desktop app alike.
    const [includeCategoryName, setIncludeCategoryName] = useState(false);
    const [billLayout, setBillLayout] = useState<BillLayout>("default");
    const [fullArabic, setFullArabic] = useState(false);
    const [showDetailQr, setShowDetailQr] = useState(false);

    useEffect(() => {
        if (userData) {
            const data = userData as any;
            setIncludeCategoryName(!!data.delivery_rules?.bill_include_category_name);
            setBillLayout(getBillLayout(data.delivery_rules));
            setFullArabic(isFullArabic(data.delivery_rules));
            setShowDetailQr(isBillDetailQrEnabled(data.delivery_rules));
        }
    }, [userData]);

    const handleSave = useCallback(async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            // Read-modify-write delivery_rules so we don't clobber round-off /
            // delivery pricing / VAT owned by other settings sections.
            const existingDeliveryRules = (userData as any).delivery_rules || {};
            const updates = {
                delivery_rules: {
                    ...existingDeliveryRules,
                    bill_include_category_name: includeCategoryName,
                    bill_layout: billLayout,
                    bill_full_arabic: fullArabic,
                    bill_show_detail_qr: showDetailQr,
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
    }, [userData, includeCategoryName, billLayout, fullArabic, showDetailQr, setState]);

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
        const changed =
            includeCategoryName !== !!data.delivery_rules?.bill_include_category_name ||
            billLayout !== getBillLayout(data.delivery_rules) ||
            fullArabic !== isFullArabic(data.delivery_rules) ||
            showDetailQr !== isBillDetailQrEnabled(data.delivery_rules);
        setHasChanges(changed);
    }, [includeCategoryName, billLayout, fullArabic, showDetailQr, userData, setHasChanges]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bill Printing</CardTitle>
                    <CardDescription>
                        Control how printed bills and kitchen tickets (KOT) are formatted. These apply to the
                        bill / KOT print pages and the desktop print app.
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

                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Show bill detail QR</Label>
                            <p className="text-sm text-muted-foreground">
                                Print a QR code on the bill that the customer can scan to open the
                                order details online (menuthere.com/order/&hellip;).
                            </p>
                        </div>
                        <Switch checked={showDetailQr} onCheckedChange={setShowDetailQr} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bill layout</CardTitle>
                    <CardDescription>
                        Choose the printed bill format. This replaces the layout picker that used to live in the
                        desktop print app&apos;s Printer Settings. (Paper size and text scale stay in the desktop
                        app, since they calibrate each specific printer.)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {LAYOUT_OPTIONS.map((opt) => {
                            const selected = billLayout === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setBillLayout(opt.value)}
                                    aria-pressed={selected}
                                    className={`text-left rounded-lg border p-4 transition-colors ${
                                        selected
                                            ? "border-orange-500 bg-orange-50"
                                            : "hover:border-orange-300 hover:bg-orange-50/30"
                                    }`}
                                >
                                    <div className="font-semibold">{opt.title}</div>
                                    <div className="text-sm text-muted-foreground mt-0.5">{opt.desc}</div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Full Arabic</Label>
                            <p className="text-sm text-muted-foreground">
                                Print the bill / KOT labels (Tel, Order, Date, Time, Subtotal, Total,
                                Thank you…) in Arabic. On the Tax Invoice / UAE Invoice layouts this shows
                                bilingual labels. Item names always keep their own text.
                            </p>
                        </div>
                        <Switch checked={fullArabic} onCheckedChange={setFullArabic} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
