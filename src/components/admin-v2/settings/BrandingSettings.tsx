"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { deleteFileFromS3, uploadFileToS3 } from "@/app/actions/aws-s3";
import Img from "@/components/Img";
import { Loader2, Upload, Crown } from "lucide-react";
import BannerEditor from "@/components/BannerEditor";
import dynamic from "next/dynamic";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { isFreePlan } from "@/lib/getPlanLimits";
import { UpgradePlanDialog } from "@/components/admin-v2/UpgradePlanDialog";
import { isVideoUrl } from "@/lib/mediaUtils";

const VideoEditor = dynamic(() => import("@/components/VideoEditor"), { ssr: false });

const BANNER_LOGO_SCALE_MIN = 50;
const BANNER_LOGO_SCALE_MAX = 500;
const BANNER_LOGO_SCALE_DEFAULT = 100;

function clampBannerLogoScale(n: unknown): number {
    const v = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(v)) return BANNER_LOGO_SCALE_DEFAULT;
    return Math.min(BANNER_LOGO_SCALE_MAX, Math.max(BANNER_LOGO_SCALE_MIN, Math.round(v)));
}

export function BrandingSettings() {
    const { userData, setState } = useAuthStore();
    const planId = (userData as any)?.subscription_details?.plan?.id;
    const isOnFreePlan = isFreePlan(planId);

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

    // Banner State
    const [carouselBanners, setCarouselBanners] = useState<string[]>([]);
    const [isCarouselUploading, setIsCarouselUploading] = useState(false);
    const [carouselCropperOpen, setCarouselCropperOpen] = useState(false);
    const [carouselSelectedImageUrl, setCarouselSelectedImageUrl] = useState("");

    // V3-only hero logo controls (size + bg color); persisted in storefront_settings.bannerLogo
    const [bannerLogoScale, setBannerLogoScale] = useState<number>(BANNER_LOGO_SCALE_DEFAULT);
    const [bannerLogoBgColor, setBannerLogoBgColor] = useState<string>("");
    // Full-screen store logo on the onboarding screen (persisted in storefront_settings).
    const [onboardingLogoFullScreen, setOnboardingLogoFullScreen] = useState<boolean>(false);

    // Theme menuStyle — controls whether V3 hero-logo cards are visible.
    const themeMenuStyle = (() => {
        const raw = (userData as any)?.theme;
        try {
            const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
            const v = parsed?.menuStyle;
            return typeof v === "string" ? v.toLowerCase() : "default";
        } catch {
            return "default";
        }
    })();
    const isV3Theme = themeMenuStyle === "v3";

    const { setSaveAction, setHasChanges } = useAdminSettingsStore();

    useEffect(() => {
        if (userData?.role === "partner") {
            setBannerImage((userData as any).store_banner || null);

            // Announcement & Banners
            const rules = (userData as any).delivery_rules;
            setAnnouncement(rules?.announcement || "");
            setCarouselBanners(rules?.carousel_banners || []);

            // V3 hero-logo customization (size & bg color)
            const sfRaw = (userData as any).storefront_settings;
            let sfParsed: any = null;
            try {
                sfParsed = typeof sfRaw === "string" ? JSON.parse(sfRaw) : sfRaw;
            } catch {
                sfParsed = null;
            }
            const bl = sfParsed?.bannerLogo;
            setBannerLogoScale(clampBannerLogoScale(bl?.scale));
            setBannerLogoBgColor(typeof bl?.bgColor === "string" ? bl.bgColor : "");
            setOnboardingLogoFullScreen(!!sfParsed?.onboardingLogoFullScreen);
        }
    }, [userData]);

    const handleSave = useCallback(async () => {
        if (!userData) return;
        try {
            // Read-modify-write delivery_rules so we don't clobber other keys.
            const currentRules = (userData as any).delivery_rules || {};
            const updatedRules = {
                ...currentRules,
                announcement,
                // Carousel is shown whenever banners exist; keep banner_mode in sync for any legacy readers.
                banner_mode: carouselBanners.length > 0 ? "carousel" : "single",
                carousel_banners: carouselBanners,
            };

            // Read-modify-write storefront_settings so we don't clobber other keys.
            const sfRaw = (userData as any).storefront_settings;
            let sfParsed: any = {};
            try {
                sfParsed = typeof sfRaw === "string" ? JSON.parse(sfRaw) : sfRaw || {};
            } catch {
                sfParsed = {};
            }
            const nextStorefront = {
                ...sfParsed,
                bannerLogo: {
                    scale: clampBannerLogoScale(bannerLogoScale),
                    bgColor: bannerLogoBgColor || "",
                },
                onboardingLogoFullScreen,
            };
            const storefrontPayload = JSON.stringify(nextStorefront);

            await updatePartner((userData as any).id, {
                delivery_rules: updatedRules,
                storefront_settings: storefrontPayload,
            });
            await revalidateTag((userData as any).id);
            setState({ delivery_rules: updatedRules, storefront_settings: storefrontPayload } as any);
            toast.success("Branding settings saved");
            setHasChanges(false);
        } catch (error) {
            console.error("Error saving branding settings:", error);
            toast.error("Failed to save branding settings");
        }
    }, [userData, announcement, carouselBanners, bannerLogoScale, bannerLogoBgColor, onboardingLogoFullScreen, setState, setHasChanges]);

    useEffect(() => {
        if (userData?.role !== "partner") return;
        setHasChanges(true);
        setSaveAction(handleSave);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [userData, handleSave, setSaveAction, setHasChanges]);

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
                `hotel_banners/${(userData as any).id}_v${Date.now()}.${extension}`
            );

            if (!imgUrl) throw new Error("Upload failed");

            await updatePartner((userData as any).id, { store_banner: imgUrl });

            revalidateTag((userData as any).id);

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
            const videoKey = `hotel_banners/${(userData as any).id}_v${timestamp}.mp4`;
            const thumbKey = `hotel_banners/${(userData as any).id}_v${timestamp}_thumb.jpg`;

            // Upload video and thumbnail in parallel
            const [videoUrl, _thumbUrl] = await Promise.all([
                uploadFileToS3(processedVideoBlob, videoKey),
                uploadFileToS3(thumbnailBlob, thumbKey),
            ]);

            if (!videoUrl) throw new Error("Video upload failed");

            await updatePartner((userData as any).id, { store_banner: videoUrl });
            revalidateTag((userData as any).id);

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
                `carousel_banners/${(userData as any).id}_${Date.now()}.${extension}`
            );
            if (!imgUrl) throw new Error("Upload failed");

            const updated = [...carouselBanners, imgUrl];
            setCarouselBanners(updated);

            // Save to DB immediately
            const currentRules = (userData as any).delivery_rules || {};
            const updatedRules = { ...currentRules, carousel_banners: updated, banner_mode: "carousel" };
            await updatePartner((userData as any).id, { delivery_rules: updatedRules });
            revalidateTag((userData as any).id);
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
            const updatedRules = { ...currentRules, carousel_banners: updated, banner_mode: updated.length > 0 ? "carousel" : "single" };
            await updatePartner((userData as any).id, { delivery_rules: updatedRules });
            revalidateTag((userData as any).id);
            setState({ delivery_rules: updatedRules } as any);
            toast.success("Banner removed");
        } catch {
            toast.error("Failed to remove banner");
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Onboarding Logo</CardTitle>
                        <CardDescription>How your store logo appears on the onboarding screen customers see first.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3 rounded-xl border bg-secondary/40 p-3.5">
                            <Switch
                                checked={onboardingLogoFullScreen}
                                onCheckedChange={setOnboardingLogoFullScreen}
                            />
                            <div className="flex-1">
                                <p className="text-sm font-bold">Full-screen logo</p>
                                <p className="text-[11px] text-muted-foreground">
                                    Show your logo large on the onboarding screen instead of the small badge.
                                </p>
                            </div>
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
                            <CardTitle>Logo & Banners</CardTitle>
                            <CardDescription>Upload your store logo, and optionally up to 5 carousel banners shown across the top of your store page.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Store Logo */}
                            <div className="space-y-3">
                                <Label>Store Logo</Label>
                                <p className="text-xs text-muted-foreground">Shown as your store logo. Used on its own when no banners are added.</p>
                                <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                                    {bannerImage ? (
                                        isVideoUrl(bannerImage) ? (
                                            <video src={bannerImage} autoPlay muted loop playsInline className="h-full w-full object-cover" />
                                        ) : (
                                            <Img src={bannerImage} alt="Store Logo" className="h-full w-full object-cover" />
                                        )
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                            No logo
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
                                    Upload Logo
                                    <Input
                                        type="file"
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                        accept="image/*,video/mp4,video/webm"
                                        onChange={handleBannerChange}
                                        disabled={isBannerUploading}
                                    />
                                </Button>
                            </div>

                            {/* Banner Carousel */}
                            <div className="space-y-3 border-t pt-5">
                                    <Label>Banner Carousel ({carouselBanners.length}/5)</Label>
                                    <p className="text-xs text-muted-foreground">Full-width banners shown above your menu. Add at least one to enable the carousel.</p>
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
                        </CardContent>
                    </Card>
                </div>

                {/* V3 hero-logo appearance — outside the Store Banner premium wrapper so
                    it's visible (and editable) on every plan when V3 theme is active. */}
                {isV3Theme && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Hero logo appearance (V3 theme)</CardTitle>
                            <CardDescription>
                                Tile color and zoom level for the banner logo on the V3 menu.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Background color */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Background color</Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Color of the tile behind the banner logo. Leave blank to keep the
                                    default white.
                                </p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={bannerLogoBgColor || "#ffffff"}
                                        onChange={(e) => setBannerLogoBgColor(e.target.value)}
                                        className="h-10 w-10 cursor-pointer rounded-lg border-0 p-0"
                                        aria-label="Pick logo background color"
                                    />
                                    <Input
                                        value={bannerLogoBgColor || ""}
                                        onChange={(e) => {
                                            const v = e.target.value.trim();
                                            if (v === "" || /^#[0-9a-fA-F]{0,6}$/.test(v)) {
                                                setBannerLogoBgColor(v);
                                            }
                                        }}
                                        placeholder="#ffffff"
                                        className="w-32 font-mono text-sm uppercase"
                                        maxLength={7}
                                    />
                                    <div
                                        className="h-10 flex-1 rounded-lg ring-1 ring-black/5"
                                        style={{ backgroundColor: bannerLogoBgColor || "#ffffff" }}
                                    />
                                    {bannerLogoBgColor && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => setBannerLogoBgColor("")}
                                        >
                                            Reset
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Size */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Size</Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Zoom the logo inside its tile. 100% keeps the default fit; raise it
                                    if your logo has built-in whitespace and looks small. Range{" "}
                                    {BANNER_LOGO_SCALE_MIN}%–{BANNER_LOGO_SCALE_MAX}%.
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            inputMode="numeric"
                                            min={BANNER_LOGO_SCALE_MIN}
                                            max={BANNER_LOGO_SCALE_MAX}
                                            step={5}
                                            value={bannerLogoScale}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                setBannerLogoScale(
                                                    Number.isFinite(v) ? v : BANNER_LOGO_SCALE_DEFAULT
                                                );
                                            }}
                                            onBlur={() =>
                                                setBannerLogoScale(clampBannerLogoScale(bannerLogoScale))
                                            }
                                            className="w-24 text-right font-mono text-sm"
                                        />
                                        <span className="text-sm text-muted-foreground">%</span>
                                        {bannerLogoScale !== BANNER_LOGO_SCALE_DEFAULT && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() =>
                                                    setBannerLogoScale(BANNER_LOGO_SCALE_DEFAULT)
                                                }
                                            >
                                                Reset
                                            </Button>
                                        )}
                                    </div>
                                    <div
                                        className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-black/5"
                                        style={{ background: bannerLogoBgColor || "#ffffff" }}
                                    >
                                        {bannerImage ? (
                                            isVideoUrl(bannerImage) ? (
                                                <video
                                                    src={bannerImage}
                                                    muted
                                                    playsInline
                                                    className="h-full w-full object-contain"
                                                    style={{ transform: `scale(${bannerLogoScale / 100})` }}
                                                />
                                            ) : (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={bannerImage}
                                                    alt=""
                                                    className="h-full w-full object-contain"
                                                    style={{ transform: `scale(${bannerLogoScale / 100})` }}
                                                />
                                            )
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No logo</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

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

                {/* Single Banner Cropper */}
                {isCropperOpen && selectedImageUrl && (
                    <BannerEditor
                        imageUrl={selectedImageUrl}
                        isOpen={isCropperOpen}
                        onClose={() => {
                            setIsCropperOpen(false);
                            setSelectedImageFile(null);
                            setSelectedImageUrl("");
                        }}
                        onComplete={handleCropComplete}
                    />
                )}

                {/* Video Editor */}
                {isVideoEditorOpen && selectedVideoFile && (
                    <VideoEditor
                        videoFile={selectedVideoFile}
                        isOpen={isVideoEditorOpen}
                        onClose={() => {
                            setIsVideoEditorOpen(false);
                            setSelectedVideoFile(null);
                        }}
                        onComplete={handleVideoComplete}
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
