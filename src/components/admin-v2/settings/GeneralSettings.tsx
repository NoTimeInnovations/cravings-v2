"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import CustomDomainSettings from "@/components/admin/CustomDomainSettings";
import { revalidateTag } from "@/app/actions/revalidate";
import { Loader2, Save, Power, LogOut, Eye, EyeOff, KeyRound } from "lucide-react";
import { HotelData } from "@/app/hotels/[...id]/page";
import { getSocialLinks } from "@/lib/getSocialLinks";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { LocationSettings } from "./LocationSettings";

export function GeneralSettings() {
    const { userData, setState } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);
    const [storeName, setStoreName] = useState("");
    const [storeTagline, setStoreTagline] = useState("");
    const [description, setDescription] = useState("");
    const [phone, setPhone] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [footNote, setFootNote] = useState("");
    const [instaLink, setInstaLink] = useState("");
    const [facebookLink, setFacebookLink] = useState("");
    const [isShopOpen, setIsShopOpen] = useState(true);
    const [timezone, setTimezone] = useState("Asia/Kolkata");

    // Official Settings (used for legal pages — Cashfree KYC etc.)
    const [officialName, setOfficialName] = useState("");
    const [aboutUs, setAboutUs] = useState("");
    const [operatingAddress, setOperatingAddress] = useState("");
    const [officialEmailId, setOfficialEmailId] = useState("");
    const [officialPhoneNumber, setOfficialPhoneNumber] = useState("");

    // Password State
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);

    useEffect(() => {
        if (userData?.role === "partner") {
            setStoreName(userData.store_name || "");
            setStoreTagline((userData as any).store_tagline || "");
            setDescription(userData.description || "");
            setPhone(userData.phone || "");
            setWhatsappNumber(userData.whatsapp_numbers?.[0]?.number || userData.phone || "");
            setFootNote(userData.footnote || "");
            setIsShopOpen(userData.is_shop_open);
            setTimezone((userData as any).timezone || "Asia/Kolkata");

            setOfficialName((userData as any).official_name || "");
            setAboutUs((userData as any).about_us || "");
            setOperatingAddress((userData as any).operating_address || "");
            setOfficialEmailId((userData as any).official_email_id || "");
            setOfficialPhoneNumber((userData as any).official_phone_number || "");

            const socialLinks = getSocialLinks(userData as HotelData);
            setInstaLink(socialLinks.instagram || "");
            setFacebookLink(socialLinks.facebook || "");
        }
    }, [userData]);

    const handleSaveGeneral = useCallback(async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            // Read-modify-write social_links so we preserve keys owned by other
            // sections (Integrations: zomato/uberEats/talabat/doordash; Info Page:
            // playstore/appstore). Only instagram/facebook are edited here.
            const existingSocialLinks = getSocialLinks(userData as HotelData);

            // Preserve every other area/branch the partner configured (Delivery
            // settings stores per-area numbers as whatsapp_numbers[{number,area}]).
            // Only update the primary ("default", else first) entry.
            const existingWa: Array<{ number: string; area: string }> = Array.isArray(
                (userData as any).whatsapp_numbers,
            )
                ? (userData as any).whatsapp_numbers
                : [];
            let nextWhatsappNumbers: Array<{ number: string; area: string }>;
            if (existingWa.length === 0) {
                nextWhatsappNumbers = [{ number: whatsappNumber, area: "default" }];
            } else {
                const di = existingWa.findIndex((w) => w?.area === "default");
                const target = di >= 0 ? di : 0;
                nextWhatsappNumbers = existingWa.map((w, i) =>
                    i === target ? { ...w, number: whatsappNumber } : w,
                );
            }

            const updates: any = {
                store_name: storeName,
                store_tagline: storeTagline || null,
                description,
                phone,
                footnote: footNote,
                is_shop_open: isShopOpen,
                timezone,
                whatsapp_numbers: nextWhatsappNumbers,
                social_links: {
                    ...existingSocialLinks,
                    instagram: instaLink,
                    facebook: facebookLink,
                },
                official_name: officialName || null,
                about_us: aboutUs || null,
                operating_address: operatingAddress || null,
                official_email_id: officialEmailId || null,
                official_phone_number: officialPhoneNumber || null,
            };

            await updatePartner(userData.id, updates);
            await revalidateTag(userData.id);
            setState(updates);
            toast.success("General settings updated successfully");
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    }, [userData, storeName, storeTagline, description, phone, footNote, isShopOpen, timezone, whatsappNumber, instaLink, facebookLink, officialName, aboutUs, operatingAddress, officialEmailId, officialPhoneNumber, setState]);

    const { setSaveAction, setIsSaving: setGlobalIsSaving, setHasChanges } = useAdminSettingsStore();

    useEffect(() => {
        setSaveAction(handleSaveGeneral);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [handleSaveGeneral, setSaveAction, setHasChanges]);

    useEffect(() => {
        setGlobalIsSaving(isSaving);
    }, [isSaving, setGlobalIsSaving]);

    // Check for changes
    useEffect(() => {
        if (!userData) return;
        const data = userData as any;
        const socialLinks = getSocialLinks(userData as HotelData);
        const hasChanges =
            storeName !== (data.store_name || "") ||
            storeTagline !== (data.store_tagline || "") ||
            description !== (data.description || "") ||
            phone !== (data.phone || "") ||
            whatsappNumber !== (data.whatsapp_numbers?.[0]?.number || data.phone || "") ||
            footNote !== (data.footnote || "") ||
            isShopOpen !== data.is_shop_open ||
            instaLink !== (socialLinks.instagram || "") ||
            facebookLink !== (socialLinks.facebook || "") ||
            officialName !== (data.official_name || "") ||
            aboutUs !== (data.about_us || "") ||
            operatingAddress !== (data.operating_address || "") ||
            officialEmailId !== (data.official_email_id || "") ||
            officialPhoneNumber !== (data.official_phone_number || "");
        setHasChanges(hasChanges);
    }, [
        storeName,
        storeTagline,
        description,
        phone,
        whatsappNumber,
        footNote,
        isShopOpen,
        instaLink,
        facebookLink,
        officialName,
        aboutUs,
        operatingAddress,
        officialEmailId,
        officialPhoneNumber,
        userData,
        setHasChanges,
    ]);

    const handleShopToggle = async (checked: boolean) => {
        if (!userData) return;
        setIsShopOpen(checked);
        setIsSaving(true);
        try {
            await updatePartner(userData.id, { is_shop_open: checked });
            revalidateTag(userData.id);
            setState({ is_shop_open: checked });
            toast.success(`Store is now ${checked ? "Open" : "Closed"}`);
        } catch (error) {
            console.error("Error updating shop status:", error);
            setIsShopOpen(!checked);
            toast.error("Failed to update store status");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Store Status</CardTitle>
                        <CardDescription>Manage your store&apos;s online availability.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label>Online Status</Label>
                            <p className="text-sm text-muted-foreground">
                                {isShopOpen ? "Your store is currently open." : "Your store is currently closed."}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Power className={`h-4 w-4 ${isShopOpen ? "text-green-500" : "text-red-500"}`} />
                            <Switch checked={isShopOpen} onCheckedChange={handleShopToggle} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Store Details</CardTitle>
                        <CardDescription>Update your store&apos;s basic information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Store Name</Label>
                                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Store Name" />
                            </div>
                            <div className="space-y-2">
                                <Label>Store Tagline</Label>
                                <Input
                                    value={storeTagline}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 60) setStoreTagline(e.target.value);
                                    }}
                                    placeholder={`Order Your Favorite Dishes from ${storeName}`}
                                    maxLength={60}
                                />
                                <p className="text-xs text-muted-foreground">{storeTagline.length}/60 characters</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Phone Number</Label>
                                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
                            </div>
                            <div className="space-y-2">
                                <Label>WhatsApp Number</Label>
                                <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+91..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Timezone</Label>
                                <Input
                                    list="timezone-options"
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    placeholder="Asia/Kolkata"
                                />
                                <datalist id="timezone-options">
                                    <option value="Asia/Kolkata" />
                                    <option value="Asia/Dubai" />
                                    <option value="Asia/Singapore" />
                                    <option value="Asia/Bangkok" />
                                    <option value="Asia/Tokyo" />
                                    <option value="Europe/London" />
                                    <option value="Europe/Paris" />
                                    <option value="America/New_York" />
                                    <option value="America/Los_Angeles" />
                                    <option value="Australia/Sydney" />
                                    <option value="UTC" />
                                </datalist>
                                <p className="text-xs text-muted-foreground">Used for scheduled menu visibility.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <LocationSettings />

                <Card>
                    <CardHeader>
                        <CardTitle>Social Links</CardTitle>
                        <CardDescription>Add your social media profiles so customers can find you.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Instagram</Label>
                                <Input value={instaLink} onChange={(e) => setInstaLink(e.target.value)} placeholder="https://instagram.com/..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Facebook</Label>
                                <Input value={facebookLink} onChange={(e) => setFacebookLink(e.target.value)} placeholder="https://facebook.com/..." />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>Manage your account credentials.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input value={userData?.email || ""} readOnly disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Current Password</Label>
                            <div className="relative">
                                <Input
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={(userData as any)?.password || ""}
                                    readOnly
                                    disabled
                                    className="bg-muted pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        {!isResettingPassword ? (
                            <Button
                                variant="outline"
                                onClick={() => setIsResettingPassword(true)}
                                className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                            >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Reset Password
                            </Button>
                        ) : (
                            <div className="space-y-4 rounded-lg border p-4">
                                <div className="space-y-2">
                                    <Label>New Password</Label>
                                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Confirm Password</Label>
                                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={async () => {
                                            if (!newPassword || !confirmPassword) {
                                                toast.error("Please fill in all fields");
                                                return;
                                            }
                                            if (newPassword !== confirmPassword) {
                                                toast.error("Passwords do not match");
                                                return;
                                            }
                                            if (newPassword.length < 6) {
                                                toast.error("Password must be at least 6 characters");
                                                return;
                                            }
                                            setIsPasswordSaving(true);
                                            try {
                                                await updatePartner(userData?.id as string, { password: newPassword });
                                                toast.success("Password updated successfully");
                                                setNewPassword("");
                                                setConfirmPassword("");
                                                setIsResettingPassword(false);
                                            } catch (error) {
                                                console.error("Error updating password:", error);
                                                toast.error("Failed to update password");
                                            } finally {
                                                setIsPasswordSaving(false);
                                            }
                                        }}
                                        disabled={isPasswordSaving || !newPassword}
                                        className="bg-orange-600 hover:bg-orange-700 text-white"
                                    >
                                        {isPasswordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Password
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setIsResettingPassword(false);
                                            setNewPassword("");
                                            setConfirmPassword("");
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <CustomDomainSettings partnerId={userData?.id as string} currentDomain={(userData as any)?.custom_domain} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Official Settings</CardTitle>
                        <CardDescription>
                            Legal entity details displayed on your storefront&apos;s About, Contact, Terms, Privacy, Refund, and Shipping pages — required for Cashfree KYC.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Merchant Legal Entity Name</Label>
                                <Input value={officialName} onChange={(e) => setOfficialName(e.target.value)} placeholder="e.g. Notime Services Pvt Ltd" />
                                <p className="text-xs text-muted-foreground">
                                    Your registered legal entity. Leave blank to show only your brand name everywhere. When set, your storefront reads &ldquo;{`{brand} (operated by {this name})`}&rdquo; on policy pages and the footer.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Official Email ID</Label>
                                <Input type="email" value={officialEmailId} onChange={(e) => setOfficialEmailId(e.target.value)} placeholder="contact@yourbusiness.com" />
                            </div>
                            <div className="space-y-2">
                                <Label>Official Phone Number</Label>
                                <Input value={officialPhoneNumber} onChange={(e) => setOfficialPhoneNumber(e.target.value)} placeholder="+91..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Operating Address</Label>
                                <Input value={operatingAddress} onChange={(e) => setOperatingAddress(e.target.value)} placeholder="Full operating address" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>About Us</Label>
                            <Textarea value={aboutUs} onChange={(e) => setAboutUs(e.target.value)} placeholder="Tell customers about your business..." rows={5} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-start pt-6 border-t">
                    <Button
                        variant="destructive"
                        onClick={async () => {
                            await useAuthStore.getState().signOut();
                            window.location.href = "/";
                        }}
                        className="flex items-center gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Log Out
                    </Button>
                </div>
            </div>
        </div>
    );
}
