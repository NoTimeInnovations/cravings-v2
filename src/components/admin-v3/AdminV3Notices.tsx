"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Eye,
  Image as ImageIcon,
  Link2,
  Loader2,
  MinusCircle,
  Pencil,
  PlusCircle,
  Sparkles,
  Trash2,
} from "lucide-react";

import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  createNoticeMutation,
  deleteNoticeMutation,
  getNoticesQuery,
  updateNoticeMutation,
} from "@/api/notices";
import { revalidateTag } from "@/app/actions/revalidate";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { NoticeCanvas } from "@/components/notices/NoticeCanvas";
import { Partner, useAuthStore } from "@/store/authStore";
import {
  DEFAULT_AUTO_CLOSE,
  NoticeCustomConfig,
  NoticeElement,
  NoticeRow,
  NoticeType,
  defaultCustomConfig,
  gradientCss,
  toRenderable,
} from "@/types/notices";
import { AdminV3Button, StatusPill, V3Card } from "./ui/primitives";

/**
 * Storefront notices, v3.
 *
 * Same data as admin-v2 (`notices` table, `src/api/notices.ts`) and the same
 * storefront renderer (`NoticeCanvas`), so a notice designed here is
 * pixel-identical to what a customer sees. What changed is the authoring model:
 * v2 exposed a free-form canvas (drag any element anywhere); the v3 design
 * reduces a designed notice to headline + message + optional button on a colour.
 * Those three map onto the SAME `config.elements` array, at the positions
 * `defaultCustomConfig()` already used — so v3 can open, edit and re-save a
 * notice authored in v2 without losing it, and vice versa.
 */

/* --------------------------------------------------------------- Themes */

type Theme = {
  key: string;
  name: string;
  from: string;
  to: string;
  angle: number;
  /** Text colour on this background. */
  ink: string;
  /** Solid colour used behind ink (button label colour). */
  solid: string;
};

const THEMES: Theme[] = [
  { key: "violet", name: "Violet", from: "#7c3aed", to: "#ec4899", angle: 135, ink: "#ffffff", solid: "#7c3aed" },
  { key: "ink", name: "Ink", from: "#18181b", to: "#3f3f46", angle: 135, ink: "#fafafa", solid: "#18181b" },
  { key: "emerald", name: "Emerald", from: "#047857", to: "#10b981", angle: 135, ink: "#ffffff", solid: "#047857" },
  { key: "amber", name: "Amber", from: "#f59e0b", to: "#f97316", angle: 135, ink: "#1c1917", solid: "#f59e0b" },
  { key: "paper", name: "Paper", from: "#ffffff", to: "#e4e4e7", angle: 135, ink: "#09090b", solid: "#ffffff" },
];

function matchTheme(c: NoticeCustomConfig): Theme | null {
  return (
    THEMES.find(
      (t) =>
        t.from.toLowerCase() === (c.gradient.from || "").toLowerCase() &&
        t.to.toLowerCase() === (c.gradient.to || "").toLowerCase(),
    ) || null
  );
}

/* ----------------------------------------------------------------- Draft */

interface Draft {
  id?: string;
  type: NoticeType;
  posterImage: string;
  link: string;
  config: NoticeCustomConfig;
  isActive: boolean;
  scheduled: boolean;
  startsAt: string; // datetime-local value
  expiresAt: string;
  autoCloseSeconds: number; // 0 → stays open until closed
}

const newId = () => `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string): string | null => (v ? new Date(v).toISOString() : null);

function emptyDraft(type: NoticeType): Draft {
  return {
    type,
    posterImage: "",
    link: "",
    config: defaultCustomConfig(),
    isActive: true,
    scheduled: false,
    startsAt: "",
    expiresAt: "",
    autoCloseSeconds: DEFAULT_AUTO_CLOSE,
  };
}

function rowToDraft(n: NoticeRow): Draft {
  const isPoster =
    n.type === "poster" ||
    (!!n.image_url && /^https?:\/\//.test(n.image_url) && n.type !== "custom");
  return {
    id: n.id,
    type: isPoster ? "poster" : "custom",
    posterImage: isPoster ? n.image_url || "" : "",
    link: n.button_link || "",
    config: n.config?.elements?.length ? n.config : defaultCustomConfig(),
    isActive: n.is_active,
    scheduled: !!(n.starts_at || n.expires_at),
    startsAt: toLocalInput(n.starts_at),
    expiresAt: toLocalInput(n.expires_at),
    autoCloseSeconds:
      typeof n.auto_close_seconds === "number" ? n.auto_close_seconds : DEFAULT_AUTO_CLOSE,
  };
}

/* ------------------------------------------------- config <-> three fields */

function textElements(c: NoticeCustomConfig): NoticeElement[] {
  return c.elements.filter((e) => e.kind === "text");
}
function buttonElement(c: NoticeCustomConfig): NoticeElement | undefined {
  return c.elements.find((e) => e.kind === "button");
}
const headlineOf = (c: NoticeCustomConfig) => textElements(c)[0]?.text ?? "";
const bodyOf = (c: NoticeCustomConfig) => textElements(c)[1]?.text ?? "";
const buttonLabelOf = (c: NoticeCustomConfig) => buttonElement(c)?.text ?? "";

function setNth(
  c: NoticeCustomConfig,
  index: 0 | 1,
  text: string,
  ink: string,
): NoticeCustomConfig {
  const t = textElements(c);
  const target = t[index];
  if (target) {
    return {
      ...c,
      elements: c.elements.map((e) => (e.id === target.id ? { ...e, text } : e)),
    };
  }
  const fresh: NoticeElement =
    index === 0
      ? { id: newId(), kind: "text", text, xPct: 10, yPct: 22, fontSize: 56, color: ink, bold: true, align: "left" }
      : { id: newId(), kind: "text", text, xPct: 10, yPct: 45, fontSize: 26, color: ink, align: "left" };
  return { ...c, elements: [...c.elements, fresh] };
}

function setButton(c: NoticeCustomConfig, text: string, theme: Theme | null): NoticeCustomConfig {
  const b = buttonElement(c);
  if (b) {
    return { ...c, elements: c.elements.map((e) => (e.id === b.id ? { ...e, text } : e)) };
  }
  const fresh: NoticeElement = {
    id: newId(),
    kind: "button",
    text,
    xPct: 10,
    yPct: 66,
    fontSize: 24,
    color: theme?.solid ?? "#111827",
    link: "",
    bg: theme?.ink ?? "#ffffff",
    textColor: theme?.solid ?? "#111827",
    align: "left",
  };
  return { ...c, elements: [...c.elements, fresh] };
}

function removeButton(c: NoticeCustomConfig): NoticeCustomConfig {
  return { ...c, elements: c.elements.filter((e) => e.kind !== "button") };
}

function applyTheme(c: NoticeCustomConfig, t: Theme): NoticeCustomConfig {
  return {
    gradient: { from: t.from, to: t.to, angle: t.angle },
    elements: c.elements.map((e) =>
      e.kind === "button"
        ? { ...e, bg: t.ink, textColor: t.solid, color: t.solid }
        : { ...e, color: t.ink },
    ),
  };
}

function withLink(c: NoticeCustomConfig, link: string): NoticeCustomConfig {
  const b = buttonElement(c);
  if (!b) return c;
  return { ...c, elements: c.elements.map((e) => (e.id === b.id ? { ...e, link } : e)) };
}

/* ------------------------------------------------------------ Small parts */

function CardHead({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
      <span className="flex-auto text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
        {title}
      </span>
      {right}
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={
        "inline-flex flex-wrap gap-[3px] rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-800 " +
        (className || "")
      }
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              active
                ? "h-[30px] rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] font-semibold leading-none text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                : "h-[30px] rounded-md border border-transparent bg-transparent px-3 text-[12.5px] font-medium leading-none text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const FIELD =
  "mt-1.5 box-border h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal leading-none text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

const FIELD_LABEL = "text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300";

const HINT = "mt-2 text-[12px] font-normal leading-normal text-zinc-400 dark:text-zinc-500";

/* ------------------------------------------------------------------ Screen */

export function AdminV3Notices() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const partnerId = partner?.id as string | undefined;

  const [notices, setNotices] = React.useState<NoticeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState<Draft | null>(null);

  const fetchNotices = React.useCallback(async () => {
    if (!partnerId) return;
    try {
      const res = await fetchFromHasura(getNoticesQuery, { partner_id: partnerId });
      setNotices(res?.notices || []);
    } catch {
      toast.error("Failed to load notices");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  React.useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const toggle = async (n: NoticeRow) => {
    try {
      await fetchFromHasura(updateNoticeMutation, {
        id: n.id,
        updates: { is_active: !n.is_active },
      });
      setNotices((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_active: !x.is_active } : x)),
      );
      if (partnerId) revalidateTag(partnerId);
    } catch {
      toast.error("Failed to update notice");
    }
  };

  const remove = async (n: NoticeRow) => {
    const ok = await confirmDialog({
      title: "Delete this notice?",
      description: "This can't be undone.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await fetchFromHasura(deleteNoticeMutation, { id: n.id });
      setNotices((prev) => prev.filter((x) => x.id !== n.id));
      if (partnerId) revalidateTag(partnerId);
      toast.success("Notice deleted");
    } catch {
      toast.error("Failed to delete notice");
    }
  };

  if (draft) {
    return (
      <NoticeEditor
        initial={draft}
        partnerId={partnerId}
        onClose={() => setDraft(null)}
        onSaved={() => {
          setDraft(null);
          setLoading(true);
          fetchNotices();
        }}
      />
    );
  }

  const liveCount = notices.filter((n) => n.is_active).length;

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      <V3Card>
        <CardHead
          title="Your notices"
          right={
            <StatusPill tone="outline" className="font-medium">
              {loading ? "Loading…" : liveCount === 0 ? "None live" : `${liveCount} live`}
            </StatusPill>
          }
        />

        <div className="flex flex-wrap items-stretch gap-3 p-4 py-[18px]">
          <StartTile
            icon={<ImageIcon size={16} strokeWidth={1.7} />}
            title="Upload a poster"
            sub="You already have the artwork. Drop in an image and pick where it links."
            onClick={() => setDraft(emptyDraft("poster"))}
          />
          <StartTile
            icon={<Sparkles size={16} strokeWidth={1.7} />}
            title="Design a notice"
            sub="Headline, a line of text and a button on a colour of your choosing."
            onClick={() => setDraft(emptyDraft("custom"))}
          />
        </div>

        <div className="flex gap-2 rounded-b-none bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50 lg:rounded-b-xl">
          <Eye size={14} strokeWidth={1.8} className="mt-[1px] shrink-0 text-zinc-400 dark:text-zinc-500" />
          <span className="text-[12px] font-normal leading-normal text-zinc-400 dark:text-zinc-500">
            A notice appears once when someone opens your storefront, over the menu. One notice
            runs at a time.
          </span>
        </div>
      </V3Card>

      {loading ? (
        <V3Card className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </V3Card>
      ) : notices.length === 0 ? null : (
        <V3Card>
          <CardHead
            title="Saved notices"
            right={
              <StatusPill tone="neutral" className="font-medium">
                {notices.length}
              </StatusPill>
            }
          />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5 p-4">
            {notices.map((n) => (
              <NoticeTile
                key={n.id}
                notice={n}
                onEdit={() => setDraft(rowToDraft(n))}
                onToggle={() => toggle(n)}
                onDelete={() => remove(n)}
              />
            ))}
          </div>
        </V3Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Start tile */

function StartTile({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-[1_1_220px] cursor-pointer flex-col items-start gap-[9px] rounded-[10px] border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {icon}
      </span>
      <span className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
        {title}
      </span>
      <span className="text-[12px] font-normal leading-normal text-zinc-400 dark:text-zinc-500">
        {sub}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------ Notice tile */

function NoticeTile({
  notice,
  onEdit,
  onToggle,
  onDelete,
}: {
  notice: NoticeRow;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const r = toRenderable(notice);
  const editable = notice.type === "poster" || notice.type === "custom";
  return (
    <div
      className={
        "overflow-hidden rounded-[10px] border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800 " +
        (notice.is_active ? "" : "opacity-60")
      }
    >
      <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-900">
        {r?.kind === "poster" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : r?.kind === "custom" ? (
          <div className="pointer-events-none h-full w-full">
            <NoticeCanvas config={r.config} />
          </div>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center p-4 text-center text-[13px] text-white"
            style={{ background: "linear-gradient(135deg,#334155,#0f172a)" }}
            translate="no"
          >
            {r?.kind === "legacy" ? r.title : "Notice"}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/55 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-white">
          {notice.type === "poster" ? "Poster" : notice.type === "custom" ? "Designed" : "Text"}
        </span>
      </div>
      <div className="flex items-center gap-2 border-t border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
        <button
          type="button"
          onClick={onToggle}
          className={
            "inline-flex items-center gap-1.5 rounded-full border px-[9px] py-[2.5px] text-[11px] font-bold leading-none " +
            (notice.is_active
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
              : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300")
          }
        >
          <span
            className={
              "h-[6px] w-[6px] rounded-full " +
              (notice.is_active ? "bg-green-600" : "bg-zinc-400 dark:bg-zinc-500")
            }
          />
          {notice.is_active ? "Live" : "Off"}
        </button>
        <div className="ml-auto flex gap-1.5">
          {editable && (
            <AdminV3Button variant="icon" aria-label="Edit notice" onClick={onEdit}>
              <Pencil size={15} strokeWidth={1.8} />
            </AdminV3Button>
          )}
          <AdminV3Button
            variant="icon"
            aria-label="Delete notice"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950"
          >
            <Trash2 size={15} strokeWidth={1.8} />
          </AdminV3Button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Editor */

function NoticeEditor({
  initial,
  partnerId,
  onClose,
  onSaved,
}: {
  initial: Draft;
  partnerId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = React.useState<Draft>(initial);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [imageMode, setImageMode] = React.useState<"upload" | "url">("upload");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const patch = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }));
  const setConfig = (c: NoticeCustomConfig) => setD((prev) => ({ ...prev, config: c }));

  const theme = matchTheme(d.config);
  const hasButton = !!buttonElement(d.config);

  const ready =
    d.type === "poster"
      ? !!d.posterImage
      : !!(headlineOf(d.config).trim() || bodyOf(d.config).trim());

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const url = await uploadFileToS3(dataUrl, `notices/${Date.now()}-${file.name}`);
      patch({ posterImage: url });
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!partnerId) return;
    if (!ready) {
      toast.error(d.type === "poster" ? "Add a poster image" : "Add a headline or a message");
      return;
    }
    setSaving(true);
    try {
      const link = d.link.trim();
      const config = d.type === "custom" ? withLink(d.config, link) : null;
      const base: Record<string, unknown> = {
        type: d.type,
        is_active: d.isActive,
        show_always: true,
        starts_at: d.scheduled ? fromLocalInput(d.startsAt) : null,
        expires_at: d.scheduled ? fromLocalInput(d.expiresAt) : null,
        image_url: d.type === "poster" ? d.posterImage : "",
        button_link: link || null,
        config,
        auto_close_seconds: Math.max(0, Math.round(d.autoCloseSeconds || 0)),
      };
      if (d.id) {
        await fetchFromHasura(updateNoticeMutation, { id: d.id, updates: base });
      } else {
        await fetchFromHasura(createNoticeMutation, {
          object: { ...base, partner_id: partnerId, priority: 0 },
        });
      }
      revalidateTag(partnerId);
      toast.success(d.id ? "Notice updated" : "Notice published");
      onSaved();
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to save notice");
    } finally {
      setSaving(false);
    }
  };

  const status = d.id
    ? d.isActive
      ? "Live on your storefront"
      : "Saved, currently off"
    : d.type === "poster"
      ? "Poster · not published yet"
      : "Designed notice · not published yet";

  const closeHint =
    d.autoCloseSeconds === 0
      ? "Customers close it themselves."
      : `Closes on its own after ${d.autoCloseSeconds} second${d.autoCloseSeconds === 1 ? "" : "s"}.`;

  const runHint = d.scheduled
    ? "Only shown between the two times above. Leave one blank to leave that end open."
    : d.isActive
      ? "Shows as soon as you publish, until you turn it off."
      : "Saved but off — turn it on to show it.";

  return (
    <div className="flex flex-col">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to notices"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-[1_1_180px]">
          <div className="text-[16px] font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            {d.id ? "Edit notice" : "New notice"}
          </div>
          <div className="mt-0.5 text-[12.5px] font-normal leading-none text-zinc-500 dark:text-zinc-400">
            {status}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented<NoticeType>
            value={d.type}
            onChange={(v) => patch({ type: v })}
            options={[
              { value: "poster", label: "Poster" },
              { value: "custom", label: "Designed" },
            ]}
          />
          <button
            type="button"
            onClick={() => patch({ isActive: !d.isActive })}
            className={
              "inline-flex h-[34px] items-center gap-1.5 rounded-md border px-3 text-[12.5px] font-semibold leading-none transition-colors " +
              (d.isActive
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700")
            }
          >
            <span
              className={
                "h-[6px] w-[6px] rounded-full " +
                (d.isActive ? "bg-green-600" : "bg-zinc-400 dark:bg-zinc-500")
              }
            />
            {d.isActive ? "On" : "Off"}
          </button>
          <AdminV3Button
            variant="primary"
            className="h-[34px] font-medium"
            disabled={!ready || saving}
            onClick={save}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {d.id ? "Save changes" : "Publish notice"}
          </AdminV3Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {/* ------------------------------------------------------ Preview */}
        <V3Card className="min-w-0 flex-[1_1_380px]">
          <CardHead
            title="What customers see"
            right={
              <StatusPill tone="outline" className="font-medium">
                4:3, over your menu
              </StatusPill>
            }
          />
          <div className="rounded-b-none bg-zinc-50 p-4 dark:bg-zinc-800/50 lg:rounded-b-xl">
            {d.type === "poster" ? (
              d.posterImage ? (
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[10px] border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.posterImage}
                    alt="Poster preview"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="h-full w-full select-none object-contain"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-[9px] rounded-[10px] border border-dashed border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
                >
                  <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
                    {uploading ? (
                      <Loader2 size={19} className="animate-spin" />
                    ) : (
                      <ImageIcon size={19} strokeWidth={1.7} />
                    )}
                  </span>
                  <span className="text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                    Drop your poster here
                  </span>
                  <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
                    or paste a URL below · JPG or PNG
                  </span>
                </button>
              )
            ) : (
              <>
                {/* aspect-[4/3] is load-bearing: NoticeCanvas is `w-full h-full`
                    with no intrinsic size, so without a sized box its height
                    resolves to 0 and the preview renders blank. The notice list
                    rows wrap it the same way, and so does admin-v2. */}
                <div className="aspect-[4/3] w-full select-none overflow-hidden rounded-[10px] border border-zinc-200 dark:border-zinc-700">
                  <NoticeCanvas config={d.config} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminV3Button
                    variant="small"
                    className="h-[34px] text-[13px]"
                    onClick={() =>
                      hasButton
                        ? setConfig(removeButton(d.config))
                        : setConfig(setButton(d.config, "Learn more", theme))
                    }
                  >
                    {hasButton ? (
                      <MinusCircle size={14} strokeWidth={1.8} className="text-zinc-500" />
                    ) : (
                      <PlusCircle size={14} strokeWidth={1.8} className="text-zinc-500" />
                    )}
                    {hasButton ? "Remove button" : "Add button"}
                  </AdminV3Button>
                </div>
              </>
            )}
          </div>
        </V3Card>

        {/* -------------------------------------------------- Right column */}
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          {d.type === "custom" ? (
            <V3Card>
              <CardHead title="Content" />
              <div className="flex flex-col gap-3 px-4 py-3.5">
                <label className="block">
                  <span className={FIELD_LABEL}>Headline</span>
                  <input
                    type="text"
                    translate="no"
                    className={FIELD + " notranslate"}
                    placeholder="Something new"
                    value={headlineOf(d.config)}
                    onChange={(e) =>
                      setConfig(setNth(d.config, 0, e.target.value, theme?.ink ?? "#ffffff"))
                    }
                  />
                </label>
                <label className="block">
                  <span className={FIELD_LABEL}>Message</span>
                  <input
                    type="text"
                    translate="no"
                    className={FIELD + " notranslate"}
                    placeholder="Tell customers what is happening"
                    value={bodyOf(d.config)}
                    onChange={(e) =>
                      setConfig(setNth(d.config, 1, e.target.value, theme?.ink ?? "#ffffff"))
                    }
                  />
                </label>
                {hasButton && (
                  <label className="block">
                    <span className={FIELD_LABEL}>Button label</span>
                    <input
                      type="text"
                      translate="no"
                      className={FIELD + " notranslate"}
                      placeholder="Learn more"
                      value={buttonLabelOf(d.config)}
                      onChange={(e) => setConfig(setButton(d.config, e.target.value, theme))}
                    />
                  </label>
                )}

                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className={FIELD_LABEL}>Colour</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {THEMES.map((t) => {
                      const active = theme?.key === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          title={t.name}
                          aria-label={t.name}
                          onClick={() => setConfig(applyTheme(d.config, t))}
                          className={
                            "h-[38px] w-[38px] shrink-0 cursor-pointer rounded-lg border-2 p-0 " +
                            (active
                              ? "border-zinc-900 dark:border-zinc-50"
                              : "border-zinc-200 dark:border-zinc-700")
                          }
                          style={{
                            background: gradientCss({ from: t.from, to: t.to, angle: t.angle }),
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className={HINT}>
                    {theme
                      ? `${theme.name} — text is set to match.`
                      : "Custom colours from the old editor. Pick a swatch to replace them."}
                  </div>
                </div>
              </div>
            </V3Card>
          ) : (
            <V3Card>
              <CardHead
                title="Image"
                right={
                  <Segmented<"upload" | "url">
                    value={imageMode}
                    onChange={setImageMode}
                    options={[
                      { value: "upload", label: "Upload" },
                      { value: "url", label: "URL" },
                    ]}
                  />
                }
              />
              <div className="px-4 py-3.5">
                {imageMode === "url" ? (
                  <input
                    type="text"
                    className={FIELD + " mt-0"}
                    placeholder="https://…"
                    value={d.posterImage}
                    onChange={(e) => patch({ posterImage: e.target.value })}
                  />
                ) : (
                  <AdminV3Button
                    variant="small"
                    className="h-9 w-full text-[13px]"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ImageIcon size={15} strokeWidth={1.7} className="text-zinc-500" />
                    )}
                    {uploading ? "Uploading…" : "Choose an image"}
                  </AdminV3Button>
                )}
                {d.posterImage && (
                  <button
                    type="button"
                    onClick={() => patch({ posterImage: "" })}
                    className="mt-2 text-[12.5px] font-medium leading-none text-red-600 hover:underline dark:text-red-500"
                  >
                    Remove image
                  </button>
                )}
                <div className={HINT}>
                  Shown at 90% of the screen width. A 4:3 image fits without cropping.
                </div>
              </div>
            </V3Card>
          )}

          {/* --------------------------------------------------- Behaviour */}
          <V3Card>
            <CardHead title="Behaviour" />
            <div className="flex flex-col gap-3.5 px-4 py-3.5">
              <div>
                <div className="flex items-center gap-[7px]">
                  <Link2 size={14} strokeWidth={1.8} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <span className={FIELD_LABEL}>When tapped</span>
                </div>
                <input
                  type="text"
                  className={FIELD}
                  placeholder="https://… or /offers"
                  value={d.link}
                  onChange={(e) => patch({ link: e.target.value })}
                />
                <div className={HINT}>
                  Leave blank and tapping just closes it. A path like /offers stays on your
                  storefront.
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <div className="flex items-center gap-[7px]">
                  <Clock size={14} strokeWidth={1.8} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <span className={FIELD_LABEL}>Closes on its own</span>
                </div>
                <div className="mt-2 overflow-x-auto">
                  <Segmented<number>
                    value={d.autoCloseSeconds}
                    onChange={(v) => patch({ autoCloseSeconds: v })}
                    options={[
                      { value: 0, label: "Stays open" },
                      { value: 3, label: "3s" },
                      { value: 5, label: "5s" },
                      { value: 10, label: "10s" },
                    ]}
                  />
                </div>
                <div className={HINT}>{closeHint}</div>
              </div>

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <span className={FIELD_LABEL}>Runs</span>
                <div className="mt-2">
                  <Segmented<"now" | "sched">
                    value={d.scheduled ? "sched" : "now"}
                    onChange={(v) => patch({ scheduled: v === "sched" })}
                    options={[
                      { value: "now", label: "Live now" },
                      { value: "sched", label: "Schedule" },
                    ]}
                  />
                </div>
                {d.scheduled && (
                  <div className="mt-2.5 flex flex-wrap gap-[9px]">
                    <label className="min-w-0 flex-[1_1_130px]">
                      <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
                        From
                      </span>
                      <input
                        type="datetime-local"
                        className={FIELD}
                        value={d.startsAt}
                        onChange={(e) => patch({ startsAt: e.target.value })}
                      />
                    </label>
                    <label className="min-w-0 flex-[1_1_130px]">
                      <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
                        Until
                      </span>
                      <input
                        type="datetime-local"
                        className={FIELD}
                        value={d.expiresAt}
                        onChange={(e) => patch({ expiresAt: e.target.value })}
                      />
                    </label>
                  </div>
                )}
                <div className={HINT}>{runHint}</div>
              </div>
            </div>
          </V3Card>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
