
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
import { deleteFileFromS3, uploadFileToS3 } from "@/app/actions/aws-s3";
import Img from "@/components/Img";
import { Loader2, Upload, Save, Power, LogOut, Eye, EyeOff, KeyRound, MessageCircle, Unplug, CheckCircle2 } from "lucide-react";
import BannerEditor from "@/components/BannerEditor";
import dynamic from "next/dynamic";
import { HotelData } from "@/app/hotels/[...id]/page";
import { getSocialLinks } from "@/lib/getSocialLinks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { isFreePlan } from "@/lib/getPlanLimits";
import { UpgradePrompt } from "@/components/admin-v2/UpgradePrompt";
import { UpgradePlanDialog } from "@/components/admin-v2/UpgradePlanDialog";
import { Lock, Crown } from "lucide-react";
import { LocationSettings } from "./LocationSettings";
import { isVideoUrl } from "@/lib/mediaUtils";

const VideoEditor = dynamic(() => import("@/components/VideoEditor"), { ssr: false });



export function GeneralSettings() {
    const { userData, setState } = useAuthStore();
    const planId = (userData as any)?.subscription_details?.plan?.id;
    const isOnFreePlan = isFreePlan(planId);
    const [isSaving, setIsSaving] = useState(false);
    const [storeName, setStoreName] = useState("");
    const [storeTagline, setStoreTagline] = useState("");
    const [description, setDescription] = useState("");
    const [phone, setPhone] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [footNote, setFootNote] = useState("");
    const [instaLink, setInstaLink] = useState("");
    const [facebookLink, setFacebookLink] = useState("");
    const [zomatoLink, setZomatoLink] = useState("");
    const [uberEatsLink, setUberEatsLink] = useState("");
    const [talabatLink, setTalabatLink] = useState("");
    const [doordashLink, setDoordashLink] = useState("");
    const [isShopOpen, setIsShopOpen] = useState(true);


    // Password State
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);

    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

    // Banner State
    const [bannerImage, setBannerImage] = useState<string | null>(null);
    const [isBannerUploading, setBannerUploading] = useState(false);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
    const [isVideoEditorOpen, setIsVideoEditorOpen] = useState(false);
    const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);

    // Announcement State
    const [announcement, setAnnouncement] = useState("");

    // Banner Mode State
    const [bannerMode, setBannerMode] = useState<"single" | "carousel">("single");
    const [carouselBanners, setCarouselBanners] = useState<string[]>([]);
    const [isCarouselUploading, setIsCarouselUploading] = useState(false);
    const [carouselCropperOpen, setCarouselCropperOpen] = useState(false);
    const [carouselSelectedImageUrl, setCarouselSelectedImageUrl] = useState("");

    // Google Business State
    const [googleConnected, setGoogleConnected] = useState(false);
    const [googleLocations, setGoogleLocations] = useState<any[]>([]);
    const [selectedGoogleLocation, setSelectedGoogleLocation] = useState("");
    const [linkedLocationId, setLinkedLocationId] = useState<string | null>(null);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isSyncingMenu, setIsSyncingMenu] = useState(false);

    // WhatsApp Business Integration State
    // "menuthere" = use our shared WhatsApp, "own" = connect their own WABA
    const [whatsappMode, setWhatsappMode] = useState<"menuthere" | "own" | null>(null);
    const [wabaConnected, setWabaConnected] = useState(false);
    const [wabaPhoneNumber, setWabaPhoneNumber] = useState<string | null>(null);
    const [isWabaLoading, setIsWabaLoading] = useState(false);

    // Handle WhatsApp connection redirect params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("whatsapp_connected") === "true") {
            toast.success("WhatsApp Business Account connected successfully!");
            // Clean up URL
            const url = new URL(window.location.href);
            url.searchParams.delete("whatsapp_connected");
            window.history.replaceState({}, "", url.toString());
        }
        if (params.get("whatsapp_error")) {
            toast.error("WhatsApp connection failed: " + params.get("whatsapp_error"));
            const url = new URL(window.location.href);
            url.searchParams.delete("whatsapp_error");
            window.history.replaceState({}, "", url.toString());
        }
    }, []);

    useEffect(() => {
        if (userData?.role === "partner") {
            setStoreName(userData.store_name || "");
            setStoreTagline((userData as any).store_tagline || "");
            setDescription(userData.description || "");
            setPhone(userData.phone || "");
            setWhatsappNumber(userData.whatsapp_numbers?.[0]?.number || userData.phone || "");
            setFootNote(userData.footnote || "");
            setIsShopOpen(userData.is_shop_open);
            setBannerImage((userData as any).store_banner || null);

            // Announcement & Banner Mode
            const rules = (userData as any).delivery_rules;
            setAnnouncement(rules?.announcement || "");
            setBannerMode(rules?.banner_mode || "single");
            setCarouselBanners(rules?.carousel_banners || []);

            // Check Google Connection
            checkGoogleConnection(userData.id);

            // Check WhatsApp Business Connection
            checkWhatsAppConnection(userData.id);

            const socialLinks = getSocialLinks(userData as HotelData);
            setInstaLink(socialLinks.instagram || "");
            setFacebookLink(socialLinks.facebook || "");
            setZomatoLink(socialLinks.zomato || "");
            setUberEatsLink(socialLinks.uberEats || "");
            setTalabatLink(socialLinks.talabat || "");
            setDoordashLink(socialLinks.doordash || "");
        }
    }, [userData]);

    const checkGoogleConnection = async (partnerId: string) => {
        setIsGoogleLoading(true);
        try {
            // First try partner's own tokens
            const partnerRes = await fetch(`/api/google-business/locations?partnerId=${partnerId}&mode=partner`);
            const partnerData = await partnerRes.json();

            if (partnerRes.ok && partnerData.success) {
                setGoogleConnected(true);
                setGoogleLocations(partnerData.locations || []);
                if (partnerData.linkedLocationId) {
                    setLinkedLocationId(partnerData.linkedLocationId);
                }
                return;
            }

            // Fallback: Check via Master Account (superadmin-linked partners)
            const masterRes = await fetch(`/api/google-business/locations?partnerId=${partnerId}`);
            const masterData = await masterRes.json();

            if (masterRes.ok && masterData.success && masterData.linkedLocationId) {
                // Partner is linked via Master Account
                setGoogleConnected(true);
                setGoogleLocations(masterData.locations || []);
                setLinkedLocationId(masterData.linkedLocationId);
            } else {
                setGoogleConnected(false);
            }
        } catch (e) {
            setGoogleConnected(false);
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        if (!userData) return;
        // Redirect to auth with return url back to settings
        const redirect = encodeURIComponent(`${window.location.pathname}?view=Settings`);
        window.location.href = `/api/google-business/auth/login?partnerId=${userData.id}&redirect=${redirect}`;
    };

    const handleSendInvite = async () => {
        if (!selectedGoogleLocation || !userData) return;
        setIsGoogleLoading(true);
        try {
            const res = await fetch('/api/google-business/invite-manager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partnerId: userData.id, locationId: selectedGoogleLocation })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Request sent successfully! Our team will accept it shortly.");
            } else {
                toast.error("Failed to send request: " + data.error);
            }
        } catch (e) {
            toast.error("Request failed");
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleSyncMenu = async () => {
        if (!userData || !linkedLocationId) return;

        // Rate limit check
        const lastSync = localStorage.getItem(`google_sync_${userData.id}`);
        const today = new Date().toDateString();
        if (lastSync === today) {
            toast.info("You can only sync to Google once per day.");
            return;
        }

        if (!confirm("Sync menu to Google? This will overwrite your Google Menu.")) return;

        setIsSyncingMenu(true);
        const toastId = toast.loading("Syncing menu...");

        try {
            const res = await fetch('/api/google-business/menu/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partnerId: userData.id, locationId: 'auto' })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem(`google_sync_${userData.id}`, today);
                toast.success("Menu synced successfully!");
            } else {
                toast.error("Sync failed: " + data.error);
            }
        } catch (e) {
            toast.error("Sync failed");
        } finally {
            setIsSyncingMenu(false);
            toast.dismiss(toastId);
        }
    };

    // ─── WhatsApp Business Integration ─────────────────────────────
    const checkWhatsAppConnection = async (partnerId: string) => {
        setIsWabaLoading(true);
        try {
            const res = await fetch(`/api/whatsapp/meta/status?partnerId=${partnerId}`);
            const data = await res.json();
            if (res.ok && data.connected) {
                setWabaConnected(true);
                setWabaPhoneNumber(data.display_phone || null);
                setWhatsappMode("own");
            } else {
                setWabaConnected(false);
                // Default to menuthere if no preference saved
                setWhatsappMode((userData as any)?.whatsapp_integration_mode || "menuthere");
            }
        } catch {
            setWabaConnected(false);
            setWhatsappMode("menuthere");
        } finally {
            setIsWabaLoading(false);
        }
    };

    const handleConnectWhatsApp = () => {
        if (!userData) return;
        const state = JSON.stringify({
            partnerId: userData.id,
            redirect: `${window.location.pathname}?view=Settings`,
        });
        // Load Facebook SDK and trigger Embedded Signup
        const launchSignup = () => {
            (window as any).FB.login(
                (response: any) => {
                    if (response.authResponse) {
                        const { code } = response.authResponse;
                        // Send code to our callback
                        const host = window.location.origin;
                        window.location.href =
                            `${host}/api/whatsapp/meta/auth/callback?code=${code}&state=${encodeURIComponent(state)}`;
                    } else {
                        toast.error("WhatsApp connection was cancelled");
                    }
                },
                {
                    config_id: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID,
                    response_type: "code",
                    override_default_response_type: true,
                    extras: {
                        setup: {},
                        featureType: "",
                        sessionInfoVersion: "3",
                    },
                }
            );
        };

        // Load FB SDK if not already loaded
        if ((window as any).FB) {
            launchSignup();
        } else {
            const script = document.createElement("script");
            script.src = "https://connect.facebook.net/en_US/sdk.js";
            script.async = true;
            script.defer = true;
            script.crossOrigin = "anonymous";
            script.onload = () => {
                (window as any).FB.init({
                    appId: process.env.NEXT_PUBLIC_META_APP_ID,
                    cookie: true,
                    xfbml: false,
                    version: "v21.0",
                });
                launchSignup();
            };
            document.body.appendChild(script);
        }
    };

    const handleDisconnectWhatsApp = async () => {
        if (!userData) return;
        if (!confirm("Disconnect your WhatsApp Business Account? You can reconnect anytime.")) return;

        setIsWabaLoading(true);
        try {
            const res = await fetch("/api/whatsapp/meta/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ partnerId: userData.id }),
            });
            if (res.ok) {
                setWabaConnected(false);
                setWabaPhoneNumber(null);
                setWhatsappMode("menuthere");
                toast.success("WhatsApp disconnected");
            } else {
                toast.error("Failed to disconnect");
            }
        } catch {
            toast.error("Failed to disconnect");
        } finally {
            setIsWabaLoading(false);
        }
    };

    const handleWhatsAppModeChange = async (mode: "menuthere" | "own") => {
        setWhatsappMode(mode);
        if (!userData) return;
        try {
            await updatePartner(userData.id, { whatsapp_integration_mode: mode });
            setState({ whatsapp_integration_mode: mode } as any);
        } catch {
            // silent — non-critical
        }
    };

    const handleSaveGeneral = useCallback(async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            const updates: any = {
                store_name: storeName,
                store_tagline: storeTagline || null,
                description,
                phone,
                footnote: footNote,
                is_shop_open: isShopOpen,
                whatsapp_numbers: [{ number: whatsappNumber, area: "default" }],
                social_links: {
                    instagram: instaLink,
                    facebook: facebookLink,
                    zomato: zomatoLink,
                    uberEats: uberEatsLink,
                    talabat: talabatLink,
                    doordash: doordashLink,
                },

            };

            await updatePartner(userData.id, updates);

            revalidateTag(userData.id);
            setState(updates);
            toast.success("General settings updated successfully");
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    }, [userData, storeName, description, phone, footNote, isShopOpen, whatsappNumber, instaLink, facebookLink, zomatoLink, uberEatsLink, talabatLink, doordashLink, setState]);

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
        const initialStoreName = data.store_name || "";
        const initialDescription = data.description || "";
        const initialPhone = data.phone || "";
        const initialWhatsapp = data.whatsapp_numbers?.[0]?.number || data.phone || "";
        const initialFootnote = data.footnote || "";
        const initialIsShopOpen = data.is_shop_open;
        const socialLinks = getSocialLinks(userData as HotelData);
        const initialInsta = socialLinks.instagram || "";
        const initialFacebook = socialLinks.facebook || "";
        const initialZomato = socialLinks.zomato || "";
        const initialUberEats = socialLinks.uberEats || "";
        const initialTalabat = socialLinks.talabat || "";
        const initialDoordash = socialLinks.doordash || "";

        const hasChanges =
            storeName !== initialStoreName ||
            description !== initialDescription ||
            phone !== initialPhone ||
            whatsappNumber !== initialWhatsapp ||
            footNote !== initialFootnote ||
            isShopOpen !== initialIsShopOpen ||
            instaLink !== initialInsta ||
            facebookLink !== initialFacebook ||
            zomatoLink !== initialZomato ||
            uberEatsLink !== initialUberEats ||
            talabatLink !== initialTalabat ||
            doordashLink !== initialDoordash;

        setHasChanges(hasChanges);

    }, [
        storeName,
        description,
        phone,
        whatsappNumber,
        footNote,
        isShopOpen,
        instaLink,
        facebookLink,
        zomatoLink,
        uberEatsLink,
        talabatLink,
        doordashLink,
        userData,
        setHasChanges
    ]);

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !files[0]) return;
        const file = files[0];

        // Video upload: open VideoEditor for trimming/optimization
        if (file.type.startsWith("video/")) {
            setSelectedVideoFile(file);
            setIsVideoEditorOpen(true);
            e.target.value = "";
            return;
        }

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

            await updatePartner(userData.id, { store_banner: imgUrl });

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

    const handleVideoComplete = async (processedVideoBlob: Blob, thumbnailBlob: Blob) => {
        if (!userData) return;
        setIsVideoEditorOpen(false);
        setSelectedVideoFile(null);
        setBannerUploading(true);

        try {
            // Delete old banner files if they exist
            if ((userData as any).store_banner?.includes("cravingsbucket")) {
                await deleteFileFromS3((userData as any).store_banner);
                // Also try to delete old thumbnail
                try {
                    const oldBanner = (userData as any).store_banner;
                    const lastDot = oldBanner.lastIndexOf(".");
                    if (lastDot !== -1) {
                        await deleteFileFromS3(oldBanner.substring(0, lastDot) + "_thumb.jpg");
                    }
                } catch { /* old thumbnail may not exist */ }
            }

            const timestamp = Date.now();
            const videoKey = `hotel_banners/${userData.id}_v${timestamp}.mp4`;
            const thumbKey = `hotel_banners/${userData.id}_v${timestamp}_thumb.jpg`;

            // Upload video and thumbnail in parallel
            const [videoUrl, _thumbUrl] = await Promise.all([
                uploadFileToS3(processedVideoBlob, videoKey),
                uploadFileToS3(thumbnailBlob, thumbKey),
            ]);

            if (!videoUrl) throw new Error("Video upload failed");

            await updatePartner(userData.id, { store_banner: videoUrl });
            revalidateTag(userData.id);

            setState({ store_banner: videoUrl });
            setBannerImage(videoUrl);
            toast.success("Video banner updated successfully");
        } catch (error) {
            console.error("Video upload error:", error);
            toast.error("Failed to upload video banner");
        } finally {
            setBannerUploading(false);
        }
    };

    const saveAnnouncementAndBannerMode = async () => {
        if (!userData) return;
        try {
            const currentRules = (userData as any).delivery_rules || {};
            const updatedRules = {
                ...currentRules,
                announcement,
                banner_mode: bannerMode,
                carousel_banners: carouselBanners,
            };
            await updatePartner(userData.id, { delivery_rules: updatedRules });
            revalidateTag(userData.id);
            setState({ delivery_rules: updatedRules } as any);
            toast.success("Settings updated successfully");
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Failed to update settings");
        }
    };

    const handleCarouselBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !files[0] || !userData) return;
        if (carouselBanners.length >= 5) {
            toast.error("Maximum 5 banners allowed");
            return;
        }
        const file = files[0];
        const blobUrl = URL.createObjectURL(file);
        setCarouselSelectedImageUrl(blobUrl);
        setCarouselCropperOpen(true);
        e.target.value = "";
    };

    const handleCarouselCropComplete = async (croppedImageUrl: string) => {
        setCarouselCropperOpen(false);
        setCarouselSelectedImageUrl("");
        if (!userData) return;
        setIsCarouselUploading(true);
        try {
            const response = await fetch(croppedImageUrl);
            const blob = await response.blob();
            const extension = blob.type.split("/")[1] || "png";
            const imgUrl = await uploadFileToS3(
                blob,
                `carousel_banners/${userData.id}_${Date.now()}.${extension}`
            );
            if (!imgUrl) throw new Error("Upload failed");

            const updated = [...carouselBanners, imgUrl];
            setCarouselBanners(updated);

            // Save to DB immediately
            const currentRules = (userData as any).delivery_rules || {};
            const updatedRules = { ...currentRules, carousel_banners: updated, banner_mode: bannerMode };
            await updatePartner(userData.id, { delivery_rules: updatedRules });
            revalidateTag(userData.id);
            setState({ delivery_rules: updatedRules } as any);
            toast.success("Banner added");
        } catch (error) {
            toast.error("Failed to upload banner");
        } finally {
            setIsCarouselUploading(false);
        }
    };

    const removeCarouselBanner = async (index: number) => {
        if (!userData) return;
        const bannerToRemove = carouselBanners[index];
        const updated = carouselBanners.filter((_, i) => i !== index);
        setCarouselBanners(updated);

        try {
            if (bannerToRemove.includes("cravingsbucket")) {
                await deleteFileFromS3(bannerToRemove);
            }
            const currentRules = (userData as any).delivery_rules || {};
            const updatedRules = { ...currentRules, carousel_banners: updated };
            await updatePartner(userData.id, { delivery_rules: updatedRules });
            revalidateTag(userData.id);
            setState({ delivery_rules: updatedRules } as any);
            toast.success("Banner removed");
        } catch {
            toast.error("Failed to remove banner");
        }
    };

    const handleShopToggle = async (checked: boolean) => {
        if (!userData) return;

        setIsShopOpen(checked);
        setIsSaving(true);

        try {
            await updatePartner(userData.id, { is_shop_open: checked });

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

                <div className="relative">
                    {isOnFreePlan && (
                        <div
                            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[2px] cursor-pointer"
                            onClick={() => setShowUpgradeDialog(true)}
                        >
                            <div className="flex items-center gap-2 rounded-full bg-orange-500/10 border border-orange-500/30 px-4 py-2">
                                <Crown className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-semibold text-orange-500">Premium Feature — Click to Upgrade</span>
                            </div>
                        </div>
                    )}
                    <Card className={isOnFreePlan ? "opacity-60 pointer-events-none" : ""}>
                        <CardHeader>
                            <CardTitle>Store Banner</CardTitle>
                            <CardDescription>Choose single banner or carousel (up to 5 banners).</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Banner Mode Toggle */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant={bannerMode === "single" ? "default" : "outline"}
                                    size="sm"
                                    onClick={async () => {
                                        setBannerMode("single");
                                        if (!userData) return;
                                        const currentRules = (userData as any).delivery_rules || {};
                                        const updatedRules = { ...currentRules, banner_mode: "single" };
                                        await updatePartner(userData.id, { delivery_rules: updatedRules });
                                        revalidateTag(userData.id);
                                        setState({ delivery_rules: updatedRules } as any);
                                    }}
                                >
                                    Single Banner
                                </Button>
                                <Button
                                    variant={bannerMode === "carousel" ? "default" : "outline"}
                                    size="sm"
                                    onClick={async () => {
                                        setBannerMode("carousel");
                                        if (!userData) return;
                                        const currentRules = (userData as any).delivery_rules || {};
                                        const updatedRules = { ...currentRules, banner_mode: "carousel" };
                                        await updatePartner(userData.id, { delivery_rules: updatedRules });
                                        revalidateTag(userData.id);
                                        setState({ delivery_rules: updatedRules } as any);
                                    }}
                                >
                                    Carousel (Max 5)
                                </Button>
                            </div>

                            {/* Single Banner Upload */}
                            {bannerMode === "single" && (
                                <>
                                    <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                                        {bannerImage ? (
                                            isVideoUrl(bannerImage) ? (
                                                <video src={bannerImage} autoPlay muted loop playsInline className="h-full w-full object-cover" />
                                            ) : (
                                                <Img src={bannerImage} alt="Store Banner" className="h-full w-full object-cover" />
                                            )
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
                                    <Button variant="outline" className="relative" disabled={isBannerUploading}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Banner
                                        <Input
                                            type="file"
                                            className="absolute inset-0 cursor-pointer opacity-0"
                                            accept="image/*,video/mp4,video/webm"
                                            onChange={handleBannerChange}
                                            disabled={isBannerUploading}
                                        />
                                    </Button>
                                </>
                            )}

                            {/* Carousel Banners Upload */}
                            {bannerMode === "carousel" && (
                                <div className="space-y-3">
                                    <Label>Carousel Banners ({carouselBanners.length}/5)</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {carouselBanners.map((url, idx) => (
                                            <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border bg-muted group">
                                                <Img src={url} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => removeCarouselBanner(idx)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    ✕
                                                </button>
                                                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                                                    {idx + 1}
                                                </div>
                                            </div>
                                        ))}
                                        {carouselBanners.length < 5 && (
                                            <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors relative">
                                                {isCarouselUploading ? (
                                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                ) : (
                                                    <div className="text-center text-muted-foreground">
                                                        <Upload className="h-6 w-6 mx-auto mb-1" />
                                                        <span className="text-xs">Add Banner</span>
                                                    </div>
                                                )}
                                                <Input
                                                    type="file"
                                                    className="absolute inset-0 cursor-pointer opacity-0"
                                                    accept="image/*"
                                                    onChange={handleCarouselBannerUpload}
                                                    disabled={isCarouselUploading}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <UpgradePlanDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} featureName="Store Banner" />

                {/* Carousel Banner Cropper */}
                {carouselCropperOpen && carouselSelectedImageUrl && (
                    <BannerEditor
                        imageUrl={carouselSelectedImageUrl}
                        isOpen={carouselCropperOpen}
                        onClose={() => {
                            setCarouselCropperOpen(false);
                            setCarouselSelectedImageUrl("");
                        }}
                        onComplete={handleCarouselCropComplete}
                    />
                )}

                {/* Announcement Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Announcement Bar</CardTitle>
                        <CardDescription>Display a message at the top of your store page. Leave empty to hide.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Announcement Text</Label>
                            <Input
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                                placeholder="e.g. Free delivery on orders above ₹500!"
                                maxLength={100}
                            />
                            <p className="text-xs text-muted-foreground">{announcement.length}/100 characters</p>
                        </div>
                        <Button onClick={saveAnnouncementAndBannerMode} size="sm">
                            <Save className="mr-2 h-4 w-4" />
                            Save Announcement
                        </Button>
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
                                <Label>Store Name</Label>
                                <Input
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    placeholder="Store Name"
                                />
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
                                <Input
                                    value={instaLink}
                                    onChange={(e) => setInstaLink(e.target.value)}
                                    placeholder="https://instagram.com/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Facebook</Label>
                                <Input
                                    value={facebookLink}
                                    onChange={(e) => setFacebookLink(e.target.value)}
                                    placeholder="https://facebook.com/..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Delivery Platforms</CardTitle>
                        <CardDescription>Add links to your delivery partner pages so customers can order from their preferred platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Zomato</Label>
                                <Input
                                    value={zomatoLink}
                                    onChange={(e) => setZomatoLink(e.target.value)}
                                    placeholder="https://zomato.com/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Uber Eats</Label>
                                <Input
                                    value={uberEatsLink}
                                    onChange={(e) => setUberEatsLink(e.target.value)}
                                    placeholder="https://ubereats.com/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Talabat</Label>
                                <Input
                                    value={talabatLink}
                                    onChange={(e) => setTalabatLink(e.target.value)}
                                    placeholder="https://talabat.com/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>DoorDash</Label>
                                <Input
                                    value={doordashLink}
                                    onChange={(e) => setDoordashLink(e.target.value)}
                                    placeholder="https://doordash.com/..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CardTitle>Google Business Profile</CardTitle>
                            {isOnFreePlan && <Lock className="h-4 w-4 text-orange-600" />}
                        </div>
                        <CardDescription>Connect your Google Business Profile to sync your menu and orders.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isOnFreePlan ? (
                            <UpgradePrompt
                                variant="card"
                                feature="Google Business Sync"
                                description="Upgrade to sync your menu with Google Business Profile."
                            />
                        ) : !googleConnected ? (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground">Link your Google account to allow Menuthere to manage your menu automatically.</p>
                                <Button disabled={isGoogleLoading} onClick={handleGoogleLogin} className="w-full sm:w-auto">
                                    {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Link Business Profile
                                </Button>
                            </div>
                        ) : linkedLocationId ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                                    <div className="bg-green-100 p-2 rounded-full">
                                        <Img src="https://www.gstatic.com/images/branding/product/1x/google_my_business_48dp.png" alt="GMB" className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-green-800">Connected & Linked</p>
                                        <p className="text-sm text-green-700">Your restaurant is linked. Menu sync is active.</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSyncMenu}
                                    disabled={isSyncingMenu}
                                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isSyncingMenu ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Sync Menu Now
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Select Your Restaurant Location</Label>
                                    <Select value={selectedGoogleLocation} onValueChange={setSelectedGoogleLocation}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select location..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {googleLocations.map((loc: any) => (
                                                <SelectItem key={loc.name} value={loc.name}>
                                                    {loc.title} ({loc.storeCode || 'No Code'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={handleSendInvite}
                                    disabled={!selectedGoogleLocation || isGoogleLoading}
                                    className="w-full sm:w-auto"
                                >
                                    {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Request Management Access
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    This will send an invitation to your Google Business Profile. Once you (Admin) accept it, we will link your menu.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* WhatsApp Business Integration — hidden until fully ready */}
                {false && <Card className="relative">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CardTitle>WhatsApp Business</CardTitle>
                            {isOnFreePlan && <Lock className="h-4 w-4 text-orange-600" />}
                        </div>
                        <CardDescription>
                            Choose how to send WhatsApp messages to your customers — use Menuthere's shared WhatsApp or connect your own business number.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isOnFreePlan ? (
                            <UpgradePrompt
                                variant="card"
                                feature="WhatsApp Business Integration"
                                description="Upgrade to connect your own WhatsApp Business account."
                            />
                        ) : isWabaLoading ? (
                            <div className="flex items-center gap-2 py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Checking connection...</span>
                            </div>
                        ) : (
                            <>
                                {/* Option Selection */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {/* Option 1: Use Menuthere's WhatsApp */}
                                    <button
                                        type="button"
                                        onClick={() => handleWhatsAppModeChange("menuthere")}
                                        className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                                            whatsappMode === "menuthere"
                                                ? "border-green-500 bg-green-50"
                                                : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                    >
                                        {whatsappMode === "menuthere" && (
                                            <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-600" />
                                        )}
                                        <div className="flex items-center gap-2">
                                            <MessageCircle className="h-5 w-5 text-green-600" />
                                            <span className="font-semibold text-sm">Use Menuthere&apos;s WhatsApp</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Messages are sent from Menuthere&apos;s shared number. No setup needed — works instantly.
                                        </p>
                                    </button>

                                    {/* Option 2: Connect Own WhatsApp */}
                                    <button
                                        type="button"
                                        onClick={() => handleWhatsAppModeChange("own")}
                                        className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                                            whatsappMode === "own"
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                    >
                                        {whatsappMode === "own" && (
                                            <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-blue-600" />
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Unplug className="h-5 w-5 text-blue-600" />
                                            <span className="font-semibold text-sm">Connect Your Own WhatsApp</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Messages are sent from your own WhatsApp Business number. Customers see your brand.
                                        </p>
                                    </button>
                                </div>

                                {/* Show connect/status based on selected mode */}
                                {whatsappMode === "own" && (
                                    <div className="mt-2">
                                        {wabaConnected ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                                                    <div className="rounded-full bg-green-100 p-2">
                                                        <MessageCircle className="h-5 w-5 text-green-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-green-800">WhatsApp Connected</p>
                                                        <p className="text-sm text-green-700">
                                                            {wabaPhoneNumber
                                                                ? `Sending from ${wabaPhoneNumber}`
                                                                : "Your WhatsApp Business Account is active"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDisconnectWhatsApp}
                                                    disabled={isWabaLoading}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    {isWabaLoading ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Unplug className="mr-2 h-4 w-4" />
                                                    )}
                                                    Disconnect
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-sm text-muted-foreground">
                                                    Connect your WhatsApp Business Account via Meta. You&apos;ll be guided through the setup process.
                                                </p>
                                                <Button
                                                    onClick={handleConnectWhatsApp}
                                                    disabled={isWabaLoading}
                                                    className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
                                                >
                                                    {isWabaLoading ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <MessageCircle className="mr-2 h-4 w-4" />
                                                    )}
                                                    Connect WhatsApp Business
                                                </Button>
                                                <p className="text-xs text-muted-foreground">
                                                    You&apos;ll need a Meta Business Account and a WhatsApp Business phone number.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {whatsappMode === "menuthere" && (
                                    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                        <p className="text-sm text-green-800">
                                            Active — Order notifications will be sent via Menuthere&apos;s WhatsApp.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>}

            </div >

            {isCropperOpen && selectedImageUrl && (
                <BannerEditor
                    isOpen={isCropperOpen}
                    imageUrl={selectedImageUrl}
                    onComplete={(url) => handleCropComplete(url)}
                    onClose={() => setIsCropperOpen(false)}
                />
            )}

            {isVideoEditorOpen && selectedVideoFile && (
                <VideoEditor
                    isOpen={isVideoEditorOpen}
                    videoFile={selectedVideoFile}
                    onComplete={handleVideoComplete}
                    onClose={() => {
                        setIsVideoEditorOpen(false);
                        setSelectedVideoFile(null);
                    }}
                />
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Manage your account credentials.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                            value={userData?.email || ""}
                            readOnly
                            disabled
                            className="bg-muted"
                        />
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
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Min. 6 characters"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Confirm Password</Label>
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                />
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
                    <CustomDomainSettings
                        partnerId={userData?.id as string}
                        currentDomain={(userData as any)?.custom_domain}
                    />
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
        </div >
    );
}
