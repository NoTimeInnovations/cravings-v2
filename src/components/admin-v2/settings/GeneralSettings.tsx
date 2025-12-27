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
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updatePartnerMutation } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { deleteFileFromS3, uploadFileToS3 } from "@/app/actions/aws-s3";
import Img from "@/components/Img";
import { Loader2, Upload, Save, Power, LogOut } from "lucide-react";
import ImageCropper from "@/components/ImageCropper";
import { HotelData } from "@/app/hotels/[...id]/page";
import { getSocialLinks } from "@/lib/getSocialLinks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";



export function GeneralSettings() {
    const { userData, setState } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);
    const [description, setDescription] = useState("");
    const [phone, setPhone] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [footNote, setFootNote] = useState("");
    const [instaLink, setInstaLink] = useState("");
    const [isShopOpen, setIsShopOpen] = useState(true);


    // Password State
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);

    // Banner State
    const [bannerImage, setBannerImage] = useState<string | null>(null);
    const [isBannerUploading, setBannerUploading] = useState(false);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");

    useEffect(() => {
        if (userData?.role === "partner") {
            setDescription(userData.description || "");
            setPhone(userData.phone || "");
            setWhatsappNumber(userData.whatsapp_numbers?.[0]?.number || userData.phone || "");
            setFootNote(userData.footnote || "");
            setFootNote(userData.footnote || "");
            setIsShopOpen(userData.is_shop_open);
            setBannerImage((userData as any).store_banner || null);


            const socialLinks = getSocialLinks(userData as HotelData);
            setInstaLink(socialLinks.instagram || "");
        }
    }, [userData]);

    const handleSaveGeneral = useCallback(async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            const updates: any = {
                description,
                phone,
                footnote: footNote,
                is_shop_open: isShopOpen,
                whatsapp_numbers: [{ number: whatsappNumber, area: "default" }],
                social_links: { instagram: instaLink },

            };

            await fetchFromHasura(updatePartnerMutation, {
                id: userData.id,
                updates
            });

            revalidateTag(userData.id);
            setState(updates);
            toast.success("General settings updated successfully");
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    }, [userData, description, phone, footNote, isShopOpen, whatsappNumber, instaLink, setState]);

    const { setSaveAction, setIsSaving: setGlobalIsSaving, setHasChanges } = useAdminSettingsStore();

    useEffect(() => {
        setSaveAction(handleSaveGeneral);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [handleSaveGeneral, setSaveAction, setHasChanges]);

    // Update global isSaving 
    useEffect(() => {
        setGlobalIsSaving(isSaving);
    }, [isSaving, setGlobalIsSaving]);

    // Check for changes
    useEffect(() => {
        if (!userData) return;

        const data = userData as any;
        const initialDescription = data.description || "";
        const initialPhone = data.phone || "";
        const initialWhatsapp = data.whatsapp_numbers?.[0]?.number || data.phone || "";
        const initialFootnote = data.footnote || "";
        const initialIsShopOpen = data.is_shop_open;
        const initialInsta = getSocialLinks(userData as HotelData).instagram || "";

        const hasChanges =
            description !== initialDescription ||
            phone !== initialPhone ||
            whatsappNumber !== initialWhatsapp ||
            footNote !== initialFootnote ||
            isShopOpen !== initialIsShopOpen ||
            instaLink !== initialInsta;

        setHasChanges(hasChanges);

    }, [
        description,
        phone,
        whatsappNumber,
        footNote,
        isShopOpen,
        instaLink,
        userData,
        setHasChanges
    ]);

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !files[0]) return;
        const file = files[0];
        const blobUrl = URL.createObjectURL(file);
        setSelectedImageFile(file);
        setSelectedImageUrl(blobUrl);
        setIsCropperOpen(true);
    };

    const handleCropComplete = async (croppedImageUrl: string) => {
        setBannerImage(croppedImageUrl);
        setIsCropperOpen(false);
        setSelectedImageFile(null);
        setSelectedImageUrl("");

        // Upload immediately
        await handleBannerUpload(croppedImageUrl);
    };

    const handleBannerUpload = async (imageDataUrl: string) => {
        if (!userData) return;
        setBannerUploading(true);
        try {
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();

            // Delete old banner if exists
            if ((userData as any).store_banner?.includes("cravingsbucket")) {
                await deleteFileFromS3((userData as any).store_banner);
            }

            const extension = blob.type.split("/")[1] || "png";
            const imgUrl = await uploadFileToS3(
                blob,
                `hotel_banners/${userData.id}_v${Date.now()}.${extension}`
            );

            if (!imgUrl) throw new Error("Upload failed");

            await fetchFromHasura(updatePartnerMutation, {
                id: userData.id,
                updates: { store_banner: imgUrl }
            });

            revalidateTag(userData.id);

            setState({ store_banner: imgUrl });
            setBannerImage(imgUrl);
            toast.success("Banner updated successfully");
        } catch (error) {
            console.error("Banner upload error:", error);
            toast.error("Failed to upload banner");
        } finally {
            setBannerUploading(false);
        }
    };

    const handleShopToggle = async (checked: boolean) => {
        if (!userData) return;

        setIsShopOpen(checked);
        setIsSaving(true);

        try {
            await fetchFromHasura(updatePartnerMutation, {
                id: userData.id,
                updates: { is_shop_open: checked }
            });

            revalidateTag(userData.id);
            // Update global state
            setState({ is_shop_open: checked });

            toast.success(`Store is now ${checked ? 'Open' : 'Closed'}`);
        } catch (error) {
            console.error("Error updating shop status:", error);
            // Revert state
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
                        <CardDescription>Manage your store's online availability.</CardDescription>
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
                        <CardTitle>Store Banner</CardTitle>
                        <CardDescription>This image will be displayed at the top of your store page.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                            {bannerImage ? (
                                <Img src={bannerImage} alt="Store Banner" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    No banner image
                                </div>
                            )}
                            {isBannerUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <Button variant="outline" className="relative" disabled={isBannerUploading}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload New Banner
                                <Input
                                    type="file"
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    accept="image/*"
                                    onChange={handleBannerChange}
                                    disabled={isBannerUploading}
                                />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Store Details</CardTitle>
                        <CardDescription>Update your store's basic information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Phone Number</Label>
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+91..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>WhatsApp Number</Label>
                                <Input
                                    value={whatsappNumber}
                                    onChange={(e) => setWhatsappNumber(e.target.value)}
                                    placeholder="+91..."
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Instagram Link</Label>
                            <Input
                                value={instaLink}
                                onChange={(e) => setInstaLink(e.target.value)}
                                placeholder="https://instagram.com/..."
                            />
                        </div>

                    </CardContent>
                </Card>

            </div >

            {isCropperOpen && selectedImageUrl && (
                <ImageCropper
                    isOpen={isCropperOpen}
                    imageUrl={selectedImageUrl}
                    onCropComplete={(url) => handleCropComplete(url)}
                    onClose={() => setIsCropperOpen(false)}
                />
            )
            }

            <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Update your password to keep your account secure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Confirm Password</Label>
                        <Input
                            type="password"
                            pattern=".{6,}"
                            title="Password must be at least 6 characters long"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>  
                </CardContent>
                <div className="flex justify-end p-6 pt-0">
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
                                await fetchFromHasura(updatePartnerMutation, {
                                    id: userData?.id,
                                    updates: { password: newPassword }
                                });
                                toast.success("Password updated successfully");
                                setNewPassword("");
                                setConfirmPassword("");
                            } catch (error) {
                                console.error("Error updating password:", error);
                                toast.error("Failed to update password");
                            } finally {
                                setIsPasswordSaving(false);
                            }
                        }}
                        disabled={isPasswordSaving || !newPassword}
                        variant="outline"
                        className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                    >
                        {isPasswordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Update <Save className="ml-2 h-4 w-4" /></>}
                    </Button>
                </div>
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
        </div >
    );
}
