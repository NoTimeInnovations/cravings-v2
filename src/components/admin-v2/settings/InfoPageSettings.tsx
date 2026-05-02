"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { ExternalLink, Upload, Loader2, RotateCcw } from "lucide-react";
import { uploadFileToS3 } from "@/app/actions/aws-s3";

const TAG_KEYS = ["direct-order", "dine-in", "takeaway", "delivery", "no-fees"] as const;
type TagKey = typeof TAG_KEYS[number];
const TAG_LABELS: Record<TagKey, string> = {
    "direct-order": "Direct order",
    "dine-in": "Dine-in price",
    takeaway: "Takeaway",
    delivery: "Delivery",
    "no-fees": "No service fees",
};

const SOCIAL_KEYS = ["whatsapp", "instagram", "location", "phone", "facebook"] as const;
type SocialKey = typeof SOCIAL_KEYS[number];
const SOCIAL_LABELS: Record<SocialKey, string> = {
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    location: "Directions (Map)",
    phone: "Call us",
    facebook: "Facebook",
};

interface InfoPageData {
    bgImage: string;
    buttonColor: string; // empty string = inherit storefront brand color
    cuisine: string;
    city: string;
    ctaSubtitle: string;
    showOpenStatus: boolean;
    openStatusText: string;
    tags: Record<TagKey, boolean>;
    socials: Record<SocialKey, boolean>;
}

interface AppStoreLinks {
    playstore: string;
    appstore: string;
}

const DEFAULT_INFO: InfoPageData = {
    bgImage: "",
    buttonColor: "",
    cuisine: "",
    city: "",
    ctaSubtitle: "Order, pay, and earn rewards · iOS & Android",
    showOpenStatus: true,
    openStatusText: "Open now",
    tags: {
        "direct-order": true,
        "dine-in": true,
        takeaway: true,
        delivery: true,
        "no-fees": true,
    },
    socials: {
        whatsapp: true,
        instagram: true,
        location: true,
        phone: true,
        facebook: true,
    },
};

function parseSocialLinks(input: any): Record<string, any> {
    if (!input) return {};
    if (typeof input === "string") {
        try {
            const v = JSON.parse(input);
            return typeof v === "object" && v !== null ? v : {};
        } catch {
            return { instagram: input };
        }
    }
    return typeof input === "object" ? input : {};
}

const BRAND_COLOR_MAP: Record<string, string> = {
    "burnt-orange": "#e85d04",
    "obsidian-gold": "#b8860b",
    "royal-burgundy": "#8b1a4a",
    "midnight-emerald": "#0d6b4e",
    sapphire: "#1e4db7",
    "charcoal-noir": "#2c2c2c",
    "deep-violet": "#6b21a8",
    "rose-blush": "#be185d",
    "teal-luxe": "#0f766e",
    "warm-copper": "#b45309",
};
const FALLBACK_BRAND = "#ff6a13";

function resolveBrandColor(storefront: any): string {
    const bc = storefront?.brandColor;
    if (!bc) return FALLBACK_BRAND;
    if (bc.startsWith("custom:")) {
        const hex = bc.slice("custom:".length).trim();
        if (/^#?[0-9a-fA-F]{3,8}$/.test(hex)) {
            return hex.startsWith("#") ? hex : `#${hex}`;
        }
        return FALLBACK_BRAND;
    }
    return BRAND_COLOR_MAP[bc] || FALLBACK_BRAND;
}

function mergeInfo(stored: any): InfoPageData {
    if (!stored || typeof stored !== "object") return { ...DEFAULT_INFO };
    return {
        ...DEFAULT_INFO,
        ...stored,
        tags: { ...DEFAULT_INFO.tags, ...(stored.tags || {}) },
        socials: { ...DEFAULT_INFO.socials, ...(stored.socials || {}) },
    };
}

async function convertToWebp(file: File, quality = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas not supported"));
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/webp", quality));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = URL.createObjectURL(file);
    });
}

export function InfoPageSettings() {
    const { userData, setState } = useAuthStore();
    const { setSaveAction, setHasChanges } = useAdminSettingsStore();

    const [info, setInfo] = useState<InfoPageData>(DEFAULT_INFO);
    const [appLinks, setAppLinks] = useState<AppStoreLinks>({ playstore: "", appstore: "" });
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const partnerId = (userData as any)?.id;
    const username = (userData as any)?.username;
    const storeBanner = (userData as any)?.store_banner;

    // Resolve the storefront brand color (used as the default for buttonColor)
    const brandColor = (() => {
        const sf = (userData as any)?.storefront_settings;
        let parsed: any = null;
        if (sf) {
            try {
                parsed = typeof sf === "string" ? JSON.parse(sf) : sf;
            } catch {
                parsed = null;
            }
        }
        return resolveBrandColor(parsed);
    })();
    const effectiveButtonColor = info.buttonColor || brandColor;

    // Load existing settings
    useEffect(() => {
        if (!userData) return;
        const existing = (userData as any)?.storefront_settings;
        let parsed: any = null;
        if (existing) {
            try {
                parsed = typeof existing === "string" ? JSON.parse(existing) : existing;
            } catch {
                parsed = null;
            }
        }
        setInfo(mergeInfo(parsed?.infoPage));

        const sl = parseSocialLinks((userData as any)?.social_links);
        setAppLinks({
            playstore: sl.playstore || "",
            appstore: sl.appstore || "",
        });
        setInitialLoaded(true);
    }, [userData]);

    const handleSave = useCallback(async () => {
        if (!userData) return;
        try {
            const existing = (userData as any)?.storefront_settings;
            let parsed: any = {};
            if (existing) {
                try {
                    parsed = typeof existing === "string" ? JSON.parse(existing) : existing;
                } catch {
                    parsed = {};
                }
            }
            const nextStorefront = { ...parsed, infoPage: info };
            const storefrontPayload = JSON.stringify(nextStorefront);

            // Read-modify-write social_links: only update playstore/appstore, preserve other keys
            const existingSocial = parseSocialLinks((userData as any)?.social_links);
            const nextSocial = {
                ...existingSocial,
                playstore: appLinks.playstore || "",
                appstore: appLinks.appstore || "",
            };

            await updatePartner((userData as any).id, {
                storefront_settings: storefrontPayload,
                social_links: nextSocial,
            });
            revalidateTag((userData as any).id);
            setState({
                storefront_settings: storefrontPayload,
                social_links: nextSocial,
            } as any);
            toast.success("Info page settings saved");
            setHasChanges(false);
        } catch (e) {
            console.error("Error saving info page settings:", e);
            toast.error("Failed to save info page settings");
        }
    }, [info, appLinks, userData, setState, setHasChanges]);

    useEffect(() => {
        if (!initialLoaded) return;
        setHasChanges(true);
        setSaveAction(handleSave);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [info, appLinks, initialLoaded, handleSave, setSaveAction, setHasChanges]);

    const update = (patch: Partial<InfoPageData>) => setInfo((p) => ({ ...p, ...patch }));
    const setTag = (k: TagKey, v: boolean) =>
        setInfo((p) => ({ ...p, tags: { ...p.tags, [k]: v } }));
    const setSocial = (k: SocialKey, v: boolean) =>
        setInfo((p) => ({ ...p, socials: { ...p.socials, [k]: v } }));

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const webpData = await convertToWebp(file);
            const filename = `${partnerId || "general"}/info-page/${Date.now()}.webp`;
            const url = await uploadFileToS3(webpData, filename);
            update({ bgImage: url });
            toast.success("Background image uploaded");
        } catch (err) {
            console.error("Upload failed:", err);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const previewUrl = username ? `https://menuthere.com/${username}/info` : null;
    const heroPreview = info.bgImage || storeBanner;

    return (
        <div className="space-y-4">
            {/* Overview */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <CardTitle>Info Page</CardTitle>
                            <CardDescription>
                                The QR landing page customers see when they scan your table QR.
                            </CardDescription>
                        </div>
                        {previewUrl && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(previewUrl, "_blank")}
                            >
                                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 rounded-xl border bg-secondary/40 p-3.5">
                        <Switch
                            checked={info.showOpenStatus}
                            onCheckedChange={(v) => update({ showOpenStatus: v })}
                        />
                        <div className="flex-1">
                            <p className="text-sm font-bold">
                                {info.showOpenStatus ? "Open badge visible" : "Open badge hidden"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                Toggle the open/hours pill in the top-right of the hero
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                if (
                                    confirm(
                                        "Reset info page settings to defaults? Your toggles and copy will be lost."
                                    )
                                )
                                    setInfo({ ...DEFAULT_INFO });
                            }}
                        >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Background image */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Background image</CardTitle>
                    <CardDescription>
                        Full-bleed photo behind the logo. Defaults to your store banner — upload a
                        separate image if you want the background and the logo to be different.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        className="hidden"
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Upload className="mr-1 h-3.5 w-3.5" />
                            )}
                            {uploading
                                ? "Uploading..."
                                : info.bgImage
                                  ? "Replace image"
                                  : "Upload background"}
                        </Button>
                        {info.bgImage && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => update({ bgImage: "" })}
                            >
                                Reset to store banner
                            </Button>
                        )}
                    </div>
                    {heroPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={heroPreview}
                            alt=""
                            className="h-40 w-full rounded-lg object-cover ring-1 ring-black/5"
                        />
                    ) : (
                        <div className="flex h-40 w-full items-center justify-center rounded-lg border-2 border-dashed text-xs text-muted-foreground">
                            No image — upload one or set a store banner in General settings.
                        </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                        {info.bgImage
                            ? "Custom background in use. Logo still uses your store banner."
                            : "Using store banner as both background and logo."}
                    </p>
                </CardContent>
            </Card>

            {/* Button color */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Button color</CardTitle>
                    <CardDescription>
                        Color used for the Download CTA. Defaults to your storefront brand color.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={effectiveButtonColor}
                            onChange={(e) => update({ buttonColor: e.target.value })}
                            className="h-10 w-10 cursor-pointer rounded-lg border-0 p-0"
                            aria-label="Pick button color"
                        />
                        <Input
                            value={info.buttonColor || ""}
                            onChange={(e) => {
                                const v = e.target.value.trim();
                                if (v === "" || /^#[0-9a-fA-F]{0,6}$/.test(v)) {
                                    update({ buttonColor: v });
                                }
                            }}
                            placeholder={brandColor}
                            className="w-32 font-mono text-sm uppercase"
                            maxLength={7}
                        />
                        <div
                            className="h-10 flex-1 rounded-lg ring-1 ring-black/5"
                            style={{ backgroundColor: effectiveButtonColor }}
                        />
                        {info.buttonColor && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => update({ buttonColor: "" })}
                            >
                                Reset
                            </Button>
                        )}
                    </div>

                    {/* Live preview of the CTA */}
                    <div className="rounded-xl border bg-secondary/30 p-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Preview
                        </p>
                        <div
                            className="flex h-12 items-center justify-center rounded-2xl px-4 text-sm font-bold text-white"
                            style={{
                                backgroundColor: effectiveButtonColor,
                                boxShadow: `0 8px 24px ${effectiveButtonColor}55`,
                            }}
                        >
                            Download App
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                            {info.buttonColor
                                ? "Custom button color in use."
                                : `Inheriting brand color (${brandColor}).`}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Heading copy */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Heading & subtitle</CardTitle>
                    <CardDescription>
                        Shown under your logo. Subtitle reads as “Cuisine · City”.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <Label>Cuisine / category</Label>
                            <Input
                                className="mt-1.5"
                                value={info.cuisine}
                                onChange={(e) => update({ cuisine: e.target.value })}
                                placeholder="Fine dining"
                            />
                        </div>
                        <div>
                            <Label>City</Label>
                            <Input
                                className="mt-1.5"
                                value={info.city}
                                onChange={(e) => update({ city: e.target.value })}
                                placeholder="Cairo"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Download App button */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Download App button</CardTitle>
                    <CardDescription>
                        We auto-pick the right store from the visitor&apos;s device — App Store on
                        iOS, Play Store everywhere else. The button is hidden if neither URL is
                        set.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label>Play Store URL</Label>
                            <Input
                                className="mt-1.5"
                                value={appLinks.playstore}
                                onChange={(e) =>
                                    setAppLinks((p) => ({ ...p, playstore: e.target.value }))
                                }
                                placeholder="https://play.google.com/store/apps/details?id=..."
                            />
                        </div>
                        <div>
                            <Label>App Store URL</Label>
                            <Input
                                className="mt-1.5"
                                value={appLinks.appstore}
                                onChange={(e) =>
                                    setAppLinks((p) => ({ ...p, appstore: e.target.value }))
                                }
                                placeholder="https://apps.apple.com/..."
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Caption under the button</Label>
                        <Input
                            className="mt-1.5"
                            value={info.ctaSubtitle}
                            onChange={(e) => update({ ctaSubtitle: e.target.value })}
                            placeholder="Order, pay, and earn rewards · iOS & Android"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Open status */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Open status pill</CardTitle>
                    <CardDescription>Floats over the top-right of the hero.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <p className="text-sm font-medium">Show open status</p>
                            <p className="text-[11px] text-muted-foreground">
                                Hide if you don’t want the live indicator.
                            </p>
                        </div>
                        <Switch
                            checked={info.showOpenStatus}
                            onCheckedChange={(v) => update({ showOpenStatus: v })}
                        />
                    </div>
                    <div>
                        <Label>Open status text</Label>
                        <Input
                            className="mt-1.5"
                            value={info.openStatusText}
                            onChange={(e) => update({ openStatusText: e.target.value })}
                            placeholder="Open now · until 11:30 PM"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Tags */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Tags shown</CardTitle>
                    <CardDescription>Quick chips under the heading.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {TAG_KEYS.map((k) => (
                            <div
                                key={k}
                                className="flex items-center justify-between rounded-lg border bg-secondary/30 p-3"
                            >
                                <span className="text-sm font-medium">{TAG_LABELS[k]}</span>
                                <Switch
                                    checked={info.tags[k] !== false}
                                    onCheckedChange={(v) => setTag(k, v)}
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Socials */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Social links shown</CardTitle>
                    <CardDescription>
                        Each link only appears if the URL/number is set in General settings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {SOCIAL_KEYS.map((k) => (
                            <div
                                key={k}
                                className="flex items-center justify-between rounded-lg border bg-secondary/30 p-3"
                            >
                                <span className="text-sm font-medium">{SOCIAL_LABELS[k]}</span>
                                <Switch
                                    checked={info.socials[k] !== false}
                                    onCheckedChange={(v) => setSocial(k, v)}
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
