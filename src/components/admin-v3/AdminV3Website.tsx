"use client";

import * as React from "react";
import {
  Check,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Loader2,
  MapPin,
  Plus,
  Save,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Partner, useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getMenu } from "@/api/menu";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import {
  DEFAULT_WEBSITE_CONFIG,
  mergeWebsiteConfig,
  type WebsiteConfig,
} from "@/types/website";
import {
  placesAutocomplete,
  type PlacePrediction,
} from "@/app/actions/placesAutocomplete";
import { fetchWebsiteDataFromGoogle } from "@/app/actions/fetchWebsiteDataFromGoogle";

import { AdminV3Button, StatusPill, V3Card } from "./ui/primitives";

/**
 * admin-v3 Website — the public landing page editor.
 *
 * Same data path as admin-v2's Website screen: the whole page lives in the
 * partner row's `website_config` JSON (src/types/website.ts), edited locally and
 * written back with updatePartner → revalidateTag → authStore.setState. The
 * Google import reuses the identical server action the signup flow uses, and it
 * saves immediately because it overwrites everything.
 *
 * The v2 screen was a strip of eight tabs; this one is the design's two-pane
 * shape — every section listed once in PAGE ORDER on the left with its on/off
 * switch, the editor for the selected one on the right. The section list is the
 * same set v2 exposed (v2 had tabs for exactly these seven plus Theme); the
 * config type carries more sections (marquee, story, tips, extras,
 * more_favorites) but WebsitePageV4 does not render them, so exposing them here
 * would be an editor for nothing.
 *
 * Save is local to this screen rather than admin-v2's `useAdminSettingsStore`
 * floating button: the v3 shell does not mount that button, so registering a
 * save action there would leave the screen with no way to save.
 */

/* ------------------------------------------------------------------ types */

type SectionKey =
  | "hero"
  | "menu"
  | "why_choose_us"
  | "gallery"
  | "most_ordered"
  | "visit"
  | "footer";

type Selection = SectionKey | "theme";

interface MenuItemRow {
  id: string;
  name: string;
  category?: { id: string; name: string } | null;
}

interface CategoryRow {
  id: string;
  name: string;
  items: MenuItemRow[];
}

const SECTIONS: { key: SectionKey; name: string; hint: string }[] = [
  { key: "hero", name: "Hero", hint: "The big headline at the top of the page." },
  { key: "menu", name: "Menu", hint: "Pick which categories and dishes get featured." },
  { key: "why_choose_us", name: "Highlights", hint: "What sets you apart, each with a supporting quote." },
  { key: "gallery", name: "Gallery", hint: "Photos of the room, the plates, the people." },
  { key: "most_ordered", name: "Favourites", hint: "The dishes guests keep coming back for." },
  { key: "visit", name: "Visit", hint: "Address, opening hours and how to reach you." },
  { key: "footer", name: "Footer", hint: "Policy links and the copyright line." },
];

function parseJson(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return typeof v === "object" && v ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : null;
}

/* ------------------------------------------------------------ form atoms */

const INPUT_CLASS =
  "h-9 w-full min-w-0 rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal leading-none text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

const TEXTAREA_CLASS =
  "min-h-[70px] w-full min-w-0 resize-y rounded-md border border-zinc-200 bg-white px-[11px] py-[9px] text-[13px] font-normal leading-[1.55] text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

/** One labelled control. `hint` is the muted note beside the label. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-[1_1_200px]">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
        {hint ? (
          <span className="text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
            {hint}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** The design's field rows: wrap, 12px gap, each child flex 1 1 200px. */
function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}

/** A sub-group separated by a hairline, e.g. "Quick facts", "Opening hours". */
function Block({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-0 flex-[1_1_auto]">
          <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
            {title}
          </div>
          {hint ? (
            <div className="mt-1 text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
              {hint}
            </div>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** 34px secondary button — the design's "Add row" / "Choose image" size. */
function SmallAction({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <AdminV3Button
      type="button"
      variant="secondary"
      {...props}
      className={cn("h-[34px] shrink-0 px-3 text-[13px]", props.className)}
    >
      {children}
    </AdminV3Button>
  );
}

/** 30px square remove button that turns red on hover. */
function RemoveButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-transparent text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
    >
      <X size={14} strokeWidth={1.9} />
    </button>
  );
}

function IndexBadge({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-zinc-200 bg-zinc-100 text-[11.5px] font-semibold leading-none text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {n}
    </span>
  );
}

function EmptyRows({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mt-2.5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3.5 py-[22px] text-center dark:border-zinc-700 dark:bg-zinc-800/40">
      <div className="text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
        {title}
      </div>
      <div className="mt-1.5 text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
        {hint}
      </div>
    </div>
  );
}

/** The 34x20 pill switch used on every section row. */
function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-5 w-[34px] shrink-0 items-center rounded-full p-0.5 transition-colors",
        on
          ? "justify-end bg-zinc-900 dark:bg-zinc-50"
          : "justify-start bg-zinc-200 dark:bg-zinc-700",
      )}
    >
      <span
        className={cn(
          "h-4 w-4 rounded-full bg-white",
          on && "dark:bg-zinc-900",
        )}
      />
    </button>
  );
}

/**
 * Image control. Uploads straight to the partner's S3 via the same server
 * action ImageUpload uses in v2, so the stored URL is identical.
 */
function ImagePicker({
  value,
  onChange,
  folder,
  size = "button",
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  /** "button" = labelled Choose image button; "thumb" = 36px square tile. */
  size?: "button" | "thumb";
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const url = await uploadFileToS3(dataUrl, `${folder}/${Date.now()}-${file.name}`);
      onChange(url as string);
    } catch (e) {
      console.error("[V3 Website] image upload failed", e);
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = "";
      }}
    />
  );

  if (size === "thumb") {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={value ? "Replace photo" : "Choose photo"}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 text-zinc-400 transition-colors hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700"
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={15} strokeWidth={1.7} />
          )}
        </button>
        {picker}
      </>
    );
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        {value ? (
          <span className="relative block h-[34px] w-[52px] overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
          </span>
        ) : null}
        <SmallAction onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <ImageIcon size={15} strokeWidth={1.7} className="text-zinc-500 dark:text-zinc-400" />
          )}
          {value ? "Replace image" : "Choose image"}
        </SmallAction>
        {value ? <RemoveButton label="Remove image" onClick={() => onChange("")} /> : null}
      </div>
      {picker}
    </>
  );
}

/* ------------------------------------------------------------- the screen */

export function AdminV3Website() {
  const { userData, setState } = useAuthStore();
  const partner = userData as Partner | undefined;
  const partnerId = partner?.id;
  const username = partner?.username;
  const storeName = partner?.store_name || "";

  const [config, setConfig] = React.useState<WebsiteConfig>(DEFAULT_WEBSITE_CONFIG);
  const [categories, setCategories] = React.useState<CategoryRow[]>([]);
  const [sel, setSel] = React.useState<Selection>("hero");
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  /* ---- load: website_config, with v2's storefront_settings.website fallback */
  React.useEffect(() => {
    if (!partner) return;
    const direct = parseJson(partner.website_config);
    if (direct) {
      setConfig(mergeWebsiteConfig(direct as Partial<WebsiteConfig>));
    } else {
      const settings = parseJson(partner.storefront_settings) || {};
      setConfig(
        mergeWebsiteConfig((settings.website as Partial<WebsiteConfig>) ?? null),
      );
    }
    setDirty(false);
  }, [partner]);

  /* ---- load: menu, grouped into categories for the Menu section picker */
  React.useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    fetchFromHasura(getMenu, { partner_id: partnerId })
      .then((res: { menu?: MenuItemRow[] }) => {
        if (cancelled) return;
        const map: Record<string, CategoryRow> = {};
        (res?.menu ?? []).forEach((m) => {
          const c = m.category;
          if (!c?.id) return;
          if (!map[c.id]) map[c.id] = { id: c.id, name: c.name, items: [] };
          map[c.id].items.push(m);
        });
        setCategories(Object.values(map));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  const patch = React.useCallback(
    <K extends keyof WebsiteConfig>(key: K, value: Partial<WebsiteConfig[K]>) => {
      setConfig((prev) => ({
        ...prev,
        [key]: { ...(prev[key] as object), ...value },
      }));
      setDirty(true);
    },
    [],
  );

  /** Section on/off. Kept off `patch` so the generic doesn't have to unify
   *  seven differently-shaped section types just to flip one boolean. */
  const setSectionEnabled = React.useCallback(
    (key: SectionKey, enabled: boolean) => {
      setConfig((prev) => ({
        ...prev,
        [key]: { ...(prev[key] as object), enabled },
      }));
      setDirty(true);
    },
    [],
  );

  const persist = React.useCallback(
    async (next: WebsiteConfig) => {
      if (!partnerId) return;
      setSaving(true);
      try {
        await updatePartner(partnerId, { website_config: next });
        revalidateTag(partnerId);
        setState({ website_config: next });
        setConfig(next);
        setDirty(false);
        toast.success("Website saved");
      } catch (e) {
        console.error("[V3 Website] save failed", e);
        toast.error("Couldn't save your website");
      } finally {
        setSaving(false);
      }
    },
    [partnerId, setState],
  );

  const handlePublishToggle = () => {
    persist({ ...config, enabled: !config.enabled });
  };

  const handlePreview = () => {
    if (!username) {
      toast.error("Set your username in Settings first");
      return;
    }
    window.open(`/${username}/home`, "_blank", "noopener,noreferrer");
  };

  /* ---- Google import: identical pipeline to v2, saves immediately */
  const handleGoogleImport = React.useCallback(
    async (placeId: string, sessionToken?: string) => {
      if (!partnerId) return;
      const result = await fetchWebsiteDataFromGoogle(placeId, sessionToken);
      const merged = mergeWebsiteConfig(result.website_config);

      const updates: Record<string, any> = { website_config: merged };
      if (result.location) updates.location = result.location;
      if (result.place_id) updates.place_id = result.place_id;
      if (result.state) updates.state = result.state;
      if (result.district) updates.district = result.district;
      if (result.phone) {
        updates.phone = result.phone;
        // Only seed WhatsApp from the listing if the partner has none yet.
        const existingWa = partner?.whatsapp_numbers;
        if (!Array.isArray(existingWa) || existingWa.length === 0) {
          updates.whatsapp_numbers = result.whatsapp_numbers;
        }
      }
      if (result.geo_location) updates.geo_location = result.geo_location;

      await updatePartner(partnerId, updates);
      revalidateTag(partnerId);
      setConfig(merged);
      setState(updates as Partial<Partner>);
      setDirty(false);
    },
    [partnerId, partner, setState],
  );

  const enabledCount = SECTIONS.filter(
    (s) => (config[s.key] as { enabled: boolean }).enabled,
  ).length;

  const summary = (sec: SectionKey): string => {
    switch (sec) {
      case "hero":
        return config.hero.headline || storeName || "No headline yet";
      case "menu": {
        const n = config.menu.category_ids.length;
        return n ? `${n} categor${n === 1 ? "y" : "ies"} featured` : "All categories";
      }
      case "why_choose_us": {
        const n = config.why_choose_us.items.length;
        return n ? `${n} card${n === 1 ? "" : "s"}` : "No cards yet";
      }
      case "gallery": {
        const n = config.gallery.items.length;
        return n ? `${n} photo${n === 1 ? "" : "s"}` : "No photos yet";
      }
      case "most_ordered": {
        const n = config.most_ordered.items.length;
        return n ? `${n} dish${n === 1 ? "" : "es"}` : "No dishes yet";
      }
      case "visit": {
        const first = config.visit.address_lines.split("\n")[0]?.trim();
        return first || "No address yet";
      }
      case "footer": {
        const n = config.footer.policies.length;
        return n ? `${n} policy link${n === 1 ? "" : "s"}` : "Social links only";
      }
      default:
        return "";
    }
  };

  const selectedMeta = SECTIONS.find((s) => s.key === sel) || null;
  const selectedOff =
    !!selectedMeta && !(config[selectedMeta.key] as { enabled: boolean }).enabled;

  return (
    <div className="flex flex-col gap-3.5 pb-24 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* ------------------------------------------------------ header row */}
      <div className="flex flex-wrap items-center gap-2.5 px-3.5 lg:px-0">
        {config.enabled ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11.5px] font-semibold leading-none text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
            Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            Draft — not visible yet
          </span>
        )}
        <span className="text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
          {username ? (
            <>
              <span translate="no" className="notranslate">
                /{username}/home
              </span>
              {" · "}
            </>
          ) : null}
          {enabledCount} of {SECTIONS.length} sections on
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SmallAction onClick={() => setImportOpen((v) => !v)}>
            <Sparkles size={15} strokeWidth={1.7} className="text-zinc-500 dark:text-zinc-400" />
            Import from Google
          </SmallAction>
          <SmallAction onClick={handlePreview}>
            <ExternalLink size={15} strokeWidth={1.7} className="text-zinc-500 dark:text-zinc-400" />
            Preview
          </SmallAction>
          {config.enabled ? (
            <SmallAction onClick={handlePublishToggle} disabled={saving}>
              Unpublish
            </SmallAction>
          ) : (
            <AdminV3Button
              type="button"
              variant="strong"
              disabled={saving}
              onClick={handlePublishToggle}
              className="h-[34px] px-3.5 text-[13px] font-medium"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Publish site
            </AdminV3Button>
          )}
        </div>
      </div>

      {/* --------------------------------------------------- import drawer */}
      {importOpen ? (
        <GoogleImportPanel
          onClose={() => setImportOpen(false)}
          onImport={handleGoogleImport}
        />
      ) : null}

      {/* ---------------------------------------------------- the two panes */}
      <div className="flex flex-wrap items-start gap-3.5">
        {/* Left: page sections */}
        <V3Card className="min-w-0 flex-[1_1_270px] overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <span className="flex-[1_1_auto] text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              Page sections
            </span>
            <StatusPill tone="outline" className="font-medium">
              In page order
            </StatusPill>
          </div>

          {SECTIONS.map((s) => {
            const on = (config[s.key] as { enabled: boolean }).enabled;
            const active = sel === s.key;
            return (
              <div
                key={s.key}
                role="button"
                tabIndex={0}
                onClick={() => setSel(s.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSel(s.key);
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 border-b border-l-2 border-b-zinc-100 px-3.5 py-[11px] transition-colors dark:border-b-zinc-800",
                  active
                    ? "border-l-zinc-900 bg-zinc-50 dark:border-l-zinc-50 dark:bg-zinc-800"
                    : "border-l-transparent bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                )}
              >
                <GripVertical
                  size={15}
                  strokeWidth={1.7}
                  className="shrink-0 text-zinc-300 dark:text-zinc-600"
                />
                <div className="min-w-0 flex-[1_1_auto]">
                  <div
                    className={cn(
                      "text-[13px] leading-none text-zinc-950 dark:text-zinc-50",
                      active ? "font-semibold" : "font-medium",
                    )}
                  >
                    {s.name}
                  </div>
                  <div
                    translate="no"
                    className="notranslate mt-1.5 truncate text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500"
                  >
                    {summary(s.key)}
                  </div>
                </div>
                <Toggle
                  on={on}
                  label={`${on ? "Hide" : "Show"} ${s.name} section`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSectionEnabled(s.key, !on);
                  }}
                />
              </div>
            );
          })}

          <div
            role="button"
            tabIndex={0}
            onClick={() => setSel("theme")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSel("theme");
              }
            }}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 border-l-2 px-3.5 py-[11px] transition-colors",
              sel === "theme"
                ? "border-l-zinc-900 bg-zinc-50 dark:border-l-zinc-50 dark:bg-zinc-800"
                : "border-l-transparent bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
            )}
          >
            <span
              className="h-[15px] w-[15px] shrink-0 rounded border border-zinc-300 dark:border-zinc-600"
              style={{ background: config.theme.bg_color }}
            />
            <div className="min-w-0 flex-[1_1_auto]">
              <div
                className={cn(
                  "text-[13px] leading-none text-zinc-950 dark:text-zinc-50",
                  sel === "theme" ? "font-semibold" : "font-medium",
                )}
              >
                Theme
              </div>
              <div className="mt-1.5 truncate font-mono text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                {config.theme.bg_color} · {config.theme.ink_color}
              </div>
            </div>
          </div>
        </V3Card>

        {/* Right: the editor for the selected section */}
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5">
          <V3Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <div className="min-w-0 flex-[1_1_auto]">
                <div className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                  {selectedMeta ? selectedMeta.name : "Theme"}
                </div>
                <div className="mt-1.5 text-xs font-normal leading-normal text-zinc-400 dark:text-zinc-500">
                  {selectedMeta
                    ? selectedMeta.hint
                    : "The page background and body text colour."}
                </div>
              </div>
              {selectedOff ? (
                <StatusPill tone="outline" className="font-medium">
                  Hidden
                </StatusPill>
              ) : null}
            </div>

            {selectedMeta && selectedOff ? (
              <div className="flex flex-col items-center gap-2.5 px-4 py-8">
                <div className="text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                  This section is hidden from your site
                </div>
                <div className="max-w-[300px] text-center text-xs font-normal leading-normal text-zinc-400 dark:text-zinc-500">
                  Turn it on to edit its content. Nothing you have written is lost
                  while it is off.
                </div>
                <AdminV3Button
                  type="button"
                  variant="strong"
                  onClick={() => setSectionEnabled(selectedMeta.key, true)}
                  className="mt-0.5 h-[34px] px-3.5 text-[13px] font-medium"
                >
                  Turn on {selectedMeta.name}
                </AdminV3Button>
              </div>
            ) : (
              <Editor
                sel={sel}
                config={config}
                patch={patch}
                categories={categories}
                storeName={storeName}
              />
            )}
          </V3Card>
        </div>
      </div>

      {/* -------------------------------------------------------- save bar */}
      {dirty ? (
        <div className="fixed bottom-5 right-5 z-50 lg:bottom-6 lg:right-6">
          <AdminV3Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={() => persist(config)}
            className="h-11 rounded-full px-5 shadow-lg"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} strokeWidth={2} />
            )}
            Save changes
          </AdminV3Button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- the editors */

function Editor({
  sel,
  config,
  patch,
  categories,
  storeName,
}: {
  sel: Selection;
  config: WebsiteConfig;
  patch: <K extends keyof WebsiteConfig>(k: K, v: Partial<WebsiteConfig[K]>) => void;
  categories: CategoryRow[];
  storeName: string;
}) {
  switch (sel) {
    case "hero":
      return <HeroEditor value={config.hero} onChange={(v) => patch("hero", v)} />;
    case "menu":
      return (
        <MenuEditor
          value={config.menu}
          categories={categories}
          onChange={(v) => patch("menu", v)}
        />
      );
    case "why_choose_us":
      return (
        <HighlightsEditor
          value={config.why_choose_us}
          onChange={(v) => patch("why_choose_us", v)}
        />
      );
    case "gallery":
      return (
        <GalleryEditor value={config.gallery} onChange={(v) => patch("gallery", v)} />
      );
    case "most_ordered":
      return (
        <DishesEditor
          value={config.most_ordered}
          onChange={(v) => patch("most_ordered", v)}
        />
      );
    case "visit":
      return <VisitEditor value={config.visit} onChange={(v) => patch("visit", v)} />;
    case "footer":
      return (
        <FooterEditor value={config.footer} onChange={(v) => patch("footer", v)} />
      );
    case "theme":
      return (
        <ThemeEditor
          value={config.theme}
          storeName={storeName}
          onChange={(v) => patch("theme", v)}
        />
      );
    default:
      return null;
  }
}

const BODY = "flex flex-col gap-3.5 px-4 py-3.5";

/* ------------------------------------------------------------------- hero */

function HeroEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["hero"];
  onChange: (v: Partial<WebsiteConfig["hero"]>) => void;
}) {
  const setImage = (url: string) => {
    const next = [...value.collage_images];
    next[0] = url;
    onChange({ collage_images: next });
  };

  return (
    <div className={BODY}>
      <FieldRow>
        <Field label="Headline">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="Kerala flavours, cooked to order"
            value={value.headline}
            onChange={(e) => onChange({ headline: e.target.value })}
          />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Accent line" hint="italic, brand colour">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="served all day"
            value={value.headline_accent}
            onChange={(e) => onChange({ headline_accent: e.target.value })}
          />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Description">
          <textarea
            rows={2}
            className={TEXTAREA_CLASS}
            placeholder="A short line under the headline"
            value={value.subheadline}
            onChange={(e) => onChange({ subheadline: e.target.value })}
          />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Button text">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="Order online"
            value={value.cta_text}
            onChange={(e) => onChange({ cta_text: e.target.value })}
          />
        </Field>
        <Field label="Button link" hint="defaults to your menu">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="Your menu page"
            value={value.cta_link}
            onChange={(e) => onChange({ cta_link: e.target.value })}
          />
        </Field>
      </FieldRow>

      <Block
        title="Quick facts"
        hint="Two short lines beside the headline. Leave blank to hide them."
      >
        <div className="mt-2.5 flex flex-wrap gap-3">
          <div className="flex min-w-0 flex-[1_1_200px] gap-2">
            <input
              type="text"
              className={cn(INPUT_CLASS, "w-auto flex-[0_1_96px]")}
              value={value.hours_label}
              onChange={(e) => onChange({ hours_label: e.target.value })}
            />
            <input
              type="text"
              className={cn(INPUT_CLASS, "w-auto flex-[1_1_auto]")}
              placeholder="Mon – Sat · 10am – 10pm"
              value={value.hours_value}
              onChange={(e) => onChange({ hours_value: e.target.value })}
            />
          </div>
          <div className="flex min-w-0 flex-[1_1_200px] gap-2">
            <input
              type="text"
              className={cn(INPUT_CLASS, "w-auto flex-[0_1_96px]")}
              value={value.address_label}
              onChange={(e) => onChange({ address_label: e.target.value })}
            />
            <input
              type="text"
              className={cn(INPUT_CLASS, "w-auto flex-[1_1_auto]")}
              placeholder="Short address line"
              value={value.address_value}
              onChange={(e) => onChange({ address_value: e.target.value })}
            />
          </div>
        </div>
      </Block>

      <Block
        title="Hero image"
        hint="Landscape crops best."
        action={
          <ImagePicker
            value={value.collage_images[0] || ""}
            onChange={setImage}
            folder="website-hero"
          />
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------- menu */

function MenuEditor({
  value,
  categories,
  onChange,
}: {
  value: WebsiteConfig["menu"];
  categories: CategoryRow[];
  onChange: (v: Partial<WebsiteConfig["menu"]>) => void;
}) {
  const allOn = categories.length > 0 && value.category_ids.length === categories.length;

  const toggleCategory = (cid: string) => {
    const has = value.category_ids.includes(cid);
    onChange({
      category_ids: has
        ? value.category_ids.filter((x) => x !== cid)
        : [...value.category_ids, cid],
    });
  };

  const toggleItem = (cid: string, itemId: string) => {
    const current = value.item_ids_by_category[cid] || [];
    const has = current.includes(itemId);
    onChange({
      item_ids_by_category: {
        ...value.item_ids_by_category,
        [cid]: has ? current.filter((x) => x !== itemId) : [...current, itemId],
      },
    });
  };

  const selectedCats = categories.filter((c) => value.category_ids.includes(c.id));

  return (
    <div className={BODY}>
      <FieldRow>
        <Field label="Title">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="What we cook"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>
        <Field label="Accent line" hint="italic">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="today"
            value={value.title_accent}
            onChange={(e) => onChange({ title_accent: e.target.value })}
          />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Button text">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="See full menu"
            value={value.cta_text}
            onChange={(e) => onChange({ cta_text: e.target.value })}
          />
        </Field>
        <Field label="Note under the menu" hint="optional">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="Prices include taxes"
            value={value.note}
            onChange={(e) => onChange({ note: e.target.value })}
          />
        </Field>
      </FieldRow>

      <Block
        title="Categories to feature"
        hint={
          categories.length === 0
            ? "No menu categories yet — add menu items first."
            : value.category_ids.length === 0
              ? `None picked — all ${categories.length} show`
              : `${value.category_ids.length} of ${categories.length} selected`
        }
        action={
          categories.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                onChange({ category_ids: allOn ? [] : categories.map((c) => c.id) })
              }
              className="shrink-0 text-[12.5px] font-medium leading-none text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {allOn ? "Clear all" : "Select all"}
            </button>
          ) : undefined
        }
      >
        {categories.length === 0 ? (
          <EmptyRows
            title="No categories yet"
            hint="Add menu items and their categories appear here."
          />
        ) : (
          <div className="mt-2.5 grid gap-[7px] [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
            {categories.map((c) => {
              const on = value.category_ids.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors",
                    on
                      ? "border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px]",
                      on
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900",
                    )}
                  >
                    {on ? <Check size={11} strokeWidth={3} /> : null}
                  </span>
                  <span
                    translate="no"
                    className="notranslate min-w-0 flex-[1_1_auto] truncate text-[12.5px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                  >
                    {formatDisplayName(c.name)}
                  </span>
                  <span className="shrink-0 text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                    {c.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selectedCats.map((c) => {
          const picked = value.item_ids_by_category[c.id] || [];
          return (
            <div key={c.id} className="mt-3">
              <div className="text-xs font-medium leading-none text-zinc-500 dark:text-zinc-400">
                Dishes in{" "}
                <span translate="no" className="notranslate">
                  {formatDisplayName(c.name)}
                </span>
                <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">
                  leave all off to show the first 8
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.items.map((it) => {
                  const on = picked.includes(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => toggleItem(c.id, it.id)}
                      translate="no"
                      className={cn(
                        "notranslate max-w-full truncate rounded-full border px-2.5 py-1 text-[12px] font-medium leading-none transition-colors",
                        on
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                      )}
                    >
                      {it.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Block>
    </div>
  );
}

/* --------------------------------------------- generic list-section header */

function ListHeading({
  value,
  onChange,
}: {
  value: { title: string; subtitle: string };
  onChange: (v: { title?: string; subtitle?: string }) => void;
}) {
  return (
    <>
      <FieldRow>
        <Field label="Title">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="Section heading"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Subtitle" hint="optional">
          <textarea
            rows={2}
            className={TEXTAREA_CLASS}
            placeholder="One line under the heading"
            value={value.subtitle}
            onChange={(e) => onChange({ subtitle: e.target.value })}
          />
        </Field>
      </FieldRow>
    </>
  );
}

/** The design's numbered item row: grip · badge · main control · remove. */
function ItemRow({
  n,
  onRemove,
  removeLabel,
  children,
  extra,
  lead,
}: {
  n: number;
  onRemove: () => void;
  removeLabel: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  lead?: React.ReactNode;
}) {
  return (
    <div className="border-b border-zinc-100 py-2.5 dark:border-zinc-800">
      <div className="flex items-center gap-2.5">
        <GripVertical
          size={15}
          strokeWidth={1.7}
          className="hidden shrink-0 text-zinc-300 dark:text-zinc-600 sm:block"
        />
        <IndexBadge n={n} />
        {lead}
        <div className="min-w-0 flex-[1_1_auto]">{children}</div>
        <RemoveButton label={removeLabel} onClick={onRemove} />
      </div>
      {extra ? (
        <div className="mt-2 flex flex-col gap-2 sm:pl-[54px]">{extra}</div>
      ) : null}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <SmallAction onClick={onClick}>
      <Plus size={14} strokeWidth={2} className="text-zinc-500 dark:text-zinc-400" />
      {label}
    </SmallAction>
  );
}

/* ------------------------------------------------------------- highlights */

function HighlightsEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["why_choose_us"];
  onChange: (v: Partial<WebsiteConfig["why_choose_us"]>) => void;
}) {
  const update = (i: number, part: Partial<WebsiteConfig["why_choose_us"]["items"][number]>) =>
    onChange({ items: value.items.map((it, idx) => (idx === i ? { ...it, ...part } : it)) });
  const updateAuthor = (i: number, part: Partial<{ name: string; photo_url: string }>) =>
    onChange({
      items: value.items.map((it, idx) =>
        idx === i ? { ...it, author: { ...it.author, ...part } } : it,
      ),
    });

  return (
    <div className={BODY}>
      <ListHeading value={value} onChange={onChange} />
      <Block
        title="Highlight cards"
        hint="Three to six read best. Each card can carry a review quote."
        action={
          <AddButton
            label="Add card"
            onClick={() =>
              onChange({
                items: [
                  ...value.items,
                  { title: "", description: "", quote: "", author: { name: "", photo_url: "" } },
                ],
              })
            }
          />
        }
      >
        {value.items.map((item, i) => (
          <ItemRow
            key={i}
            n={i + 1}
            removeLabel={`Remove card ${i + 1}`}
            onRemove={() => onChange({ items: value.items.filter((_, idx) => idx !== i) })}
            extra={
              <>
                <textarea
                  rows={2}
                  className={TEXTAREA_CLASS}
                  placeholder="Description — two or three sentences"
                  value={item.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                />
                <textarea
                  rows={2}
                  className={TEXTAREA_CLASS}
                  placeholder="Supporting quote from a review (optional)"
                  value={item.quote}
                  onChange={(e) => update(i, { quote: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    className={cn(INPUT_CLASS, "w-auto flex-[1_1_150px]")}
                    placeholder="Reviewer name"
                    value={item.author.name}
                    onChange={(e) => updateAuthor(i, { name: e.target.value })}
                  />
                  <input
                    type="text"
                    className={cn(INPUT_CLASS, "w-auto flex-[1_1_150px]")}
                    placeholder="Reviewer photo URL"
                    value={item.author.photo_url}
                    onChange={(e) => updateAuthor(i, { photo_url: e.target.value })}
                  />
                </div>
              </>
            }
          >
            <input
              type="text"
              className={INPUT_CLASS}
              placeholder="Card title, e.g. Slow-cooked mandi"
              value={item.title}
              onChange={(e) => update(i, { title: e.target.value })}
            />
          </ItemRow>
        ))}
        {value.items.length === 0 ? (
          <EmptyRows
            title="Nothing added yet"
            hint="Add a card, or import from Google to fill these in."
          />
        ) : null}
      </Block>
    </div>
  );
}

/* ---------------------------------------------------------------- gallery */

function GalleryEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["gallery"];
  onChange: (v: Partial<WebsiteConfig["gallery"]>) => void;
}) {
  const update = (i: number, part: Partial<{ image_url: string; caption: string }>) =>
    onChange({ items: value.items.map((it, idx) => (idx === i ? { ...it, ...part } : it)) });

  return (
    <div className={BODY}>
      <ListHeading value={value} onChange={onChange} />
      <Block
        title="Photos"
        hint="Tap the tile to upload. Captions are optional."
        action={
          <AddButton
            label="Add photo"
            onClick={() => onChange({ items: [...value.items, { image_url: "", caption: "" }] })}
          />
        }
      >
        {value.items.map((item, i) => (
          <ItemRow
            key={i}
            n={i + 1}
            removeLabel={`Remove photo ${i + 1}`}
            onRemove={() => onChange({ items: value.items.filter((_, idx) => idx !== i) })}
            lead={
              <ImagePicker
                size="thumb"
                value={item.image_url}
                folder="website-gallery"
                onChange={(url) => update(i, { image_url: url })}
              />
            }
          >
            <input
              type="text"
              className={INPUT_CLASS}
              placeholder="Caption, e.g. Outdoor seating"
              value={item.caption}
              onChange={(e) => update(i, { caption: e.target.value })}
            />
          </ItemRow>
        ))}
        {value.items.length === 0 ? (
          <EmptyRows
            title="Nothing added yet"
            hint="Add a photo, or import from Google to pull your listing's pictures."
          />
        ) : null}
      </Block>
    </div>
  );
}

/* -------------------------------------------------------------- favourites */

function DishesEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["most_ordered"];
  onChange: (v: Partial<WebsiteConfig["most_ordered"]>) => void;
}) {
  const update = (i: number, part: Partial<WebsiteConfig["most_ordered"]["items"][number]>) =>
    onChange({ items: value.items.map((it, idx) => (idx === i ? { ...it, ...part } : it)) });
  const updateAuthor = (i: number, part: Partial<{ name: string; photo_url: string }>) =>
    onChange({
      items: value.items.map((it, idx) =>
        idx === i ? { ...it, author: { ...it.author, ...part } } : it,
      ),
    });

  return (
    <div className={BODY}>
      <ListHeading value={value} onChange={onChange} />
      <Block
        title="Dishes"
        hint="Four to eight render best. Each dish can carry a customer quote."
        action={
          <AddButton
            label="Add dish"
            onClick={() =>
              onChange({
                items: [
                  ...value.items,
                  { name: "", quote: "", author: { name: "", photo_url: "" } },
                ],
              })
            }
          />
        }
      >
        {value.items.map((item, i) => (
          <ItemRow
            key={i}
            n={i + 1}
            removeLabel={`Remove dish ${i + 1}`}
            onRemove={() => onChange({ items: value.items.filter((_, idx) => idx !== i) })}
            extra={
              <>
                <textarea
                  rows={2}
                  className={TEXTAREA_CLASS}
                  placeholder="Quote from a review (optional)"
                  value={item.quote}
                  onChange={(e) => update(i, { quote: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    className={cn(INPUT_CLASS, "w-auto flex-[1_1_150px]")}
                    placeholder="Reviewer name"
                    value={item.author.name}
                    onChange={(e) => updateAuthor(i, { name: e.target.value })}
                  />
                  <input
                    type="text"
                    className={cn(INPUT_CLASS, "w-auto flex-[1_1_150px]")}
                    placeholder="Reviewer photo URL"
                    value={item.author.photo_url}
                    onChange={(e) => updateAuthor(i, { photo_url: e.target.value })}
                  />
                </div>
              </>
            }
          >
            <input
              type="text"
              className={INPUT_CLASS}
              placeholder="Dish name"
              value={item.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
          </ItemRow>
        ))}
        {value.items.length === 0 ? (
          <EmptyRows
            title="Nothing added yet"
            hint="Add a dish, or import from Google to fill these from reviews."
          />
        ) : null}
      </Block>
    </div>
  );
}

/* ------------------------------------------------------------------ visit */

function VisitEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["visit"];
  onChange: (v: Partial<WebsiteConfig["visit"]>) => void;
}) {
  const updateHour = (i: number, part: Partial<{ label: string; value: string }>) =>
    onChange({ hours: value.hours.map((h, idx) => (idx === i ? { ...h, ...part } : h)) });

  return (
    <div className={BODY}>
      <FieldRow>
        <Field label="Title">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="Come and sit with us"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>
        <Field label="Accent line" hint="italic">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="in Kochi"
            value={value.title_accent}
            onChange={(e) => onChange({ title_accent: e.target.value })}
          />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Address">
          <textarea
            rows={2}
            className={TEXTAREA_CLASS}
            placeholder="Street, city, postal"
            value={value.address_lines}
            onChange={(e) => onChange({ address_lines: e.target.value })}
          />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Landmark note" hint="optional">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="e.g. between the two banks"
            value={value.address_note}
            onChange={(e) => onChange({ address_note: e.target.value })}
          />
        </Field>
      </FieldRow>

      <Block
        title="Opening hours"
        hint="Group days that share a time."
        action={
          <AddButton
            label="Add row"
            onClick={() => onChange({ hours: [...value.hours, { label: "", value: "" }] })}
          />
        }
      >
        {value.hours.map((h, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 border-b border-zinc-100 py-2.5 dark:border-zinc-800"
          >
            <input
              type="text"
              className={cn(INPUT_CLASS, "w-auto flex-[1_1_120px]")}
              placeholder="Mon – Fri"
              value={h.label}
              onChange={(e) => updateHour(i, { label: e.target.value })}
            />
            <input
              type="text"
              className={cn(INPUT_CLASS, "w-auto flex-[1_1_140px]")}
              placeholder="10am – 10pm"
              value={h.value}
              onChange={(e) => updateHour(i, { value: e.target.value })}
            />
            <RemoveButton
              label={`Remove hours row ${i + 1}`}
              onClick={() => onChange({ hours: value.hours.filter((_, idx) => idx !== i) })}
            />
          </div>
        ))}
        {value.hours.length === 0 ? (
          <EmptyRows title="No hours yet" hint="Add a row for each block of days." />
        ) : null}
      </Block>

      <FieldRow>
        <Field label="Getting here" hint="optional">
          <textarea
            rows={2}
            className={TEXTAREA_CLASS}
            placeholder="Transit and parking notes"
            value={value.getting_here}
            onChange={(e) => onChange({ getting_here: e.target.value })}
          />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Phone">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="9049261441"
            value={value.contact_phone}
            onChange={(e) => onChange({ contact_phone: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="hello@yourstore.com"
            value={value.contact_email}
            onChange={(e) => onChange({ contact_email: e.target.value })}
          />
        </Field>
      </FieldRow>
    </div>
  );
}

/* ----------------------------------------------------------------- footer */

function FooterEditor({
  value,
  onChange,
}: {
  value: WebsiteConfig["footer"];
  onChange: (v: Partial<WebsiteConfig["footer"]>) => void;
}) {
  const update = (i: number, part: Partial<{ label: string; url: string }>) =>
    onChange({ policies: value.policies.map((p, idx) => (idx === i ? { ...p, ...part } : p)) });

  return (
    <div className={BODY}>
      <FieldRow>
        <Field label="Copyright line" hint="defaults to © your store, this year">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="© Your store 2026"
            value={value.copyright}
            onChange={(e) => onChange({ copyright: e.target.value })}
          />
        </Field>
      </FieldRow>

      <Block
        title="Policy links"
        hint="Social links come from your account automatically."
        action={
          <AddButton
            label="Add link"
            onClick={() => onChange({ policies: [...value.policies, { label: "", url: "" }] })}
          />
        }
      >
        {value.policies.map((p, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 border-b border-zinc-100 py-2.5 dark:border-zinc-800"
          >
            <input
              type="text"
              className={cn(INPUT_CLASS, "w-auto flex-[1_1_120px]")}
              placeholder="Label, e.g. Privacy"
              value={p.label}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <input
              type="text"
              className={cn(INPUT_CLASS, "w-auto flex-[1_1_160px]")}
              placeholder="https://…"
              value={p.url}
              onChange={(e) => update(i, { url: e.target.value })}
            />
            <RemoveButton
              label={`Remove policy link ${i + 1}`}
              onClick={() =>
                onChange({ policies: value.policies.filter((_, idx) => idx !== i) })
              }
            />
          </div>
        ))}
        {value.policies.length === 0 ? (
          <EmptyRows
            title="Nothing added yet"
            hint="Add a link to your refund or privacy policy."
          />
        ) : null}
      </Block>
    </div>
  );
}

/* ------------------------------------------------------------------ theme */

const PALETTES: { name: string; bg: string; ink: string }[] = [
  { name: "Paper", bg: "#FFFFFF", ink: "#1A1714" },
  { name: "Warm sand", bg: "#F7F3EC", ink: "#2A2420" },
  { name: "Charcoal", bg: "#14120F", ink: "#F4EFE6" },
  { name: "Midnight", bg: "#0E0F0C", ink: "#F2F2F0" },
];

function ThemeEditor({
  value,
  storeName,
  onChange,
}: {
  value: WebsiteConfig["theme"];
  storeName: string;
  onChange: (v: Partial<WebsiteConfig["theme"]>) => void;
}) {
  return (
    <div className={BODY}>
      <div>
        <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
          Palette
        </div>
        <div className="mt-1.5 text-xs font-normal leading-normal text-zinc-400 dark:text-zinc-500">
          Your brand accent comes from Theme settings. This sets the page
          background and text.
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {PALETTES.map((p) => {
            const on =
              p.bg.toLowerCase() === value.bg_color.toLowerCase() &&
              p.ink.toLowerCase() === value.ink_color.toLowerCase();
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => onChange({ bg_color: p.bg, ink_color: p.ink })}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg border-[1.5px] bg-white px-[11px] py-2 transition-colors dark:bg-zinc-800",
                  on
                    ? "border-zinc-900 dark:border-zinc-50"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
                )}
              >
                <span className="flex shrink-0">
                  <span
                    className="h-4 w-4 rounded-l border border-r-0 border-zinc-300 dark:border-zinc-600"
                    style={{ background: p.bg }}
                  />
                  <span
                    className="h-4 w-4 rounded-r border border-zinc-300 dark:border-zinc-600"
                    style={{ background: p.ink }}
                  />
                </span>
                <span className="text-[12.5px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="min-w-0 flex-[1_1_180px]">
          <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
            Background
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <label className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-600">
              <span
                className="block h-full w-full"
                style={{ background: value.bg_color }}
              />
              <input
                type="color"
                aria-label="Background colour"
                value={value.bg_color}
                onChange={(e) => onChange({ bg_color: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <input
              type="text"
              className={cn(INPUT_CLASS, "w-auto flex-[1_1_auto] font-mono")}
              value={value.bg_color}
              onChange={(e) => onChange({ bg_color: e.target.value })}
            />
          </div>
        </div>
        <div className="min-w-0 flex-[1_1_180px]">
          <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
            Text
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <label className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-600">
              <span
                className="block h-full w-full"
                style={{ background: value.ink_color }}
              />
              <input
                type="color"
                aria-label="Text colour"
                value={value.ink_color}
                onChange={(e) => onChange({ ink_color: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <input
              type="text"
              className={cn(INPUT_CLASS, "w-auto flex-[1_1_auto] font-mono")}
              value={value.ink_color}
              onChange={(e) => onChange({ ink_color: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div
        className="rounded-lg border border-zinc-200 p-[18px] dark:border-zinc-700"
        style={{ background: value.bg_color }}
      >
        <div
          translate="no"
          className="notranslate text-[15px] font-semibold leading-none tracking-[-0.01em]"
          style={{ color: value.ink_color }}
        >
          {storeName || "Your store"}
        </div>
        <div
          className="mt-1.5 text-[12.5px] font-normal leading-normal opacity-70"
          style={{ color: value.ink_color }}
        >
          This is how body text sits on your page background.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ Google import card */

function GoogleImportPanel({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (placeId: string, sessionToken?: string) => Promise<void>;
}) {
  const [search, setSearch] = React.useState("");
  const [predictions, setPredictions] = React.useState<PlacePrediction[]>([]);
  const [selected, setSelected] = React.useState<PlacePrediction | null>(null);
  const [importing, setImporting] = React.useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = React.useRef(0);
  // One Places session per search→select→details, shared with the server fetch.
  const sessionTokenRef = React.useRef<string>("");
  const ensureSessionToken = () => {
    if (!sessionTokenRef.current) sessionTokenRef.current = crypto.randomUUID();
    return sessionTokenRef.current;
  };

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (q.length < 3 || selected) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      try {
        const results = await placesAutocomplete(q, ensureSessionToken());
        if (myReq === reqIdRef.current) setPredictions(results);
      } catch {
        /* ignore */
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, selected]);

  const clear = () => {
    setSelected(null);
    setSearch("");
    setPredictions([]);
    sessionTokenRef.current = "";
  };

  const runImport = async () => {
    if (!selected) {
      toast.error("Pick your business from the dropdown");
      return;
    }
    setImporting(true);
    const t = toast.loading("Fetching your business details from Google…");
    try {
      await onImport(selected.place_id, ensureSessionToken());
      toast.success("Website filled from Google and saved", { id: t });
      clear();
      onClose();
    } catch (e) {
      console.error("[V3 Website] Google import failed", e);
      toast.error("Couldn't import from Google. Please try again.", { id: t });
    } finally {
      setImporting(false);
      sessionTokenRef.current = "";
    }
  };

  return (
    <V3Card className="flex flex-wrap items-center gap-2.5 px-4 py-3.5">
      <div className="min-w-0 flex-[1_1_220px]">
        <div className="text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
          Fill the site from your Google listing
        </div>
        <div className="mt-1.5 text-xs font-normal leading-normal text-zinc-400 dark:text-zinc-500">
          Photos, reviews, address and hours. This overwrites what is here now.
        </div>
      </div>

      <div className="relative min-w-0 flex-[1_1_220px]">
        <div className="flex h-9 items-center gap-2.5 rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
          <Search
            size={15}
            strokeWidth={1.8}
            className="shrink-0 text-zinc-400 dark:text-zinc-500"
          />
          <input
            type="text"
            placeholder="Search your business name…"
            disabled={importing}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (selected) setSelected(null);
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal leading-none text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
          {selected ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear"
              className="shrink-0 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
            >
              <X size={14} strokeWidth={1.9} />
            </button>
          ) : null}
        </div>

        {predictions.length > 0 ? (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            {predictions.map((p) => (
              <button
                key={p.place_id}
                type="button"
                onClick={() => {
                  setSelected(p);
                  setSearch(p.structured_formatting?.main_text || p.description);
                  setPredictions([]);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                <MapPin
                  size={14}
                  strokeWidth={1.8}
                  className="mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                />
                <span className="min-w-0" translate="no">
                  <span className="notranslate block truncate text-[13px] font-medium leading-tight text-zinc-950 dark:text-zinc-50">
                    {p.structured_formatting?.main_text || p.description}
                  </span>
                  <span className="notranslate mt-0.5 block truncate text-xs leading-tight text-zinc-400 dark:text-zinc-500">
                    {p.structured_formatting?.secondary_text || ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {selected ? (
          <div className="mt-1.5 flex items-center gap-1 text-xs leading-none text-green-700 dark:text-green-400">
            <Check size={12} strokeWidth={2.4} />
            <span translate="no" className="notranslate truncate">
              {selected.structured_formatting?.main_text || selected.description}
            </span>
          </div>
        ) : null}
      </div>

      <AdminV3Button
        type="button"
        variant="strong"
        onClick={runImport}
        disabled={!selected || importing}
        className="h-9 shrink-0 px-3.5 text-[13px] font-medium"
      >
        {importing ? <Loader2 size={14} className="animate-spin" /> : null}
        Import
      </AdminV3Button>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close import panel"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-transparent text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <X size={14} strokeWidth={1.9} />
      </button>
    </V3Card>
  );
}
