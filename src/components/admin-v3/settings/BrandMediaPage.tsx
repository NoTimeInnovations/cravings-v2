"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { updatePartner } from "@/api/partners";
import { deleteFileFromS3, uploadFileToS3 } from "@/app/actions/aws-s3";
import { revalidateTag } from "@/app/actions/revalidate";
import BannerEditor from "@/components/BannerEditor";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

import { AdminV3Button, StatusPill } from "../ui/primitives";
import { Note, SettingsCard, useDeclareSubPage } from "./controls";
import {
  LOGO_SCALE_DEFAULT,
  LOGO_SCALE_MAX,
  LOGO_SCALE_MIN,
} from "./StorefrontSection";

/**
 * Store logo + the storefront's carousel banners.
 *
 * A sub-page rather than a row on the Brand tab: these are large images that
 * want room to be seen, and the carousel needs a preview to be judged at all.
 *
 * Same storage admin-v2 uses — `partners.store_banner` for the logo, and
 * `delivery_rules.carousel_banners` (max 5) with `banner_mode` kept in step for
 * legacy readers. Uploads write straight away rather than through the section's
 * Save button: the file is already in S3 by then, so leaving the row unsaved
 * would just orphan it.
 */

const MAX_BANNERS = 5;

/**
 * Open an already-saved image through our own origin.
 *
 * The editor exports the canvas with toDataURL(), and drawing a cross-origin
 * image taints the canvas so that export throws — which is exactly what
 * re-editing a saved S3 image did. Freshly picked files are blob: URLs and
 * already same-origin, so they are handed through untouched.
 */
function editableUrl(url: string): string {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) return url;
  return `/api/s3-image?url=${encodeURIComponent(url)}`;
}

function readBanners(partner: any): string[] {
  const raw = (partner?.delivery_rules as any)?.carousel_banners;
  return Array.isArray(raw) ? raw.filter((u) => typeof u === "string" && u) : [];
}

/**
 * The image editor as a sub-page.
 *
 * Split out so it can call useDeclareSubPage on its own — the breadcrumb has to
 * read "… / Edit image" only while the editor is up, and a hook cannot be
 * called conditionally inside BrandMediaPage.
 */
function BannerEditorPage({
  url,
  isLogo,
  onCancel,
  onComplete,
  onReplace,
}: {
  url: string;
  isLogo: boolean;
  onCancel: () => void;
  onComplete: (dataUrl: string) => void;
  /** Swap the image being edited for a different file, keeping the target. */
  onReplace: (file: File) => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  useDeclareSubPage({
    title: isLogo ? "Edit logo" : "Edit banner",
    hint: "Crop it, drag it into place, and give it a background. Saving uploads the result.",
    onBack: onCancel,
  });

  return (
    <BannerEditor
      isOpen
      variant="page"
      imageUrl={url}
      onClose={onCancel}
      onComplete={onComplete}
      toolbarExtra={
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onReplace(file);
            }}
          />
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3 text-[13px]"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Update
          </AdminV3Button>
        </>
      }
    />
  );
}

export function BrandMediaPage({
  logoUrl,
  onLogoChange,
  logoScale,
  logoBgColor,
  onLogoStyleChange,
  onBack,
}: {
  /** The draft's value, so the page shows an unsaved logo the tab just picked. */
  logoUrl: string;
  onLogoChange: (url: string) => void;
  logoScale: number;
  logoBgColor: string;
  onLogoStyleChange: (next: { scale?: number; bgColor?: string }) => void;
  onBack: () => void;
}) {
  useDeclareSubPage({
    title: "Logo & banners",
    hint: "The logo on your menu and bills, and the banners that run across the top of your storefront.",
    onBack,
  });

  const { userData, setState } = useAuthStore();
  const partner = userData as any;

  const [banners, setBanners] = React.useState<string[]>(() => readBanners(partner));
  const [logoBusy, setLogoBusy] = React.useState(false);
  const [bannerBusy, setBannerBusy] = React.useState(false);
  const [slide, setSlide] = React.useState(0);

  const logoRef = React.useRef<HTMLInputElement>(null);
  const bannerRef = React.useRef<HTMLInputElement>(null);

  /**
   * Every image goes through BannerEditor before it is uploaded — the same
   * crop / background-colour / drag-to-move editor admin-v2 uses. It composites
   * to a data URL, so the framing is baked into the file rather than needing a
   * per-image style the storefront would also have to learn to read.
   *
   * `target` is what the result replaces: the logo, a new banner, or the banner
   * at that index when re-editing one.
   */
  const [editor, setEditor] = React.useState<
    | { url: string; target: "logo" }
    | { url: string; target: "banner-new" }
    | { url: string; target: "banner"; index: number }
    | null
  >(null);

  /**
   * Close the editor, releasing the blob URL a freshly-picked file was opened
   * from. Re-editing an existing banner passes an https URL, which must NOT be
   * revoked — hence the scheme check.
   */
  const closeEditor = React.useCallback(() => {
    setEditor((cur) => {
      if (cur?.url.startsWith("blob:")) URL.revokeObjectURL(cur.url);
      return null;
    });
  }, []);

  /** Upload whatever the editor composited, and hand back the S3 url. */
  const uploadEdited = async (dataUrl: string, prefix: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    const ext = blob.type.split("/")[1] || "png";
    const url = await uploadFileToS3(
      blob,
      `${prefix}/${partner.id}_${Date.now()}.${ext}`,
    );
    if (!url) throw new Error("Upload failed");
    return url;
  };

  // Keep the visible slide inside the list after a removal.
  React.useEffect(() => {
    if (slide > banners.length - 1) setSlide(Math.max(0, banners.length - 1));
  }, [banners.length, slide]);

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !partner?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setEditor({ url: URL.createObjectURL(file), target: "logo" });
  };

  /** Write the list to delivery_rules — read-modify-write, it is a shared blob. */
  const persistBanners = async (next: string[]) => {
    const rules = {
      ...(partner?.delivery_rules || {}),
      carousel_banners: next,
      // Kept in step for readers that still branch on the old mode flag.
      banner_mode: next.length > 0 ? "carousel" : "single",
    };
    await updatePartner(partner.id, { delivery_rules: rules });
    await revalidateTag(partner.id);
    setState({ delivery_rules: rules } as any);
  };

  const addBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !partner?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (banners.length >= MAX_BANNERS) {
      toast.error(`You can have up to ${MAX_BANNERS} banners`);
      return;
    }
    setEditor({ url: URL.createObjectURL(file), target: "banner-new" });
  };

  /** Everything the editor can finish: a new logo, a new banner, or a re-edit. */
  const applyEdited = async (dataUrl: string) => {
    const target = editor;
    closeEditor();
    if (!target || !partner?.id) return;
    const isLogo = target.target === "logo";
    (isLogo ? setLogoBusy : setBannerBusy)(true);
    try {
      const url = await uploadEdited(
        dataUrl,
        isLogo ? "store_logos" : "carousel_banners",
      );
      if (isLogo) {
        onLogoChange(url);
        toast.success("Logo updated — press Save to apply");
        return;
      }
      const next =
        target.target === "banner"
          ? banners.map((b, i) => (i === target.index ? url : b))
          : [...banners, url];
      const replaced = target.target === "banner" ? banners[target.index] : null;
      setBanners(next);
      await persistBanners(next);
      setSlide(target.target === "banner" ? target.index : next.length - 1);
      // The old file is only ours to bin once the new list is safely stored.
      if (replaced?.includes("cravingsbucket")) {
        await deleteFileFromS3(replaced).catch(() => {});
      }
      toast.success(target.target === "banner" ? "Banner updated" : "Banner added");
    } catch (err) {
      console.error("[v3 brand] edited upload failed:", err);
      toast.error("Could not save the image");
    } finally {
      (isLogo ? setLogoBusy : setBannerBusy)(false);
    }
  };

  const removeBanner = async (index: number) => {
    if (!partner?.id) return;
    const ok = await confirmDialog({
      title: "Remove this banner?",
      description: "It stops showing on your storefront straight away.",
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    const target = banners[index];
    const next = banners.filter((_, i) => i !== index);
    setBanners(next);
    try {
      await persistBanners(next);
      // Only our own uploads are ours to delete — a pasted URL may be shared.
      if (target?.includes("cravingsbucket")) {
        await deleteFileFromS3(target).catch(() => {});
      }
      toast.success("Banner removed");
    } catch (err) {
      console.error("[v3 brand] banner remove failed:", err);
      setBanners(banners);
      toast.error("Could not remove the banner");
    }
  };

  if (editor) {
    return (
      <BannerEditorPage
        url={editor.url}
        isLogo={editor.target === "logo"}
        onCancel={closeEditor}
        onComplete={(dataUrl) => void applyEdited(dataUrl)}
        onReplace={(file) => {
          if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file");
            return;
          }
          setEditor((cur) => {
            if (!cur) return cur;
            // Release the previous blob before swapping, or picking a few files
            // in a row leaks one each time.
            if (cur.url.startsWith("blob:")) URL.revokeObjectURL(cur.url);
            return { ...cur, url: URL.createObjectURL(file) };
          });
        }}
      />
    );
  }

  return (
    <>
      <SettingsCard title="Store logo">
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Store logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                None
              </span>
            )}
          </div>
          <div className="min-w-0 flex-[1_1_200px]">
            <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              Square works best
            </div>
            <div className="mt-1 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
              Used on the menu header, the onboarding screen and your bills.
            </div>
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickLogo}
          />
          {/* One control. With a logo set it opens the editor, which carries its
              own Update for swapping the file — a second button here just asked
              the same question twice. */}
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3 text-[13px]"
            disabled={logoBusy}
            onClick={() =>
              logoUrl
                ? setEditor({ url: editableUrl(logoUrl), target: "logo" })
                : logoRef.current?.click()
            }
          >
            {logoBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : logoUrl ? (
              <Pencil className="h-3.5 w-3.5" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {logoUrl ? "Edit" : "Upload"}
          </AdminV3Button>
        </div>
      </SettingsCard>

      {logoUrl ? (
        <SettingsCard title="Logo tile">
          <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
            How the logo sits in the hero tile at the top of your menu — the
            colour behind it, and how far it is zoomed in.
          </div>

          <div className="flex flex-wrap items-start gap-4">
            {/* Live tile. Same object-contain + transform the storefront uses,
                so what is set here is what a customer sees. */}
            <div className="shrink-0">
              <div
                className="flex h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-2xl ring-1 ring-black/5"
                style={{ background: logoBgColor || "#ffffff" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  style={{ transform: `scale(${logoScale / 100})` }}
                />
              </div>
              <div className="mt-1.5 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                Preview
              </div>
            </div>

            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5">
              <div>
                <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                  Background
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="flex h-8 cursor-pointer items-center gap-2 rounded-full border-2 border-zinc-200 pl-1 pr-3 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600">
                    <span
                      className="h-6 w-6 shrink-0 rounded-full border border-black/10"
                      style={{ background: logoBgColor || "#ffffff" }}
                    />
                    <span className="text-[12px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                      Pick a colour
                    </span>
                    <input
                      type="color"
                      value={logoBgColor || "#ffffff"}
                      onChange={(e) => onLogoStyleChange({ bgColor: e.target.value })}
                      aria-label="Logo tile background colour"
                      className="sr-only"
                    />
                  </label>
                  <input
                    type="text"
                    translate="no"
                    value={logoBgColor}
                    onChange={(e) => onLogoStyleChange({ bgColor: e.target.value })}
                    placeholder="#ffffff"
                    className="notranslate h-8 w-[110px] rounded-md border border-zinc-200 bg-white px-2.5 font-mono text-[12px] leading-none text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                  {logoBgColor ? (
                    <button
                      type="button"
                      onClick={() => onLogoStyleChange({ bgColor: "" })}
                      className="text-[12px] font-medium text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                    Zoom
                  </span>
                  <span className="text-[12px] tabular-nums text-zinc-400 dark:text-zinc-500">
                    {logoScale}%
                  </span>
                  {logoScale !== LOGO_SCALE_DEFAULT ? (
                    <button
                      type="button"
                      onClick={() => onLogoStyleChange({ scale: LOGO_SCALE_DEFAULT })}
                      className="text-[12px] font-medium text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
                <input
                  type="range"
                  min={LOGO_SCALE_MIN}
                  max={LOGO_SCALE_MAX}
                  step={5}
                  value={logoScale}
                  onChange={(e) => onLogoStyleChange({ scale: Number(e.target.value) })}
                  aria-label="Logo zoom"
                  className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-900 dark:bg-zinc-700 dark:accent-zinc-50"
                />
              </div>
            </div>
          </div>

          <Note>
            This tile is used by the V3 menu, the splash screen and the V4
            website. Zoom past 100% to crop into a logo with too much padding.
          </Note>
        </SettingsCard>
      ) : null}

      <SettingsCard
        title="Banner carousel"
        meta={
          <StatusPill tone={banners.length > 0 ? "green" : "outline"}>
            {banners.length}/{MAX_BANNERS}
          </StatusPill>
        }
      >
        <div className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          Wide images that rotate across the top of your storefront. Landscape
          works best — roughly 3:1.
        </div>

        {/* Preview — what a customer actually sees, one slide at a time. */}
        {banners.length > 0 ? (
          <div>
            <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banners[slide]}
                alt={`Banner ${slide + 1}`}
                className="aspect-[3/1] w-full object-cover"
              />
              {banners.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Previous banner"
                    onClick={() => setSlide((s) => (s - 1 + banners.length) % banners.length)}
                    className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm transition-colors hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next banner"
                    onClick={() => setSlide((s) => (s + 1) % banners.length)}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm transition-colors hover:bg-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
                    {banners.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Show banner ${i + 1}`}
                        onClick={() => setSlide(i)}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          i === slide ? "w-4 bg-white" : "w-1.5 bg-white/60",
                        )}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* The list, each with its own remove. */}
        <div className="flex flex-wrap gap-2.5">
          {banners.map((url, i) => (
            <div
              key={url}
              className={cn(
                "group relative h-[52px] w-[104px] shrink-0 overflow-hidden rounded-lg border transition-colors",
                i === slide
                  ? "border-zinc-900 dark:border-zinc-50"
                  : "border-zinc-200 dark:border-zinc-700",
              )}
            >
              <button
                type="button"
                onClick={() => setSlide(i)}
                aria-label={`Preview banner ${i + 1}`}
                className="block h-full w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
              <div className="absolute right-1 top-1 flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setEditor({ url: editableUrl(url), target: "banner", index: i })
                  }
                  aria-label={`Edit banner ${i + 1}`}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-zinc-500 shadow-sm transition-colors hover:bg-white hover:text-zinc-900"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void removeBanner(i)}
                  aria-label={`Remove banner ${i + 1}`}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-zinc-500 shadow-sm transition-colors hover:bg-white hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={addBanner}
          />
          {banners.length < MAX_BANNERS ? (
            <button
              type="button"
              disabled={bannerBusy}
              onClick={() => bannerRef.current?.click()}
              className="flex h-[52px] w-[104px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-600 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
            >
              {bannerBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              <span className="text-[11px] font-medium leading-none">
                {bannerBusy ? "Uploading…" : "Add banner"}
              </span>
            </button>
          ) : null}
        </div>

        <Note>
          Banners save as soon as they upload — they are not part of the Save
          button above. With none set, your storefront shows the logo instead.
        </Note>
      </SettingsCard>

    </>
  );
}
