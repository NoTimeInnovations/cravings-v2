"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import {
  Plus, Trash2, Loader2, ArrowLeft, Image as ImageIcon, Sparkles, Type,
  MousePointerClick, Bold, AlignLeft, AlignCenter, AlignRight, Pencil, FileText, X,
} from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getNoticesQuery, createNoticeMutation, updateNoticeMutation, deleteNoticeMutation,
} from "@/api/notices";
import { revalidateTag } from "@/app/actions/revalidate";
import { ImageUpload } from "@/components/storefront/ImageUpload";
import { NoticeCanvas } from "@/components/notices/NoticeCanvas";
import {
  NoticeRow, NoticeCustomConfig, NoticeElement, NoticeType,
  defaultCustomConfig, toRenderable, gradientCss,
} from "@/types/notices";

// A draft being edited (create or update).
interface Draft {
  id?: string;
  type: NoticeType;
  posterImage: string;
  posterLink: string;
  config: NoticeCustomConfig;
  isActive: boolean;
  scheduled: boolean;
  startsAt: string; // datetime-local value
  expiresAt: string;
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

function emptyDraft(): Draft {
  return {
    type: "custom",
    posterImage: "",
    posterLink: "",
    config: defaultCustomConfig(),
    isActive: true,
    scheduled: false,
    startsAt: "",
    expiresAt: "",
  };
}

function rowToDraft(n: NoticeRow): Draft {
  const isPoster = n.type === "poster" || (!!n.image_url && /^https?:\/\//.test(n.image_url) && n.type !== "custom");
  return {
    id: n.id,
    type: isPoster ? "poster" : "custom",
    posterImage: isPoster ? n.image_url || "" : "",
    posterLink: n.button_link || "",
    config: n.config?.elements ? n.config : defaultCustomConfig(),
    isActive: n.is_active,
    scheduled: !!(n.starts_at || n.expires_at),
    startsAt: toLocalInput(n.starts_at),
    expiresAt: toLocalInput(n.expires_at),
  };
}

export function AdminV2Notices() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);

  const fetchNotices = useCallback(async () => {
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

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (draft) {
    return (
      <NoticeEditor
        draft={draft}
        partnerId={partnerId}
        onClose={() => setDraft(null)}
        onSaved={() => { setDraft(null); fetchNotices(); }}
      />
    );
  }

  const handleToggle = async (n: NoticeRow) => {
    try {
      await fetchFromHasura(updateNoticeMutation, { id: n.id, updates: { is_active: !n.is_active } });
      setNotices((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_active: !x.is_active } : x)));
      if (partnerId) revalidateTag(partnerId);
    } catch {
      toast.error("Failed to update notice");
    }
  };
  const handleDelete = async (n: NoticeRow) => {
    if (!confirm("Delete this notice?")) return;
    try {
      await fetchFromHasura(deleteNoticeMutation, { id: n.id });
      setNotices((prev) => prev.filter((x) => x.id !== n.id));
      if (partnerId) revalidateTag(partnerId);
      toast.success("Notice deleted");
    } catch {
      toast.error("Failed to delete notice");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Storefront notices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A pop-up customers see when they open your storefront. Design a poster or a custom announcement.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDraft({ ...emptyDraft(), type: "poster" })}>
            <ImageIcon className="h-4 w-4 mr-2" /> Poster
          </Button>
          <Button onClick={() => setDraft(emptyDraft())} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> New notice
          </Button>
        </div>
      </div>

      {notices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No notices yet</p>
            <p className="text-sm text-gray-400 mt-1">Create a poster or a custom announcement to greet your customers.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {notices.map((n) => {
            const r = toRenderable(n);
            return (
              <div key={n.id} className={`rounded-xl border overflow-hidden bg-card ${n.is_active ? "" : "opacity-60"}`}>
                <div className="relative aspect-[4/3] bg-muted">
                  {r?.kind === "poster" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : r?.kind === "custom" ? (
                    <div className="w-full h-full pointer-events-none"><NoticeCanvas config={r.config} /></div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-center p-4 bg-gradient-to-br from-slate-700 to-slate-900 text-white text-sm">
                      {r?.kind === "legacy" ? r.title : "Notice"}
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-black/50 text-white">
                    {n.type === "poster" ? "Poster" : n.type === "custom" ? "Custom" : "Text"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={n.is_active} onCheckedChange={() => handleToggle(n)} />
                    {n.is_active ? "Live" : "Off"}
                  </div>
                  <div className="flex gap-1">
                    {(n.type === "poster" || n.type === "custom") && (
                      <Button variant="ghost" size="sm" onClick={() => setDraft(rowToDraft(n))} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(n)} className="text-red-500 hover:text-red-600" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────
function NoticeEditor({
  draft: initial, partnerId, onClose, onSaved,
}: {
  draft: Draft;
  partnerId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [selId, setSelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }));
  const setConfig = (c: NoticeCustomConfig) => patch({ config: c });
  const sel = d.config.elements.find((e) => e.id === selId) || null;

  const updateEl = (id: string, p: Partial<NoticeElement>) =>
    setConfig({ ...d.config, elements: d.config.elements.map((e) => (e.id === id ? { ...e, ...p } : e)) });
  const addText = () => {
    const el: NoticeElement = { id: newId(), kind: "text", text: "New text", xPct: 15, yPct: 40, fontSize: 32, color: "#ffffff", align: "left" };
    setConfig({ ...d.config, elements: [...d.config.elements, el] });
    setSelId(el.id);
  };
  const addButton = () => {
    const el: NoticeElement = { id: newId(), kind: "button", text: "Tap here", xPct: 15, yPct: 55, fontSize: 22, color: "#111827", link: "", bg: "#ffffff", textColor: "#111827" };
    setConfig({ ...d.config, elements: [...d.config.elements, el] });
    setSelId(el.id);
  };
  const removeEl = (id: string) => {
    setConfig({ ...d.config, elements: d.config.elements.filter((e) => e.id !== id) });
    setSelId(null);
  };

  const save = async () => {
    if (!partnerId) return;
    if (d.type === "poster" && !d.posterImage) { toast.error("Upload a poster image"); return; }
    if (d.type === "custom" && d.config.elements.length === 0) { toast.error("Add at least one text or button"); return; }
    setSaving(true);
    try {
      const base: Record<string, any> = {
        type: d.type,
        is_active: d.isActive,
        show_always: true,
        starts_at: d.scheduled ? fromLocalInput(d.startsAt) : null,
        expires_at: d.scheduled ? fromLocalInput(d.expiresAt) : null,
        image_url: d.type === "poster" ? d.posterImage : "",
        button_link: d.type === "poster" ? d.posterLink.trim() || null : null,
        config: d.type === "custom" ? d.config : null,
      };
      if (d.id) {
        await fetchFromHasura(updateNoticeMutation, { id: d.id, updates: base });
      } else {
        await fetchFromHasura(createNoticeMutation, { object: { ...base, partner_id: partnerId, priority: 0 } });
      }
      if (partnerId) revalidateTag(partnerId);
      toast.success(d.id ? "Notice updated" : "Notice created");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save notice");
    } finally {
      setSaving(false);
    }
  };

  const statusSchedule = (
    <div className="rounded-xl border bg-white dark:bg-neutral-900 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Switch checked={d.isActive} onCheckedChange={(v) => patch({ isActive: v })} />
          <span className="text-sm font-medium">{d.isActive ? "Live" : "Off"}</span>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={d.scheduled}
            onChange={(e) => patch({ scheduled: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 accent-orange-600 cursor-pointer"
          />
          Schedule
        </label>
      </div>
      {d.scheduled && (
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">Starts</Label>
            <Input type="datetime-local" value={d.startsAt} onChange={(e) => patch({ startsAt: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Ends</Label>
            <Input type="datetime-local" value={d.expiresAt} onChange={(e) => patch({ expiresAt: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <h1 className="text-xl font-bold">{d.id ? "Edit notice" : "New notice"}</h1>
        </div>
        <Button onClick={save} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {d.id ? "Save changes" : "Publish notice"}
        </Button>
      </div>

      {/* Type toggle */}
      <div className="inline-flex rounded-lg border p-1 bg-muted/40">
        {(["poster", "custom"] as NoticeType[]).map((t) => (
          <button
            key={t}
            onClick={() => patch({ type: t })}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${d.type === t ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          >
            {t === "poster" ? <ImageIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {t === "poster" ? "Poster" : "Custom design"}
          </button>
        ))}
      </div>

      {d.type === "poster" ? (
        <div className="grid gap-5 sm:grid-cols-2 rounded-xl border bg-white dark:bg-neutral-900 p-4">
          <div className="space-y-2">
            <Label>Poster image</Label>
            {d.posterImage ? (
              <div className="relative rounded-xl border bg-neutral-50 dark:bg-neutral-800 p-2 flex items-center justify-center min-h-[160px]">
                {/* Natural aspect ratio — not cropped. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.posterImage}
                  alt="Poster preview"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="max-h-[60vh] w-auto max-w-full rounded-lg select-none [-webkit-touch-callout:none] [-webkit-user-drag:none]"
                />
                <Button size="sm" variant="destructive" type="button" onClick={() => patch({ posterImage: "" })} className="absolute top-3 right-3">
                  <X className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <ImageUpload value="" onChange={(url) => patch({ posterImage: url })} label="" folder="notices" />
            )}
            <p className="text-xs text-muted-foreground">Shown at 90% × 80% of the screen. A 4:3 image looks best.</p>
          </div>
          <div className="space-y-2">
            <Label>Link when tapped (optional)</Label>
            <Input value={d.posterLink} onChange={(e) => patch({ posterLink: e.target.value })} placeholder="https://… or /offers" />
            <p className="text-xs text-muted-foreground">Tapping the poster opens this. External links open in a new tab; a path like <code>/offers</code> stays on your storefront.</p>
            <div className="pt-2">{statusSchedule}</div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* Canvas */}
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden border shadow-sm">
              <div className="aspect-[4/3] w-full select-none">
                <NoticeCanvas
                  config={d.config}
                  editable
                  selectedId={selId}
                  onSelectElement={setSelId}
                  onMoveElement={(id, x, y) => updateEl(id, { xPct: x, yPct: y })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={addText}><Type className="h-4 w-4 mr-1.5" /> Add text</Button>
              <Button variant="outline" size="sm" onClick={addButton}><MousePointerClick className="h-4 w-4 mr-1.5" /> Add button</Button>
              {sel && <Button variant="outline" size="sm" onClick={() => removeEl(sel.id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-1.5" /> Delete element</Button>}
            </div>
            <p className="text-xs text-muted-foreground">Drag any element to move it. Tap an element to edit it on the right.</p>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Background gradient */}
            <div className="rounded-xl border bg-white dark:bg-neutral-900 p-3 space-y-3">
              <p className="text-sm font-semibold">Background</p>
              <div className="h-8 rounded-md border" style={{ background: gradientCss(d.config.gradient) }} />
              <div className="flex items-center gap-2">
                <ColorInput label="From" value={d.config.gradient.from} onChange={(v) => setConfig({ ...d.config, gradient: { ...d.config.gradient, from: v } })} />
                <ColorInput label="To" value={d.config.gradient.to} onChange={(v) => setConfig({ ...d.config, gradient: { ...d.config.gradient, to: v } })} />
              </div>
              <div>
                <Label className="text-xs">Angle · {d.config.gradient.angle}°</Label>
                <input type="range" min={0} max={360} value={d.config.gradient.angle}
                  onChange={(e) => setConfig({ ...d.config, gradient: { ...d.config.gradient, angle: Number(e.target.value) } })}
                  className="w-full" />
              </div>
            </div>

            {/* Selected element */}
            {sel ? (
              <div className="rounded-xl border bg-white dark:bg-neutral-900 p-3 space-y-3">
                <p className="text-sm font-semibold capitalize">{sel.kind} settings</p>
                <div>
                  <Label className="text-xs">Text</Label>
                  <Input value={sel.text} onChange={(e) => updateEl(sel.id, { text: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Size · {sel.fontSize}</Label>
                  <input type="range" min={12} max={96} value={sel.fontSize} onChange={(e) => updateEl(sel.id, { fontSize: Number(e.target.value) })} className="w-full" />
                </div>
                <div className="flex items-center gap-2">
                  {sel.kind === "text"
                    ? <ColorInput label="Color" value={sel.color} onChange={(v) => updateEl(sel.id, { color: v })} />
                    : <>
                        <ColorInput label="Button" value={sel.bg || "#ffffff"} onChange={(v) => updateEl(sel.id, { bg: v })} />
                        <ColorInput label="Text" value={sel.textColor || "#111827"} onChange={(v) => updateEl(sel.id, { textColor: v })} />
                      </>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant={sel.bold ? "default" : "outline"} size="sm" onClick={() => updateEl(sel.id, { bold: !sel.bold })}><Bold className="h-4 w-4" /></Button>
                  {(["left", "center", "right"] as const).map((a) => {
                    const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                    return <Button key={a} variant={sel.align === a ? "default" : "outline"} size="sm" onClick={() => updateEl(sel.id, { align: a })}><Icon className="h-4 w-4" /></Button>;
                  })}
                </div>
                {sel.kind === "button" && (
                  <div>
                    <Label className="text-xs">Link</Label>
                    <Input value={sel.link || ""} onChange={(e) => updateEl(sel.id, { link: e.target.value })} placeholder="https://… or /offers" />
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-white dark:bg-neutral-900 p-3 text-xs text-muted-foreground text-center">
                Tap an element on the canvas to edit it.
              </div>
            )}
            {statusSchedule}
          </div>
        </div>
      )}
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex-1 flex items-center gap-2 text-xs">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value) ? value.slice(0, 7) : "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 rounded border cursor-pointer p-0"
      />
      <span className="text-muted-foreground">{label}</span>
    </label>
  );
}
