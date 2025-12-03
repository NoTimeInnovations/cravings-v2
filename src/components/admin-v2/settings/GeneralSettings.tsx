"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Upload, Save, Power } from "lucide-react";
import ImageCropper from "@/components/ImageCropper";
import { HotelData } from "@/app/hotels/[...id]/page";
import { getSocialLinks } from "@/lib/getSocialLinks";

export function GeneralSettings() {
    const { userData, setState } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);
    const [description, setDescription] = useState("");
    const [phone, setPhone] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [footNote, setFootNote] = useState("");
    const [instaLink, setInstaLink] = useState("");
    const [isShopOpen, setIsShopOpen] = useState(true);

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
            setIsShopOpen(userData.is_shop_open);
            setBannerImage((userData as any).store_banner || null);

            const socialLinks = getSocialLinks(userData as HotelData);
            setInstaLink(socialLinks.instagram || "");
        }
    }, [userData]);

    const handleSaveGeneral = async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            const updates: any = {
                description,
                phone,
                footnote: footNote,
                is_shop_open: isShopOpen,
                whatsapp_numbers: [{ number: whatsappNumber, area: "default" }],
                social_links: { instagram: instaLink }
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
    };

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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Store Status</CardTitle>
                    <CardDescription>Turn your store on or off for customers.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Accepting Orders</Label>
                        <p className="text-sm text-muted-foreground">
                            {isShopOpen ? "Your store is currently open." : "Your store is currently closed."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Power className={`h-4 w-4 ${isShopOpen ? "text-green-500" : "text-red-500"}`} />
                        <Switch checked={isShopOpen} onCheckedChange={setIsShopOpen} />
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
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell customers about your store..."
                            rows={4}
                        />
                    </div>
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
                    <div className="space-y-2">
                        <Label>Footnote</Label>
                        <Input
                            value={footNote}
                            onChange={(e) => setFootNote(e.target.value)}
                            placeholder="Displayed at the bottom of receipts/menu..."
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveGeneral} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            {isCropperOpen && selectedImageUrl && (
                <ImageCropper
                    isOpen={isCropperOpen}
                    imageUrl={selectedImageUrl}
                    onCropComplete={(url) => handleCropComplete(url)}
                    onClose={() => setIsCropperOpen(false)}
                />
            )}
        </div>
    );
}
