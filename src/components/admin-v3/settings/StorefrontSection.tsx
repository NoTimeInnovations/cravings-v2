"use client";

import * as React from "react";
import { Globe, Loader2, SquareArrowOutUpRight, Upload } from "lucide-react";
import { toast } from "sonner";

import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { BRAND_COLORS, DEFAULT_BRAND_COLOR_ID, brandColorToHex } from "@/lib/brandColor";
import { MENUSTYLES } from "@/components/hotelDetail/MenuStyleModal";
import { cn } from "@/lib/utils";

// Reused from admin-v2 rather than duplicated: it is a presentational component
// taking plain props, and it carries the seven real per-layout previews.
import { MobilePreview } from "@/components/admin-v2/settings/MobilePreview";
import { DomainEditor } from "./DomainEditor";
import { BrandMediaPage } from "./BrandMediaPage";
import {
  DEFAULT_PREVIEW_DATA,
  PreviewDataProvider,
  type PreviewData,
} from "@/components/admin-v2/settings/previews/sampleData";
import { useMenuStore } from "@/store/menuStore_hasura";
import { useAuthStore } from "@/store/authStore";

import { AdminV3Button, StatusPill } from "../ui/primitives";
import {
  FieldRow,
  Note,
  SettingsCard,
  TextField,
  ToggleRow,
  parseJson,
  useSectionDraft,
} from "./controls";

/* ------------------------------------------------------------------ draft */

/**
 * Hero-logo zoom, as a percent.
 *
 * The bounds must stay in step with lib/bannerLogo.ts, which normalises the
 * stored percent to a CSS factor of 0.5–5 — a value outside this range is
 * silently clamped there, so letting one be saved would just mislead.
 */
export const LOGO_SCALE_MIN = 50;
export const LOGO_SCALE_MAX = 500;
export const LOGO_SCALE_DEFAULT = 100;

export function clampLogoScale(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return LOGO_SCALE_DEFAULT;
  return Math.min(LOGO_SCALE_MAX, Math.max(LOGO_SCALE_MIN, Math.round(v)));
}

interface StorefrontDraft {
  store_banner: string;
  onboardingLogoFullScreen: boolean;
  announcement: string;
  menuStyle: string;
  brandColor: string;
  /** storefront_settings.bannerLogo — the V3 hero tile behind the logo. */
  bannerLogoScale: number;
  bannerLogoBgColor: string;
  showOpenStatus: boolean;
  cuisine: string;
  city: string;
  playstore: string;
  appstore: string;
}

function readSocial(raw: unknown): Record<string, any> {
  if (typeof raw === "string" && raw.trim() && !raw.trim().startsWith("{")) {
    return { instagram: raw.trim() };
  }
  return parseJson(raw);
}

function read(partner: any): StorefrontDraft {
  const sf = parseJson(partner?.storefront_settings);
  const theme = parseJson(partner?.theme);
  const rules = (partner?.delivery_rules || {}) as any;
  const info = sf?.infoPage || {};
  const social = readSocial(partner?.social_links);
  return {
    store_banner: partner?.store_banner || "",
    onboardingLogoFullScreen: !!sf?.onboardingLogoFullScreen,
    announcement: rules?.announcement || "",
    menuStyle: theme?.menuStyle || "default",
    bannerLogoScale: clampLogoScale(sf?.bannerLogo?.scale),
    bannerLogoBgColor:
      typeof sf?.bannerLogo?.bgColor === "string" ? sf.bannerLogo.bgColor : "",
    brandColor: theme?.brandColor || sf?.brandColor || DEFAULT_BRAND_COLOR_ID,
    showOpenStatus: info?.showOpenStatus !== false,
    cuisine: info?.cuisine || "",
    city: info?.city || "",
    playstore: social?.playstore || "",
    appstore: social?.appstore || "",
  };
}

function build(d: StorefrontDraft, partner: any): Record<string, unknown> {
  const sf = parseJson(partner?.storefront_settings);
  const theme = parseJson(partner?.theme);
  const rules = (partner?.delivery_rules || {}) as any;
  const social = readSocial(partner?.social_links);

  return {
    store_banner: d.store_banner || null,
    // Every blob here is shared with another section, so each one is merged, not
    // replaced: theme keeps its colours and checkout style, storefront_settings
    // keeps the schedule and language switcher, delivery_rules keeps the billing
    // config.
    theme: JSON.stringify({ ...theme, menuStyle: d.menuStyle, brandColor: d.brandColor }),
    storefront_settings: JSON.stringify({
      ...sf,
      onboardingLogoFullScreen: d.onboardingLogoFullScreen,
      bannerLogo: {
        scale: clampLogoScale(d.bannerLogoScale),
        bgColor: d.bannerLogoBgColor || "",
      },
      infoPage: {
        ...(sf?.infoPage || {}),
        showOpenStatus: d.showOpenStatus,
        cuisine: d.cuisine,
        city: d.city,
      },
    }),
    delivery_rules: { ...rules, announcement: d.announcement },
    social_links: { ...social, playstore: d.playstore, appstore: d.appstore },
  };
}

/* ------------------------------------------------------------------- tabs */

export type StorefrontTab = "brand" | "look" | "info" | "domain";

export const STOREFRONT_TABS: { value: StorefrontTab; label: string }[] = [
  { value: "brand", label: "Brand" },
  { value: "look", label: "Menu look" },
  { value: "info", label: "Info page" },
  { value: "domain", label: "Domain" },
];

const LAYOUT_NOTE: Record<string, string> = {
  default: "Photos first, one dish per row",
  compact: "Dense list, no photos",
  sidebar: "Categories pinned down the side",
  v3: "Cover image, then a scrolling menu",
  v4: "Cards with large photos",
  v5: "Zomato-style rows",
  v6: "Grocery grid",
};

/* ----------------------------------------------------------------- screen */

export function StorefrontSection({ tab }: { tab: StorefrontTab }) {
  const { partner, draft, patch } = useSectionDraft(read, build, "Storefront settings saved");
  const setPartnerState = useAuthStore((s) => s.setState);
  const [mediaOpen, setMediaOpen] = React.useState(false);
  const menuItems = useMenuStore((s) => s.items);
  const fetchMenu = useMenuStore((s) => s.fetchMenu);

  // The preview shows the partner's OWN menu, so it needs one to be loaded.
  // Other screens populate this store; landing straight on Appearance does not.
  React.useEffect(() => {
    if (tab === "look" && (!menuItems || menuItems.length === 0)) void fetchMenu();
  }, [tab, menuItems, fetchMenu]);

  // Leaving Brand drops the media page, or coming back reopens it.
  React.useEffect(() => {
    if (tab !== "brand" && mediaOpen) setMediaOpen(false);
  }, [tab, mediaOpen]);

  const customDomain = partner?.custom_domain || "";
  const username = partner?.username || "";

  if (tab === "brand" && mediaOpen) {
    return (
      <BrandMediaPage
        logoUrl={draft.store_banner}
        onLogoChange={(url) => patch({ store_banner: url })}
        logoScale={draft.bannerLogoScale}
        logoBgColor={draft.bannerLogoBgColor}
        onLogoStyleChange={(next) =>
          patch({
            ...(next.scale != null ? { bannerLogoScale: next.scale } : {}),
            ...(next.bgColor != null ? { bannerLogoBgColor: next.bgColor } : {}),
          })
        }
        onBack={() => setMediaOpen(false)}
      />
    );
  }

  if (tab === "brand") {
    return (
      <SettingsCard>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
            {draft.store_banner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.store_banner}
                alt="Store logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                None
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              Store logo
            </div>
            <div className="mt-1 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
              Square works best. Set it and your carousel banners here.
            </div>
          </div>
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3 text-[13px]"
            onClick={() => setMediaOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            {draft.store_banner ? "Update" : "Upload"}
          </AdminV3Button>
        </div>

        <ToggleRow
          title="Show the logo full-screen at onboarding"
          desc="Instead of the small badge."
          checked={draft.onboardingLogoFullScreen}
          onChange={(v) => patch({ onboardingLogoFullScreen: v })}
          divider
        />

        <FieldRow>
          <TextField
            label="Announcement bar"
            hint="blank hides it"
            value={draft.announcement}
            onChange={(v) => patch({ announcement: v.slice(0, 100) })}
            maxLength={100}
            placeholder="e.g. Free delivery over ₹500"
            basis="100%"
          />
        </FieldRow>
        <Note>
          The V3 hero-logo tint is still set in the classic dashboard — nothing
          here touches it.
        </Note>
      </SettingsCard>
    );
  }

  if (tab === "look") {
    const hex = brandColorToHex(draft.brandColor);
    const preset = BRAND_COLORS.find((c) => c.id === draft.brandColor);
    const isCustom = !preset;

    // The preview renders the partner's REAL theme. v3 only edits menuStyle and
    // brandColor, so text/background/font/grid come from the stored theme and
    // the accent follows the picker sitting next to it — the two controls this
    // screen actually owns are the two the preview reacts to.
    const theme = parseJson(partner?.theme);
    const themeColors = theme?.colors || {};
    const previewColors = {
      text: themeColors.text || "#000000",
      bg: themeColors.bg || "#F5F5F5",
      accent: hex,
    };

    /**
     * The partner's real store, menu and photos — the whole point of a preview.
     *
     * Falls back to the bundled samples while the menu is still loading or when
     * the store genuinely has no items yet: an empty phone would look broken and
     * would say nothing about the layout being chosen.
     */
    const real = (menuItems || []).filter((i) => i?.name);
    const previewData: PreviewData =
      real.length > 0
        ? {
            storeName: partner?.store_name || DEFAULT_PREVIEW_DATA.storeName,
            storeLocation:
              [partner?.district, partner?.state].filter(Boolean).join(", ") ||
              DEFAULT_PREVIEW_DATA.storeLocation,
            logoUrl: draft.store_banner || undefined,
            currency: partner?.currency || "\u20B9",
            categories: Array.from(
              new Map(
                real
                  .filter((i) => i.category?.name)
                  .map((i) => [
                    i.category!.id ?? i.category!.name,
                    { id: String(i.category!.id ?? i.category!.name), name: i.category!.name },
                  ]),
              ).values(),
            ).slice(0, 6),
            items: real.slice(0, 12).map((i) => ({
              id: String(i.id ?? i.name),
              name: i.name,
              price: String(i.price ?? 0),
              category: String(i.category?.id ?? i.category?.name ?? ""),
              hasImage: !!i.image_url,
              image: i.image_url || undefined,
              description: i.description || undefined,
            })),
            mustTry: real
              .filter((i) => i.is_top)
              .slice(0, 3)
              .map((i) => ({
                id: String(i.id ?? i.name),
                name: i.name,
                price: String(i.price ?? 0),
                category: String(i.category?.id ?? i.category?.name ?? ""),
                hasImage: !!i.image_url,
                image: i.image_url || undefined,
              })),
            }
        : DEFAULT_PREVIEW_DATA;

    // Several layouts key their sections off category ids, so a store whose
    // top-picks list is empty would render an empty "Must Try" strip.
    if (previewData.mustTry.length === 0) {
      previewData.mustTry = previewData.items.slice(0, 3);
    }

    return (
      <div className="flex flex-col-reverse gap-3.5 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
      <SettingsCard>
        <div>
          <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
            Menu layout
          </div>
          <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
            {MENUSTYLES.map((s) => {
              const on = s.id === draft.menuStyle;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => patch({ menuStyle: s.id })}
                  className={cn(
                    "rounded-lg border p-2.5 text-left transition-colors",
                    on
                      ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-800"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700",
                  )}
                >
                  <div className="text-[12.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                    {s.name}
                  </div>
                  <div className="mt-1.5 text-[12px] leading-[1.4] text-zinc-400 dark:text-zinc-500">
                    {LAYOUT_NOTE[s.id] || "Menu layout"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
            Brand colour
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {BRAND_COLORS.map((c) => {
              const on = c.id === draft.brandColor;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  onClick={() => patch({ brandColor: c.id })}
                  style={{ background: c.hex }}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform",
                    on
                      ? "border-zinc-900 scale-110 dark:border-zinc-50"
                      : "border-transparent hover:scale-105",
                  )}
                />
              );
            })}
          </div>
          {/* Custom colour. The `custom:#hex` token shape is what
              brandColorToHex already understands, so nothing downstream needed
              to change — v3 simply never exposed it. The native colour input is
              the swatch itself, so there is no second control to explain. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <label
              className={cn(
                "flex h-8 cursor-pointer items-center gap-2 rounded-full border-2 pl-1 pr-3 transition-colors",
                isCustom
                  ? "border-zinc-900 dark:border-zinc-50"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
              )}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-black/10"
                style={{ background: hex }}
              />
              <span className="text-[12px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                Custom
              </span>
              <input
                type="color"
                value={hex}
                onChange={(e) => patch({ brandColor: `custom:${e.target.value}` })}
                aria-label="Custom brand colour"
                className="sr-only"
              />
            </label>
          </div>

          <div className="mt-2 flex items-center gap-2 text-[12px] text-zinc-400 dark:text-zinc-500">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: hex }}
            />
            {preset ? preset.name : "Custom"} · {hex}
          </div>
        </div>
      </SettingsCard>
      </div>

      {/* Sticky so the phone stays beside the controls while the list scrolls. */}
      {/* No caption: it pushed the phone a row below the card it sits beside.
          The card's own heading already says what this is. */}
      <div className="flex shrink-0 justify-center lg:sticky lg:top-0 lg:justify-start">
        <PreviewDataProvider value={previewData}>
          <MobilePreview
            menuStyle={draft.menuStyle}
            colors={previewColors}
            fontFamily={theme?.fontFamily || "sans-serif"}
            showGrid={theme?.showGrid ?? false}
            frame="device"
            showLabel={false}
          />
        </PreviewDataProvider>
      </div>
      </div>
    );
  }

  if (tab === "info") {
    return (
      <SettingsCard>
        <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          What customers see when they scan a table QR.
        </div>
        <ToggleRow
          title="Show the open / hours pill"
          desc="Floats over the top right of the hero."
          checked={draft.showOpenStatus}
          onChange={(v) => patch({ showOpenStatus: v })}
          divider
        />
        <FieldRow>
          <TextField
            label="Cuisine"
            value={draft.cuisine}
            onChange={(v) => patch({ cuisine: v })}
            placeholder="Kerala · Seafood"
            translateNo
          />
          <TextField
            label="City"
            value={draft.city}
            onChange={(v) => patch({ city: v })}
            placeholder="Bengaluru"
            translateNo
          />
        </FieldRow>
        <FieldRow>
          <TextField
            label="Play Store link"
            hint="optional"
            value={draft.playstore}
            onChange={(v) => patch({ playstore: v })}
            placeholder="https://play.google.com/…"
            type="url"
            inputMode="url"
          />
          <TextField
            label="App Store link"
            hint="optional"
            value={draft.appstore}
            onChange={(v) => patch({ appstore: v })}
            placeholder="https://apps.apple.com/…"
            type="url"
            inputMode="url"
          />
        </FieldRow>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard>
      <div className="flex flex-wrap items-center gap-2.5">
        <Globe className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
        {customDomain || username ? (
          <a
            href={customDomain ? `https://${customDomain}` : `/${username}`}
            target="_blank"
            rel="noreferrer"
            translate="no"
            title="Open your storefront in a new tab"
            className="notranslate group flex min-w-0 flex-1 items-center gap-1.5 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 underline-offset-[3px] hover:underline dark:text-zinc-50"
          >
            <span className="truncate">
              {customDomain || `menuthere.com/${username}`}
            </span>
            <SquareArrowOutUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
          </a>
        ) : (
          <span className="flex-1 truncate text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            No storefront address
          </span>
        )}
        {customDomain ? (
          <StatusPill tone="green">Custom domain</StatusPill>
        ) : (
          <StatusPill tone="outline">Default address</StatusPill>
        )}
      </div>
      <DomainEditor
        partnerId={partner?.id}
        currentDomain={customDomain}
        onChanged={(d) => setPartnerState({ custom_domain: d || null } as any)}
      />
    </SettingsCard>
  );
}
