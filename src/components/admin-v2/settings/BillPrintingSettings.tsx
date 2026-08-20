"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Trash2 } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { uploadFileToS3, deleteFileFromS3 } from "@/app/actions/aws-s3";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import {
    getBillLayout,
    isFullArabic,
    isBillDetailQrEnabled,
    isBillDeliveryBoyEnabled,
    isBillLogoEnabled,
    getBillLogoUrl,
    isBillAutoPrintEnabled,
    getBillAutoPrintStatus,
    BILL_AUTO_PRINT_STATUSES,
    type BillLayout,
} from "@/lib/printLayout";

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
    const [showDeliveryBoy, setShowDeliveryBoy] = useState(false);
    const [showLogo, setShowLogo] = useState(false);
    const [billLogoUrl, setBillLogoUrl] = useState<string | null>(null);
    const [isLogoUploading, setIsLogoUploading] = useState(false);
    const [autoPrint, setAutoPrint] = useState(false);
    const [autoPrintStatus, setAutoPrintStatus] = useState("completed");

    useEffect(() => {
        if (userData) {
            const data = userData as any;
            setIncludeCategoryName(!!data.delivery_rules?.bill_include_category_name);
            setBillLayout(getBillLayout(data.delivery_rules));
            setShowDeliveryBoy(isBillDeliveryBoyEnabled(data.delivery_rules));
            setFullArabic(isFullArabic(data.delivery_rules));
            setShowDetailQr(isBillDetailQrEnabled(data.delivery_rules));
            setShowLogo(isBillLogoEnabled(data.delivery_rules));
            setBillLogoUrl(getBillLogoUrl(data.delivery_rules));
            setAutoPrint(isBillAutoPrintEnabled(data.delivery_rules));
            setAutoPrintStatus(getBillAutoPrintStatus(data.delivery_rules));
        }
    }, [userData]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-selecting the same file
        if (!file || !userData) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file");
            return;
        }
        setIsLogoUploading(true);
        try {
            // Remove the previously uploaded logo from S3 (best-effort).
            if (billLogoUrl?.includes("cravingsbucket")) {
                await deleteFileFromS3(billLogoUrl).catch(() => {});
            }
            const ext = file.type.split("/")[1] || "png";
            const url = await uploadFileToS3(
                file,
                `bill_logos/${(userData as any).id}_${Date.now()}.${ext}`
            );
            if (!url) throw new Error("Upload failed");
            setBillLogoUrl(url);
            setShowLogo(true); // enabling on first upload is the expected default
            toast.success("Logo uploaded — press Save to apply");
        } catch (err) {
            console.error("Bill logo upload error:", err);
            toast.error("Failed to upload logo");
        } finally {
            setIsLogoUploading(false);
        }
    };

    const handleLogoRemove = async () => {
        if (billLogoUrl?.includes("cravingsbucket")) {
            await deleteFileFromS3(billLogoUrl).catch(() => {});
        }
        setBillLogoUrl(null);
        setShowLogo(false);
    };

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
                    bill_show_delivery_boy: showDeliveryBoy,
                    bill_show_logo: showLogo,
                    bill_logo_url: billLogoUrl || "",
                    bill_auto_print_enabled: autoPrint,
                    bill_auto_print_status: autoPrintStatus,
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
    }, [userData, includeCategoryName, billLayout, fullArabic, showDetailQr, showDeliveryBoy, showLogo, billLogoUrl, autoPrint, autoPrintStatus, setState]);

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
            showDetailQr !== isBillDetailQrEnabled(data.delivery_rules) ||
            showDeliveryBoy !== isBillDeliveryBoyEnabled(data.delivery_rules) ||
            showLogo !== isBillLogoEnabled(data.delivery_rules) ||
            (billLogoUrl || null) !== getBillLogoUrl(data.delivery_rules) ||
            autoPrint !== isBillAutoPrintEnabled(data.delivery_rules) ||
            autoPrintStatus !== getBillAutoPrintStatus(data.delivery_rules);
        setHasChanges(changed);
    }, [includeCategoryName, billLayout, fullArabic, showDetailQr, showDeliveryBoy, showLogo, billLogoUrl, autoPrint, autoPrintStatus, userData, setHasChanges]);

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

                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Show delivery boy info on bill</Label>
                            <p className="text-sm text-muted-foreground">
                                Print the assigned rider&apos;s name and phone on the bill. Only
                                appears once an order actually has a rider assigned.
                            </p>
                        </div>
                        <Switch checked={showDeliveryBoy} onCheckedChange={setShowDeliveryBoy} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bill logo</CardTitle>
                    <CardDescription>
                        Upload a logo to print at the top of the bill, and choose whether to show it.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                            {billLogoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={billLogoUrl}
                                    alt="Bill logo"
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <span className="text-[11px] text-muted-foreground text-center px-1">
                                    No logo
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button variant="outline" className="relative" disabled={isLogoUploading}>
                                {isLogoUploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                {billLogoUrl ? "Replace logo" : "Upload logo"}
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    onChange={handleLogoUpload}
                                    disabled={isLogoUploading}
                                />
                            </Button>
                            {billLogoUrl && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 justify-start px-2"
                                    onClick={handleLogoRemove}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between border rounded-lg p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Show logo on bill</Label>
                            <p className="text-sm text-muted-foreground">
                                Print the uploaded logo at the top of the bill. Bills with a logo print as
                                an image, so text may look slightly softer than the plain receipt.
                            </p>
                        </div>
                        <Switch checked={showLogo} onCheckedChange={setShowLogo} disabled={!billLogoUrl} />
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

            <Card>
                <CardHeader>
                    <CardTitle>Auto print</CardTitle>
                    <CardDescription>
                        Open the bill automatically when an order reaches a chosen status,
                        so nobody has to press Print.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5 pr-4">
                            <Label>Auto print the bill</Label>
                            <p className="text-sm text-muted-foreground">
                                Prints from the device where the status is changed, so keep
                                this dashboard open on the machine with the printer.
                            </p>
                        </div>
                        <Switch checked={autoPrint} onCheckedChange={setAutoPrint} />
                    </div>

                    {autoPrint && (
                        <div className="space-y-2 rounded-lg border p-4">
                            <Label>Print when the order status changes to</Label>
                            <select
                                value={autoPrintStatus}
                                onChange={(e) => setAutoPrintStatus(e.target.value)}
                                className="h-9 w-full max-w-xs rounded-md border bg-background px-3 text-sm"
                            >
                                {BILL_AUTO_PRINT_STATUSES.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                                Only this status prints — moving an order through earlier
                                statuses on the way there does not. Cancelled is not offered:
                                there is nothing to bill.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
