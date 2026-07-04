"use client";

import { Card, CardContent } from "@/components/ui/card";
import { GeneralSettings } from "./settings/GeneralSettings";
import { DeliverySettings } from "./settings/DeliverySettings";
import { PaymentLegalSettings } from "./settings/PaymentLegalSettings";
import { FeatureSettings } from "./settings/FeatureSettings";
import { DiscountCodeSettings } from "./settings/DiscountCodeSettings";
import { ThemeSettings } from "./settings/ThemeSettings";
import { StorefrontSettings } from "./settings/StorefrontSettings";
import { InfoPageSettings } from "./settings/InfoPageSettings";
import { PrebookingSettings } from "./settings/PrebookingSettings";
import { SlotBookingSettings } from "./settings/SlotBookingSettings";
import { OrderTypesSettings } from "./settings/OrderTypesSettings";
import { BrandingSettings } from "./settings/BrandingSettings";
import { IntegrationsSettings } from "./settings/IntegrationsSettings";
import { LoyaltyPointsSettings } from "./settings/LoyaltyPointsSettings";

import { Button } from "@/components/ui/button";
import {
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Store,
    ShoppingBag,
    CalendarClock,
    Palette,
    SlidersHorizontal,
    Plug,
    Gift,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { Loader2, Save } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function FloatingSaveButton() {
    const { saveAction, isSaving, hasChanges } = useAdminSettingsStore();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(!!(saveAction && hasChanges));
    }, [saveAction, hasChanges]);

    if (!isVisible || !saveAction) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <Button
                onClick={saveAction}
                disabled={isSaving}
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-xl rounded-full h-12 px-6"
            >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                <span className="font-semibold">Save Changes</span>
            </Button>
        </div>
    );
}

interface SettingsSection {
    key: string;
    label: string;
    Component: ComponentType;
}
interface SettingsGroup {
    key: string;
    label: string;
    desc: string;
    icon: ComponentType<{ className?: string }>;
    sections: SettingsSection[];
}

export function AdminV2Settings() {
    const { userData, features } = useAuthStore();

    const showOrderRelatedSettings = features?.ordering?.access || features?.delivery?.access;
    const showDiscountSettings = features?.ordering?.access || features?.delivery?.access;
    const showPrebookingGroup = features?.prebooking?.access && features?.prebooking?.enabled;
    const showStorefront = features?.storefront?.access && features?.storefront?.enabled;
    const showLoyalty = features?.loyalty_points?.access;

    const username = (userData as any)?.username;
    const firstQrCodeId = (userData as any)?.qr_codes?.[0]?.id;
    const hotelNameSlug = (userData as any)?.name?.replace(/ /g, "-");

    const handleViewMenu = () => {
        if (username) {
            window.open(`https://menuthere.com/${username}`, "_blank");
        } else if (hotelNameSlug && firstQrCodeId) {
            window.open(`https://menuthere.com/qrScan/${hotelNameSlug}/${firstQrCodeId}`, "_blank");
        }
    };

    // Group → section model. Only sections whose feature gate passes are included;
    // groups with no sections are dropped. Each section renders exactly one
    // settings component (one active save action at a time).
    const groups: SettingsGroup[] = [
        {
            key: "store",
            label: "Store",
            desc: "Store details, location, contacts & integrations",
            icon: Store,
            sections: [{ key: "general", label: "General", Component: GeneralSettings }],
        },
        {
            key: "ordering",
            label: "Ordering",
            desc: "Order types, delivery, payments & discounts",
            icon: ShoppingBag,
            sections: showOrderRelatedSettings
                ? [
                      { key: "order-types", label: "Order Types", Component: OrderTypesSettings },
                      { key: "delivery", label: "Delivery", Component: DeliverySettings },
                      { key: "payment", label: "Payment & Legal", Component: PaymentLegalSettings },
                      ...(showDiscountSettings
                          ? [{ key: "discounts", label: "Discounts", Component: DiscountCodeSettings }]
                          : []),
                  ]
                : [],
        },
        {
            key: "prebooking",
            label: "Prebooking",
            desc: "Scheduled orders & dine-in table slots",
            icon: CalendarClock,
            sections: showPrebookingGroup
                ? [
                      { key: "prebooking", label: "Prebooking", Component: PrebookingSettings },
                      { key: "slot-booking", label: "Slot Booking", Component: SlotBookingSettings },
                  ]
                : [],
        },
        {
            key: "appearance",
            label: "Appearance",
            desc: "Branding, menu theme, storefront builder & QR info page",
            icon: Palette,
            sections: [
                { key: "branding", label: "Branding", Component: BrandingSettings },
                { key: "theme", label: "Theme", Component: ThemeSettings },
                ...(showStorefront ? [{ key: "storefront", label: "Storefront", Component: StorefrontSettings }] : []),
                { key: "info-page", label: "Info Page", Component: InfoPageSettings },
            ],
        },
        {
            key: "integrations",
            label: "Integrations",
            desc: "Google Business, WhatsApp, Google Tag Manager & delivery platforms",
            icon: Plug,
            sections: [{ key: "integrations", label: "Integrations", Component: IntegrationsSettings }],
        },
        {
            key: "loyalty",
            label: "Loyalty",
            desc: "Points customers earn & redeem at your store",
            icon: Gift,
            sections: showLoyalty
                ? [{ key: "loyalty-points", label: "Loyalty Points", Component: LoyaltyPointsSettings }]
                : [],
        },
        {
            key: "features",
            label: "Features",
            desc: "Enable or disable features for your store",
            icon: SlidersHorizontal,
            sections: [{ key: "features", label: "Features", Component: FeatureSettings }],
        },
    ].filter((g) => g.sections.length > 0);

    const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
    const [activeSectionKey, setActiveSectionKey] = useState<string>("");

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // Signature of the last sg/ss pair we applied from the URL. Lets us re-apply
    // whenever those params CHANGE (initial deep-link, later external navigations
    // like the dashboard's "Set up"/"Connect" CTAs, browser back/forward) instead
    // of only once — while staying inert for internal navigation, which writes a
    // matching sg/ss via writeUrl (same signature ⇒ no-op, no loop).
    const lastAppliedRef = useRef<string>("");

    // Persist the open group/section in the URL (sg = settings group, ss = settings
    // section) so a reload restores the exact settings screen instead of the home grid.
    // Other params (notably ?view=Settings set by the admin page) are preserved.
    const writeUrl = (groupKey: string | null, sectionKey: string | null) => {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        if (groupKey) params.set("sg", groupKey); else params.delete("sg");
        if (sectionKey) params.set("ss", sectionKey); else params.delete("ss");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Apply the URL's group/section into local state whenever sg/ss change (and
    // once the feature-gated groups have loaded — features arrive asynchronously,
    // so we wait until groups is populated before validating keys). Keyed only on
    // the URL params (not on active*Key) so it never races internal writes: it
    // acts once per distinct sg/ss signature. A missing sg leaves the current
    // in-session group untouched (so closing to the home grid isn't re-opened).
    useEffect(() => {
        if (groups.length === 0) return;
        const sg = searchParams.get("sg") || "";
        const ss = searchParams.get("ss") || "";
        const sig = `${sg}|${ss}`;
        if (sig === lastAppliedRef.current) return;
        lastAppliedRef.current = sig;
        if (!sg) return;
        const grp = groups.find((g) => g.key === sg);
        if (!grp) return;
        setActiveGroupKey(grp.key);
        const valid = grp.sections.some((s) => s.key === ss);
        setActiveSectionKey(valid ? ss : grp.sections[0]?.key ?? "");
    }, [groups, searchParams]);

    const activeGroup = groups.find((g) => g.key === activeGroupKey) ?? null;
    const activeSection =
        activeGroup?.sections.find((s) => s.key === activeSectionKey) ?? activeGroup?.sections[0] ?? null;

    const openGroup = (g: SettingsGroup) => {
        const sectionKey = g.sections[0]?.key ?? "";
        setActiveGroupKey(g.key);
        setActiveSectionKey(sectionKey);
        writeUrl(g.key, sectionKey || null);
    };

    const closeGroup = () => {
        setActiveGroupKey(null);
        writeUrl(null, null);
    };

    const selectSection = (sectionKey: string) => {
        setActiveSectionKey(sectionKey);
        writeUrl(activeGroupKey, sectionKey);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-24 w-full lg:max-w-[80%] mx-auto px-2 sm:px-4 lg:px-0">
            <div className="flex items-center justify-between gap-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">Manage your store configurations.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewMenu}
                    className="flex items-center gap-2 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 shrink-0"
                >
                    <ExternalLink className="h-4 w-4" />
                    <span className="inline">View Menu</span>
                </Button>
            </div>

            {/* HOME — group cards */}
            {!activeGroup && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {groups.map((g) => {
                        const Icon = g.icon;
                        return (
                            <button key={g.key} type="button" onClick={() => openGroup(g)} className="text-left">
                                <Card className="h-full transition-colors hover:border-orange-300 hover:bg-orange-50/30">
                                    <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                                        <div className="h-11 w-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold">{g.label}</div>
                                            <div className="text-sm text-muted-foreground">{g.desc}</div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    </CardContent>
                                </Card>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* GROUP — back + (segmented section switcher) + active section */}
            {activeGroup && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={closeGroup} className="gap-1 px-2">
                            <ChevronLeft className="h-4 w-4" />
                            Settings
                        </Button>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-semibold">{activeGroup.label}</span>
                    </div>

                    {activeGroup.sections.length > 1 && (
                        <div className="inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-1 gap-1">
                            {activeGroup.sections.map((s) => {
                                const selected = s.key === activeSection?.key;
                                return (
                                    <button
                                        key={s.key}
                                        type="button"
                                        onClick={() => selectSection(s.key)}
                                        className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                            selected
                                                ? "bg-background text-foreground shadow"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {activeSection && (
                        <div className="space-y-4">
                            <activeSection.Component />
                        </div>
                    )}
                </div>
            )}

            <FloatingSaveButton />
        </div>
    );
}
