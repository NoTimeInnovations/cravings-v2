"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import {
    ExternalLink, Plus, ArrowUp, ArrowDown, Pencil, Trash2,
    RotateCcw, Layout, X, Sparkles, Upload, Loader2
} from "lucide-react";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SECTION_TYPES = [
    { id: "hero", label: "Hero", icon: "🎯", desc: "Big banner with headline & CTA" },
    { id: "carousel", label: "Banner Carousel", icon: "🖼️", desc: "Scrollable image slides" },
    { id: "imageText", label: "Image + Text", icon: "📰", desc: "Story block with image & copy" },
    { id: "cta", label: "Call to Action", icon: "📣", desc: "Full-width CTA band" },
    { id: "testimonials", label: "Testimonials", icon: "💬", desc: "Customer reviews" },
    { id: "about", label: "About / Story", icon: "📖", desc: "Long-form about section" },
    { id: "footer", label: "Footer", icon: "🔗", desc: "Contact, socials, copyright" },
];

type SectionType = "hero" | "carousel" | "imageText" | "cta" | "testimonials" | "about" | "footer";

interface StorefrontSection {
    id: string;
    type: SectionType;
    enabled: boolean;
    content: Record<string, any>;
}

interface StorefrontData {
    enabled: boolean;
    logoType: "emoji" | "image";
    logoEmoji: string;
    logoImage: string;
    brandName: string;
    sections: StorefrontSection[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_CONTENT: Record<string, Record<string, any>> = {
    hero: {
        heading: "Welcome to our restaurant",
        subheading: "Authentic flavors, crafted fresh daily",
        eyebrow: "",
        backgroundImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200",
        overlayOpacity: 55,
        ctaPrimary: { label: "Order Now", link: "/" },
        ctaSecondary: { label: "View Menu", link: "/" },
    },
    carousel: {
        title: "",
        slides: [
            { id: uid(), image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800", heading: "Fresh Daily", description: "Made with love every day" },
        ],
    },
    imageText: {
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900",
        heading: "Our Story",
        description: "Share what makes your restaurant special.",
        ctaLabel: "",
        ctaLink: "",
        imagePosition: "top",
    },
    cta: {
        heading: "Order Online",
        description: "Order directly to save on fees and support local.",
        ctaLabel: "Order Now",
        ctaLink: "/",
        backgroundImage: "",
        variant: "primary",
    },
    testimonials: {
        title: "What our guests are saying",
        quotes: [
            { id: uid(), name: "Customer", text: "Great food and amazing service!", rating: 5 },
        ],
    },
    about: {
        heading: "About Us",
        description: "Tell your customers about the craft that goes into every plate.",
        image: "",
    },
    footer: {
        description: "",
        phone: "",
        email: "",
        copyright: `© ${new Date().getFullYear()} All rights reserved`,
    },
};

const DEFAULT_STOREFRONT: StorefrontData = {
    enabled: true,
    logoType: "image",
    logoEmoji: "🍽️",
    logoImage: "",
    brandName: "",
    sections: [
        { id: uid(), type: "hero", enabled: true, content: { ...DEFAULT_CONTENT.hero } },
        { id: uid(), type: "imageText", enabled: true, content: { ...DEFAULT_CONTENT.imageText } },
        { id: uid(), type: "cta", enabled: true, content: { ...DEFAULT_CONTENT.cta } },
        { id: uid(), type: "testimonials", enabled: true, content: { ...DEFAULT_CONTENT.testimonials } },
        { id: uid(), type: "about", enabled: true, content: { ...DEFAULT_CONTENT.about } },
        { id: uid(), type: "footer", enabled: true, content: { ...DEFAULT_CONTENT.footer } },
    ],
};

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}

function sectionSummary(sec: StorefrontSection) {
    const c = sec.content || {};
    switch (sec.type) {
        case "hero": return c.heading || "(hero)";
        case "carousel": return `${(c.slides || []).length} slide(s)`;
        case "imageText": return c.heading || "(image + text)";
        case "cta": return c.heading || "(call to action)";
        case "testimonials": return `${(c.quotes || []).length} review(s)`;
        case "about": return c.heading || "(about)";
        case "footer": return c.phone || c.email || "Footer";
        default: return "";
    }
}

export function StorefrontSettings() {
    const { userData, setState } = useAuthStore();
    const { setSaveAction, setHasChanges } = useAdminSettingsStore();

    const [storefront, setStorefront] = useState<StorefrontData>(DEFAULT_STOREFRONT);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [initialLoaded, setInitialLoaded] = useState(false);

    useEffect(() => {
        if (userData) {
            const existing = (userData as any)?.storefront_settings;
            if (existing) {
                try {
                    const parsed = typeof existing === "string" ? JSON.parse(existing) : existing;
                    setStorefront({ ...DEFAULT_STOREFRONT, ...parsed });
                } catch {
                    setStorefront(DEFAULT_STOREFRONT);
                }
            }
            setInitialLoaded(true);
        }
    }, [userData]);

    useEffect(() => {
        if (!initialLoaded) return;
        setHasChanges(true);
        setSaveAction(handleSave);
        return () => {
            setSaveAction(null);
            setHasChanges(false);
        };
    }, [storefront, initialLoaded]);

    const handleSave = useCallback(async () => {
        if (!userData) return;
        try {
            const payload = JSON.stringify(storefront);
            await updatePartner((userData as any).id, { storefront_settings: payload });
            revalidateTag((userData as any).id);
            setState({ storefront_settings: payload } as any);
            toast.success("Storefront settings saved");
            setHasChanges(false);
        } catch (error) {
            console.error("Error saving storefront:", error);
            toast.error("Failed to save storefront settings");
        }
    }, [storefront, userData]);

    const updateStorefront = (patch: Partial<StorefrontData>) => {
        setStorefront((prev) => ({ ...prev, ...patch }));
    };

    const addSection = (type: SectionType) => {
        const newSection: StorefrontSection = {
            id: uid(),
            type,
            enabled: true,
            content: JSON.parse(JSON.stringify(DEFAULT_CONTENT[type] || {})),
        };
        setStorefront((prev) => ({
            ...prev,
            sections: [...prev.sections, newSection],
        }));
    };

    const toggleSection = (id: string) => {
        setStorefront((prev) => ({
            ...prev,
            sections: prev.sections.map((s) =>
                s.id === id ? { ...s, enabled: !s.enabled } : s
            ),
        }));
    };

    const removeSection = (id: string) => {
        setStorefront((prev) => ({
            ...prev,
            sections: prev.sections.filter((s) => s.id !== id),
        }));
    };

    const moveSection = (id: string, dir: "up" | "down") => {
        setStorefront((prev) => {
            const idx = prev.sections.findIndex((s) => s.id === id);
            if (idx < 0) return prev;
            const newIdx = dir === "up" ? idx - 1 : idx + 1;
            if (newIdx < 0 || newIdx >= prev.sections.length) return prev;
            const arr = [...prev.sections];
            [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
            return { ...prev, sections: arr };
        });
    };

    const updateSection = (id: string, contentPatch: Record<string, any>) => {
        setStorefront((prev) => ({
            ...prev,
            sections: prev.sections.map((s) =>
                s.id === id ? { ...s, content: { ...s.content, ...contentPatch } } : s
            ),
        }));
    };

    const resetStorefront = () => {
        setStorefront(DEFAULT_STOREFRONT);
    };

    const editing = storefront.sections.find((s) => s.id === editingId) || null;

    const username = (userData as any)?.username;
    const firstQrCodeId = (userData as any)?.qr_codes?.[0]?.id;
    const hotelNameSlug = (userData as any)?.name?.replace(/ /g, "-");
    const storeBanner = (userData as any)?.store_banner;
    const partnerId = (userData as any)?.id;
    const storeName = (userData as any)?.store_name || (userData as any)?.name || "";

    return (
        <div className="space-y-4">
            {/* Overview */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <CardTitle>Storefront Builder</CardTitle>
                            <CardDescription>
                                Your public landing page — share on WhatsApp, Google, Instagram
                            </CardDescription>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                if (username) {
                                    window.open(`https://menuthere.com/${username}`, "_blank");
                                } else if (hotelNameSlug && firstQrCodeId) {
                                    window.open(`https://menuthere.com/qrScan/${hotelNameSlug}/${firstQrCodeId}`, "_blank");
                                }
                            }}
                        >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Preview
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 rounded-xl border bg-secondary/40 p-3.5">
                        <Switch
                            checked={storefront.enabled}
                            onCheckedChange={(v) => updateStorefront({ enabled: v })}
                        />
                        <div className="flex-1">
                            <p className="text-sm font-bold">
                                {storefront.enabled ? "Published" : "Unpublished"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                Toggle to publish or unpublish your storefront page
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                if (confirm("Reset storefront to defaults? All edits will be lost."))
                                    resetStorefront();
                            }}
                        >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Logo & Brand */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Logo & Brand Name</CardTitle>
                    <CardDescription>Shown in header, footer, and share previews</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Brand name</Label>
                        <Input
                            className="mt-1.5"
                            value={storefront.brandName}
                            onChange={(e) => updateStorefront({ brandName: e.target.value })}
                            placeholder="Defaults to your restaurant name"
                        />
                    </div>

                    <div>
                        <Label>Logo</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">Uses your store banner. Change it from General settings.</p>
                        <div className="flex items-center gap-3">
                            {storeBanner ? (
                                <img
                                    src={storeBanner}
                                    alt=""
                                    className="h-14 w-14 rounded-full object-cover ring-2 ring-black/10"
                                />
                            ) : (
                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-2xl ring-2 ring-black/10">
                                    {(storefront.brandName || storeName || "R").charAt(0)}
                                </span>
                            )}
                            <span className="text-sm text-muted-foreground">{storeBanner ? "Store banner" : "No banner set"}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sections list */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Sections</CardTitle>
                            <CardDescription>
                                {storefront.sections.length} in order - tap to edit
                            </CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setAddOpen(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {storefront.sections.map((sec, idx) => {
                            const meta = SECTION_TYPES.find((t) => t.id === sec.type);
                            return (
                                <div
                                    key={sec.id}
                                    className={cn(
                                        "group flex items-center gap-2 rounded-xl border bg-white dark:bg-background p-2.5 transition hover:border-primary/40",
                                        !sec.enabled && "opacity-60"
                                    )}
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            disabled={idx === 0}
                                            onClick={() => moveSection(sec.id, "up")}
                                            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
                                        >
                                            <ArrowUp className="h-3 w-3" />
                                        </button>
                                        <button
                                            disabled={idx === storefront.sections.length - 1}
                                            onClick={() => moveSection(sec.id, "down")}
                                            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
                                        >
                                            <ArrowDown className="h-3 w-3" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setEditingId(sec.id)}
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-xl">
                                            {meta?.icon || "■"}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-extrabold">
                                                {meta?.label || sec.type}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {sectionSummary(sec)}
                                            </p>
                                        </div>
                                    </button>

                                    <Switch
                                        checked={sec.enabled}
                                        onCheckedChange={() => toggleSection(sec.id)}
                                    />
                                    <button
                                        onClick={() => setEditingId(sec.id)}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50"
                                        title="Edit"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Delete "${meta?.label}" section?`))
                                                removeSection(sec.id);
                                        }}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}

                        {storefront.sections.length === 0 && (
                            <div className="rounded-xl border-2 border-dashed bg-secondary/30 py-10 text-center">
                                <Layout className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm font-bold">No sections yet</p>
                                <p className="text-xs text-muted-foreground">
                                    Click &quot;Add Section&quot; to start building.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Add Section Dialog */}
            <AddSectionDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onAdd={(type: SectionType) => {
                    addSection(type);
                    setAddOpen(false);
                    setTimeout(() => {
                        setStorefront((prev) => {
                            const latest = prev.sections[prev.sections.length - 1];
                            if (latest) setEditingId(latest.id);
                            return prev;
                        });
                    }, 50);
                }}
            />

            {/* Section Editor Dialog */}
            <SectionEditorDialog
                section={editing}
                onClose={() => setEditingId(null)}
                onUpdate={updateSection}
                storefront={storefront}
                setStorefront={setStorefront}
                partnerId={partnerId}
            />
        </div>
    );
}

/* ================== ADD SECTION DIALOG ================== */
function AddSectionDialog({
    open,
    onClose,
    onAdd,
}: {
    open: boolean;
    onClose: () => void;
    onAdd: (type: SectionType) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add a section</DialogTitle>
                    <DialogDescription>Pick a block to insert at the end.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto p-4">
                    <div className="grid grid-cols-2 gap-2">
                        {SECTION_TYPES.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => onAdd(t.id as SectionType)}
                                className="flex flex-col items-start gap-2 rounded-xl border bg-white dark:bg-background p-3 text-left transition hover:border-primary hover:bg-primary/5"
                            >
                                <span className="text-2xl">{t.icon}</span>
                                <div>
                                    <p className="text-xs font-extrabold">{t.label}</p>
                                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                                        {t.desc}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ================== SECTION EDITOR DIALOG ================== */
function SectionEditorDialog({
    section,
    onClose,
    onUpdate,
    storefront,
    setStorefront,
    partnerId,
}: {
    section: StorefrontSection | null;
    onClose: () => void;
    onUpdate: (id: string, patch: Record<string, any>) => void;
    storefront: StorefrontData;
    setStorefront: React.Dispatch<React.SetStateAction<StorefrontData>>;
    partnerId?: string;
}) {
    const meta = section ? SECTION_TYPES.find((t) => t.id === section.type) : null;

    return (
        <Dialog open={!!section} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="flex h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
                <DialogHeader className="flex flex-row items-center gap-3 p-4 border-b">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
                        {meta?.icon || "■"}
                    </div>
                    <div className="flex-1">
                        <DialogTitle>Edit - {meta?.label}</DialogTitle>
                        <DialogDescription>{meta?.desc}</DialogDescription>
                    </div>
                </DialogHeader>

                {section && (
                    <div className="flex-1 overflow-y-auto p-5">
                        <div className="mx-auto max-w-xl space-y-4">
                            <SectionFormRouter
                                section={section}
                                onUpdate={onUpdate}
                                storefront={storefront}
                                setStorefront={setStorefront}
                                partnerId={partnerId}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="p-4 border-t">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={onClose}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ================== FORM ROUTER ================== */
function SectionFormRouter({
    section,
    onUpdate,
    storefront,
    setStorefront,
    partnerId,
}: {
    section: StorefrontSection;
    onUpdate: (id: string, patch: Record<string, any>) => void;
    storefront: StorefrontData;
    setStorefront: React.Dispatch<React.SetStateAction<StorefrontData>>;
    partnerId?: string;
}) {
    const set = (patch: Record<string, any>) => onUpdate(section.id, patch);

    switch (section.type) {
        case "hero": return <HeroEditor content={section.content} set={set} partnerId={partnerId} />;
        case "carousel": return <CarouselEditor section={section} storefront={storefront} setStorefront={setStorefront} partnerId={partnerId} />;
        case "imageText": return <ImageTextEditor content={section.content} set={set} partnerId={partnerId} />;
        case "cta": return <CTAEditor content={section.content} set={set} partnerId={partnerId} />;
        case "testimonials": return <TestimonialsEditor section={section} storefront={storefront} setStorefront={setStorefront} />;
        case "about": return <AboutEditor content={section.content} set={set} partnerId={partnerId} />;
        case "footer": return <FooterEditor content={section.content} set={set} />;
        default: return null;
    }
}

/* ================== REUSABLE FIELD WRAPPERS ================== */
function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
    );
}

function ImagePreview({ src }: { src?: string }) {
    if (!src) return null;
    return (
        <div className="mt-2 overflow-hidden rounded-lg ring-1 ring-black/5">
            <img src={src} alt="" className="h-32 w-full object-cover" />
        </div>
    );
}

function SubCard({ children, onDelete, title }: { children: React.ReactNode; onDelete?: () => void; title: string }) {
    return (
        <div className="space-y-3 rounded-xl border bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {title}
                </p>
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

/* ================== HERO ================== */
function HeroEditor({ content, set, partnerId }: { content: Record<string, any>; set: (p: Record<string, any>) => void; partnerId?: string }) {
    return (
        <Tabs defaultValue="content" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="cta">Buttons</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
                <FieldRow label="Eyebrow label" hint="Small pill shown above the heading">
                    <Input
                        value={content.eyebrow || ""}
                        onChange={(e) => set({ eyebrow: e.target.value })}
                        placeholder="e.g. Best Pizza in Henderson"
                    />
                </FieldRow>
                <FieldRow label="Heading">
                    <Textarea
                        value={content.heading || ""}
                        onChange={(e) => set({ heading: e.target.value })}
                        rows={2}
                    />
                </FieldRow>
                <FieldRow label="Subheading">
                    <Textarea
                        value={content.subheading || ""}
                        onChange={(e) => set({ subheading: e.target.value })}
                        rows={2}
                    />
                </FieldRow>
            </TabsContent>

            <TabsContent value="cta" className="space-y-5">
                <SubCard title="Primary Button">
                    <FieldRow label="Label">
                        <Input
                            value={content.ctaPrimary?.label || ""}
                            onChange={(e) => set({ ctaPrimary: { ...content.ctaPrimary, label: e.target.value } })}
                        />
                    </FieldRow>
                    <FieldRow label="Link / URL">
                        <Input
                            value={content.ctaPrimary?.link || ""}
                            onChange={(e) => set({ ctaPrimary: { ...content.ctaPrimary, link: e.target.value } })}
                            placeholder="/ or https://..."
                        />
                    </FieldRow>
                </SubCard>
                <SubCard title="Secondary Button">
                    <FieldRow label="Label" hint="Leave empty to hide">
                        <Input
                            value={content.ctaSecondary?.label || ""}
                            onChange={(e) => set({ ctaSecondary: { ...content.ctaSecondary, label: e.target.value } })}
                        />
                    </FieldRow>
                    <FieldRow label="Link / URL">
                        <Input
                            value={content.ctaSecondary?.link || ""}
                            onChange={(e) => set({ ctaSecondary: { ...content.ctaSecondary, link: e.target.value } })}
                        />
                    </FieldRow>
                </SubCard>
            </TabsContent>

            <TabsContent value="style" className="space-y-4">
                <ImageUploadField
                    label="Background image"
                    value={content.backgroundImage || ""}
                    onChange={(url) => set({ backgroundImage: url })}
                    partnerId={partnerId}
                    folder="storefront/hero"
                />
                <FieldRow label={`Overlay darkness - ${content.overlayOpacity ?? 55}%`}>
                    <Slider
                        value={[content.overlayOpacity ?? 55]}
                        min={0}
                        max={90}
                        step={5}
                        onValueChange={([v]) => set({ overlayOpacity: v })}
                    />
                </FieldRow>
            </TabsContent>
        </Tabs>
    );
}

/* ================== CAROUSEL ================== */
function CarouselEditor({
    section,
    storefront,
    setStorefront,
    partnerId,
}: {
    section: StorefrontSection;
    partnerId?: string;
    storefront: StorefrontData;
    setStorefront: React.Dispatch<React.SetStateAction<StorefrontData>>;
}) {
    const slides = section.content.slides || [];

    const updateSectionContent = (patch: Record<string, any>) => {
        setStorefront((prev) => ({
            ...prev,
            sections: prev.sections.map((s) =>
                s.id === section.id ? { ...s, content: { ...s.content, ...patch } } : s
            ),
        }));
    };

    const addSlide = () => {
        updateSectionContent({
            slides: [...slides, { id: uid(), image: "", heading: "", description: "" }],
        });
    };

    const updateSlide = (slideId: string, patch: Record<string, any>) => {
        updateSectionContent({
            slides: slides.map((sl: any) => sl.id === slideId ? { ...sl, ...patch } : sl),
        });
    };

    const removeSlide = (slideId: string) => {
        updateSectionContent({
            slides: slides.filter((sl: any) => sl.id !== slideId),
        });
    };

    return (
        <div className="space-y-5">
            <FieldRow label="Section title (optional)">
                <Input
                    value={section.content.title || ""}
                    onChange={(e) => updateSectionContent({ title: e.target.value })}
                    placeholder="e.g. What's new"
                />
            </FieldRow>

            <div>
                <div className="mb-3 flex items-center justify-between">
                    <Label>Slides - {slides.length}</Label>
                    <Button size="sm" variant="outline" onClick={addSlide}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Slide
                    </Button>
                </div>

                <div className="space-y-3">
                    {slides.map((sl: any, i: number) => (
                        <SubCard
                            key={sl.id}
                            title={`Slide ${i + 1}`}
                            onDelete={() => {
                                if (confirm("Delete slide?")) removeSlide(sl.id);
                            }}
                        >
                            <ImageUploadField
                                label="Image"
                                value={sl.image}
                                onChange={(url) => updateSlide(sl.id, { image: url })}
                                partnerId={partnerId}
                                folder="storefront/carousel"
                            />
                            <FieldRow label="Heading">
                                <Input
                                    value={sl.heading}
                                    onChange={(e) => updateSlide(sl.id, { heading: e.target.value })}
                                />
                            </FieldRow>
                            <FieldRow label="Description">
                                <Textarea
                                    value={sl.description}
                                    onChange={(e) => updateSlide(sl.id, { description: e.target.value })}
                                    rows={2}
                                />
                            </FieldRow>
                        </SubCard>
                    ))}

                    {slides.length === 0 && (
                        <p className="rounded-xl border-2 border-dashed py-8 text-center text-xs text-muted-foreground">
                            No slides yet.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ================== IMAGE + TEXT ================== */
function ImageTextEditor({ content, set, partnerId }: { content: Record<string, any>; set: (p: Record<string, any>) => void; partnerId?: string }) {
    return (
        <div className="space-y-4">
            <ImageUploadField
                label="Image"
                value={content.image || ""}
                onChange={(url) => set({ image: url })}
                partnerId={partnerId}
                folder="storefront/imagetext"
            />
            <FieldRow label="Heading">
                <Input value={content.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
            </FieldRow>
            <FieldRow label="Description">
                <Textarea
                    value={content.description || ""}
                    onChange={(e) => set({ description: e.target.value })}
                    rows={5}
                />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
                <FieldRow label="CTA label" hint="Leave empty to hide">
                    <Input value={content.ctaLabel || ""} onChange={(e) => set({ ctaLabel: e.target.value })} />
                </FieldRow>
                <FieldRow label="CTA link">
                    <Input value={content.ctaLink || ""} onChange={(e) => set({ ctaLink: e.target.value })} />
                </FieldRow>
            </div>
            <FieldRow label="Image position">
                <div className="grid grid-cols-2 gap-2">
                    {(["top", "bottom"] as const).map((p) => {
                        const sel = (content.imagePosition || "top") === p;
                        return (
                            <button
                                key={p}
                                onClick={() => set({ imagePosition: p })}
                                className={cn(
                                    "rounded-lg border-2 px-3 py-2 text-xs font-bold capitalize transition",
                                    sel
                                        ? "border-primary bg-primary/5 text-primary"
                                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                                )}
                            >
                                Image {p}
                            </button>
                        );
                    })}
                </div>
            </FieldRow>
        </div>
    );
}

/* ================== CTA ================== */
function CTAEditor({ content, set, partnerId }: { content: Record<string, any>; set: (p: Record<string, any>) => void; partnerId?: string }) {
    return (
        <Tabs defaultValue="content" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
                <FieldRow label="Heading">
                    <Input value={content.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
                </FieldRow>
                <FieldRow label="Description">
                    <Textarea
                        value={content.description || ""}
                        onChange={(e) => set({ description: e.target.value })}
                        rows={4}
                    />
                </FieldRow>
                <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="CTA label">
                        <Input value={content.ctaLabel || ""} onChange={(e) => set({ ctaLabel: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="CTA link">
                        <Input value={content.ctaLink || ""} onChange={(e) => set({ ctaLink: e.target.value })} />
                    </FieldRow>
                </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-4">
                <ImageUploadField
                    label="Background image (optional)"
                    value={content.backgroundImage || ""}
                    onChange={(url) => set({ backgroundImage: url })}
                    partnerId={partnerId}
                    folder="storefront/cta"
                />
                <FieldRow label="Color variant">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: "primary", label: "Brand", preview: "bg-primary" },
                            { id: "dark", label: "Dark", preview: "bg-foreground" },
                            { id: "light", label: "Light", preview: "bg-secondary" },
                        ].map((v) => {
                            const sel = (content.variant || "primary") === v.id;
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => set({ variant: v.id })}
                                    className={cn(
                                        "flex flex-col items-center gap-2 rounded-lg border-2 p-2.5 text-xs font-bold transition",
                                        sel
                                            ? "border-primary bg-primary/5 text-primary"
                                            : "border-border bg-background text-muted-foreground hover:border-primary/40"
                                    )}
                                >
                                    <span className={cn("h-8 w-full rounded", v.preview)} />
                                    {v.label}
                                </button>
                            );
                        })}
                    </div>
                </FieldRow>
            </TabsContent>
        </Tabs>
    );
}

/* ================== TESTIMONIALS ================== */
function TestimonialsEditor({
    section,
    storefront,
    setStorefront,
}: {
    section: StorefrontSection;
    storefront: StorefrontData;
    setStorefront: React.Dispatch<React.SetStateAction<StorefrontData>>;
}) {
    const quotes = section.content.quotes || [];

    const updateSectionContent = (patch: Record<string, any>) => {
        setStorefront((prev) => ({
            ...prev,
            sections: prev.sections.map((s) =>
                s.id === section.id ? { ...s, content: { ...s.content, ...patch } } : s
            ),
        }));
    };

    const addQuote = () => {
        updateSectionContent({
            quotes: [...quotes, { id: uid(), name: "", text: "", rating: 5 }],
        });
    };

    const updateQuote = (quoteId: string, patch: Record<string, any>) => {
        updateSectionContent({
            quotes: quotes.map((q: any) => q.id === quoteId ? { ...q, ...patch } : q),
        });
    };

    const removeQuote = (quoteId: string) => {
        updateSectionContent({
            quotes: quotes.filter((q: any) => q.id !== quoteId),
        });
    };

    return (
        <div className="space-y-5">
            <FieldRow label="Section title">
                <Input
                    value={section.content.title || ""}
                    onChange={(e) => updateSectionContent({ title: e.target.value })}
                />
            </FieldRow>

            <div>
                <div className="mb-3 flex items-center justify-between">
                    <Label>Reviews - {quotes.length}</Label>
                    <Button size="sm" variant="outline" onClick={addQuote}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Review
                    </Button>
                </div>

                <div className="space-y-3">
                    {quotes.map((q: any, i: number) => (
                        <SubCard
                            key={q.id}
                            title={`Review ${i + 1}`}
                            onDelete={() => {
                                if (confirm("Delete review?")) removeQuote(q.id);
                            }}
                        >
                            <FieldRow label="Reviewer name">
                                <Input
                                    value={q.name}
                                    onChange={(e) => updateQuote(q.id, { name: e.target.value })}
                                />
                            </FieldRow>
                            <FieldRow label="Review text">
                                <Textarea
                                    value={q.text}
                                    onChange={(e) => updateQuote(q.id, { text: e.target.value })}
                                    rows={4}
                                />
                            </FieldRow>
                            <FieldRow label={`Rating - ${q.rating || 5}/5`}>
                                <Slider
                                    value={[q.rating || 5]}
                                    min={1}
                                    max={5}
                                    step={1}
                                    onValueChange={([v]) => updateQuote(q.id, { rating: v })}
                                />
                            </FieldRow>
                        </SubCard>
                    ))}

                    {quotes.length === 0 && (
                        <p className="rounded-xl border-2 border-dashed py-8 text-center text-xs text-muted-foreground">
                            No reviews yet.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ================== ABOUT ================== */
function AboutEditor({ content, set, partnerId }: { content: Record<string, any>; set: (p: Record<string, any>) => void; partnerId?: string }) {
    return (
        <div className="space-y-4">
            <ImageUploadField
                label="Image (optional)"
                value={content.image || ""}
                onChange={(url) => set({ image: url })}
                partnerId={partnerId}
                folder="storefront/about"
            />
            <FieldRow label="Heading">
                <Input value={content.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
            </FieldRow>
            <FieldRow label="Description">
                <Textarea
                    value={content.description || ""}
                    onChange={(e) => set({ description: e.target.value })}
                    rows={6}
                />
            </FieldRow>
        </div>
    );
}

/* ================== FOOTER ================== */
function FooterEditor({ content, set }: { content: Record<string, any>; set: (p: Record<string, any>) => void }) {
    return (
        <div className="space-y-4">
            <FieldRow label="Short description">
                <Textarea
                    value={content.description || ""}
                    onChange={(e) => set({ description: e.target.value })}
                    rows={3}
                    placeholder="One-line intro shown above contact info"
                />
            </FieldRow>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldRow label="Phone">
                    <Input value={content.phone || ""} onChange={(e) => set({ phone: e.target.value })} />
                </FieldRow>
                <FieldRow label="Email">
                    <Input value={content.email || ""} onChange={(e) => set({ email: e.target.value })} />
                </FieldRow>
            </div>
            <FieldRow label="Copyright">
                <Input value={content.copyright || ""} onChange={(e) => set({ copyright: e.target.value })} />
            </FieldRow>
        </div>
    );
}

/* ================== IMAGE UPLOAD WITH WEBP CONVERSION ================== */
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

function ImageUploadField({
    value,
    onChange,
    label,
    hint,
    partnerId,
    folder = "storefront",
}: {
    value: string;
    onChange: (url: string) => void;
    label: string;
    hint?: string;
    partnerId?: string;
    folder?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const webpData = await convertToWebp(file);
            const filename = `${partnerId || "general"}/${folder}/${Date.now()}.webp`;
            const url = await uploadFileToS3(webpData, filename);
            onChange(url);
            toast.success("Image uploaded");
        } catch (err) {
            console.error("Upload failed:", err);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <FieldRow label={label} hint={hint}>
            <input
                ref={inputRef}
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
                    onClick={() => inputRef.current?.click()}
                >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                    {uploading ? "Uploading..." : "Upload"}
                </Button>
                {value && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => onChange("")}
                    >
                        Remove
                    </Button>
                )}
            </div>
            {value && (
                <img src={value} alt="" className="mt-2 h-32 w-full rounded-lg object-cover ring-1 ring-black/5" />
            )}
        </FieldRow>
    );
}
