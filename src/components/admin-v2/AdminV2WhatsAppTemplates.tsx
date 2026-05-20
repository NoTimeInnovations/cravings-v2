"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  Loader2,
  Pencil,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type HeaderFormat = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
type ButtonKind = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";

interface ButtonDraft {
  type: ButtonKind;
  text: string;
  url?: string;
  phone_number?: string;
}

interface TemplateRow {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  meta_template_id: string | null;
  rejection_reason: string | null;
  components: any[];
  created_at: string;
}

const LANGUAGES = [
  { code: "en_US", label: "English (US)" },
  { code: "en", label: "English" },
  { code: "en_GB", label: "English (UK)" },
  { code: "hi", label: "Hindi" },
  { code: "ml", label: "Malayalam" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bengali" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "ar", label: "Arabic" },
];

const CATEGORIES: Array<{ value: "UTILITY" | "MARKETING" | "AUTHENTICATION"; label: string; hint: string }> = [
  { value: "UTILITY", label: "Utility", hint: "Order updates, account alerts, receipts" },
  { value: "MARKETING", label: "Marketing", hint: "Promotions, offers, announcements" },
  { value: "AUTHENTICATION", label: "Authentication", hint: "One-time passcodes, login codes" },
];

function statusVariant(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-800 border-green-200";
    case "PENDING":
    case "DRAFT":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "REJECTED":
    case "DISABLED":
      return "bg-red-100 text-red-800 border-red-200";
    case "PAUSED":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function previewText(body: string, samples: string[]) {
  return body.replace(/\{\{(\d+)\}\}/g, (_m, idx) => {
    const i = parseInt(idx, 10) - 1;
    return samples[i] ? samples[i] : `{{${idx}}}`;
  });
}

function variableCount(body: string): number {
  const matches = body.match(/\{\{(\d+)\}\}/g) || [];
  const indices = new Set<number>();
  matches.forEach((m) => {
    const n = parseInt(m.replace(/[{}]/g, ""), 10);
    if (!isNaN(n)) indices.add(n);
  });
  return indices.size;
}

export function AdminV2WhatsAppTemplates() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  const load = async (withSync = false) => {
    if (!partnerId) return;
    if (withSync) setSyncing(true);
    else setLoading(true);
    try {
      const url = `/api/whatsapp/templates?partnerId=${partnerId}${withSync ? "&sync=1" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setTemplates(data.templates || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load templates");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const loadStatus = async () => {
    if (!partnerId) return;
    try {
      const res = await fetch(`/api/whatsapp/meta/status?partnerId=${partnerId}`);
      const data = await res.json();
      setConnected(!!data.connected);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    if (!partnerId) return;
    loadStatus();
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const handleDelete = async (row: TemplateRow) => {
    if (!partnerId) return;
    if (!confirm(`Delete template "${row.name}"? This removes it from Meta too.`)) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(
        `/api/whatsapp/templates/${row.id}?partnerId=${partnerId}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete");
      toast.success("Template deleted");
      setTemplates((t) => t.filter((x) => x.id !== row.id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-green-600" />
            WhatsApp Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Create message templates and submit them to Meta for approval. Approved templates can
            be sent to your customers through the WhatsApp Business API.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => load(true)}
            disabled={syncing || !connected}
            title={!connected ? "Connect your WABA in Settings first" : "Sync statuses from Meta"}
          >
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync from Meta
          </Button>
          <Button
            onClick={() => setCreatorOpen(true)}
            disabled={!connected}
            title={!connected ? "Connect your WABA in Settings first" : "Create a new template"}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {connected === false && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex gap-3 p-4 items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-amber-900">
                Connect your WhatsApp Business Account
              </div>
              <div className="text-amber-800/80 mt-0.5">
                Template management requires a connected WABA. Open Settings → WhatsApp Business
                and click <b>Connect WhatsApp Business</b>.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your templates</CardTitle>
          <CardDescription>
            Templates auto-review at Meta within ~24h. Sync to refresh statuses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No templates yet. Click <b>New Template</b> to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{t.name}</span>
                      <Badge variant="outline" className="font-normal">{t.language}</Badge>
                      <Badge variant="outline" className="font-normal">{t.category}</Badge>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded border ${statusVariant(t.status)}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    {t.rejection_reason &&
                      t.rejection_reason.trim().toUpperCase() !== "NONE" && (
                        <div className="text-xs text-red-700 mt-1">
                          Rejected: {t.rejection_reason}
                        </div>
                      )}
                  </div>
                  <div className="flex gap-1 self-end sm:self-auto">
                    {(t.status === "APPROVED" || t.status === "REJECTED") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTemplate(t)}
                        title="Edit template"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t)}
                      disabled={deletingId === t.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TemplateEditorDialog
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        partnerId={partnerId}
        mode="create"
        onSaved={() => {
          setCreatorOpen(false);
          load(false);
        }}
      />

      <TemplateEditorDialog
        open={!!editingTemplate}
        onOpenChange={(o) => !o && setEditingTemplate(null)}
        partnerId={partnerId}
        mode="edit"
        initial={editingTemplate}
        onSaved={() => {
          setEditingTemplate(null);
          load(false);
        }}
      />
    </div>
  );
}

function TemplateEditorDialog({
  open,
  onOpenChange,
  partnerId,
  mode,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string | undefined;
  mode: "create" | "edit";
  initial?: TemplateRow | null;
  onSaved: () => void;
}) {
  const isEdit = mode === "edit";
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [category, setCategory] = useState<"UTILITY" | "MARKETING" | "AUTHENTICATION">("UTILITY");
  const [headerFormat, setHeaderFormat] = useState<HeaderFormat>("NONE");
  const [headerText, setHeaderText] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [headerSample, setHeaderSample] = useState("");
  const [body, setBody] = useState("");
  const [bodySamples, setBodySamples] = useState<string[]>([]);
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<ButtonDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setLanguage("en_US");
    setCategory("UTILITY");
    setHeaderFormat("NONE");
    setHeaderText("");
    setHeaderMediaUrl("");
    setHeaderSample("");
    setBody("");
    setBodySamples([]);
    setFooter("");
    setButtons([]);
  };

  // Prefill the form from an existing template when entering edit mode (or
  // when the same dialog is re-opened with a different row).
  useEffect(() => {
    if (!open) return;
    if (isEdit && initial) {
      setName(initial.name);
      setLanguage(initial.language);
      setCategory(initial.category as any);
      let header: HeaderFormat = "NONE";
      let headerTxt = "";
      let headerMedia = "";
      let headerEx = "";
      let bodyTxt = "";
      let bodyEx: string[] = [];
      let footerTxt = "";
      let btns: ButtonDraft[] = [];
      for (const c of initial.components || []) {
        if (c.type === "HEADER") {
          header = (c.format || "TEXT") as HeaderFormat;
          if (header === "TEXT") {
            headerTxt = c.text || "";
            headerEx = c.example?.header_text?.[0] || "";
          } else {
            headerMedia = c.example?.header_handle?.[0] || "";
          }
        } else if (c.type === "BODY") {
          bodyTxt = c.text || "";
          bodyEx = c.example?.body_text?.[0] || [];
        } else if (c.type === "FOOTER") {
          footerTxt = c.text || "";
        } else if (c.type === "BUTTONS") {
          btns = (c.buttons || []).slice(0, 3).map((b: any) => ({
            type: b.type as ButtonKind,
            text: b.text || "",
            url: b.url,
            phone_number: b.phone_number,
          }));
        }
      }
      setHeaderFormat(header);
      setHeaderText(headerTxt);
      setHeaderMediaUrl(headerMedia);
      setHeaderSample(headerEx);
      setBody(bodyTxt);
      setBodySamples(bodyEx);
      setFooter(footerTxt);
      setButtons(btns);
    } else if (!isEdit) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, initial?.id]);

  // Keep bodySamples length in sync with the {{n}} variable count.
  const varCount = useMemo(() => variableCount(body), [body]);
  useEffect(() => {
    setBodySamples((s) => {
      const next = [...s];
      while (next.length < varCount) next.push("");
      next.length = varCount;
      return next;
    });
  }, [varCount]);

  // Header may include a single {{1}} variable per Meta's rules
  const headerHasVar = /\{\{\d+\}\}/.test(headerText);

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
  const nameInvalid = !slug || slug.length < 3 || slug.length > 512;

  const addButton = (type: ButtonKind) => {
    if (buttons.length >= 3) return;
    setButtons((b) => [...b, { type, text: "" }]);
  };
  const updateButton = (idx: number, patch: Partial<ButtonDraft>) => {
    setButtons((b) => b.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };
  const removeButton = (idx: number) => {
    setButtons((b) => b.filter((_, i) => i !== idx));
  };

  const buildComponents = (): any[] => {
    const comps: any[] = [];
    if (headerFormat !== "NONE") {
      if (headerFormat === "TEXT" && headerText) {
        const header: any = { type: "HEADER", format: "TEXT", text: headerText };
        if (headerHasVar && headerSample) {
          header.example = { header_text: [headerSample] };
        }
        comps.push(header);
      } else if (headerFormat !== "TEXT" && headerMediaUrl) {
        comps.push({
          type: "HEADER",
          format: headerFormat,
          example: { header_handle: [headerMediaUrl] },
        });
      }
    }
    if (body) {
      const bodyComp: any = { type: "BODY", text: body };
      if (varCount > 0 && bodySamples.every((s) => s.trim().length > 0)) {
        bodyComp.example = { body_text: [bodySamples] };
      }
      comps.push(bodyComp);
    }
    if (footer.trim()) {
      comps.push({ type: "FOOTER", text: footer.trim() });
    }
    if (buttons.length > 0) {
      const cleanButtons = buttons
        .filter((b) => b.text.trim())
        .map((b) => {
          if (b.type === "URL") return { type: "URL", text: b.text, url: b.url || "" };
          if (b.type === "PHONE_NUMBER")
            return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number || "" };
          return { type: "QUICK_REPLY", text: b.text };
        });
      if (cleanButtons.length > 0) {
        comps.push({ type: "BUTTONS", buttons: cleanButtons });
      }
    }
    return comps;
  };

  const valid =
    !nameInvalid &&
    body.trim().length > 0 &&
    (varCount === 0 || bodySamples.every((s) => s.trim().length > 0)) &&
    (headerFormat !== "TEXT" || !headerHasVar || headerSample.trim().length > 0) &&
    buttons.every((b) => {
      if (!b.text.trim()) return false;
      if (b.type === "URL" && !b.url?.trim()) return false;
      if (b.type === "PHONE_NUMBER" && !b.phone_number?.trim()) return false;
      return true;
    });

  const submit = async () => {
    if (!partnerId) return;
    if (!valid) {
      toast.error("Please fill in all required fields, including example values.");
      return;
    }
    setSubmitting(true);
    try {
      let res: Response;
      if (isEdit && initial) {
        res = await fetch(
          `/api/whatsapp/templates/${initial.id}?partnerId=${partnerId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category,
              components: buildComponents(),
            }),
          },
        );
      } else {
        res = await fetch("/api/whatsapp/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partnerId,
            name: slug,
            language,
            category,
            components: buildComponents(),
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Meta rejected the template");
      toast.success(
        isEdit
          ? "Template updated — Meta will re-review within 24h"
          : "Template submitted — Meta will review within 24h",
      );
      reset();
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit template");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="!max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto sm:!max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit WhatsApp template" : "New WhatsApp template"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? (
              <>
                Name and language can't be changed after creation. Editing puts the template
                back into review at Meta.
              </>
            ) : (
              <>
                Templates are reviewed by Meta. Use <code>{"{{1}}"}</code> placeholders for variables
                and provide example values.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Left column: form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="order_status_update"
                disabled={isEdit}
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Name is locked. To rename, delete and recreate."
                  : <>Slug: <code>{slug || "—"}</code>. Lowercase, 3–512 chars, letters/numbers/underscore only.</>}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage} disabled={isEdit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {CATEGORIES.find((c) => c.value === category)?.hint}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Header</Label>
              <Select value={headerFormat} onValueChange={(v) => setHeaderFormat(v as HeaderFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No header</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                </SelectContent>
              </Select>
              {headerFormat === "TEXT" && (
                <>
                  <Input
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="Hello {{1}}"
                    maxLength={60}
                  />
                  {headerHasVar && (
                    <Input
                      value={headerSample}
                      onChange={(e) => setHeaderSample(e.target.value)}
                      placeholder="Example value for {{1}}"
                    />
                  )}
                </>
              )}
              {headerFormat !== "NONE" && headerFormat !== "TEXT" && (
                <Input
                  value={headerMediaUrl}
                  onChange={(e) => setHeaderMediaUrl(e.target.value)}
                  placeholder="https://… example media URL"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Hi {{1}}, your order #{{2}} is ready for pickup."
                maxLength={1024}
              />
              <p className="text-xs text-muted-foreground">
                {body.length}/1024 · {varCount} variable{varCount === 1 ? "" : "s"}
              </p>
              {varCount > 0 && (
                <div className="space-y-1.5 pl-3 border-l-2 border-muted">
                  <p className="text-xs font-medium text-muted-foreground">Example values</p>
                  {bodySamples.map((s, i) => (
                    <Input
                      key={i}
                      value={s}
                      onChange={(e) => {
                        const next = [...bodySamples];
                        next[i] = e.target.value;
                        setBodySamples(next);
                      }}
                      placeholder={`Example for {{${i + 1}}}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Footer (optional)</Label>
              <Input
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Reply STOP to unsubscribe"
                maxLength={60}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label>Buttons (optional, up to 3)</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addButton("QUICK_REPLY")}
                    disabled={buttons.length >= 3}
                  >
                    + Quick reply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addButton("URL")}
                    disabled={buttons.length >= 3}
                  >
                    + URL
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addButton("PHONE_NUMBER")}
                    disabled={buttons.length >= 3}
                  >
                    + Phone
                  </Button>
                </div>
              </div>
              {buttons.map((b, i) => (
                <div key={i} className="space-y-1.5 p-2 border rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {b.type === "QUICK_REPLY"
                        ? "Quick reply"
                        : b.type === "URL"
                        ? "URL button"
                        : "Phone button"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeButton(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={b.text}
                    onChange={(e) => updateButton(i, { text: e.target.value })}
                    placeholder="Button label"
                    maxLength={25}
                  />
                  {b.type === "URL" && (
                    <Input
                      value={b.url || ""}
                      onChange={(e) => updateButton(i, { url: e.target.value })}
                      placeholder="https://…"
                    />
                  )}
                  {b.type === "PHONE_NUMBER" && (
                    <Input
                      value={b.phone_number || ""}
                      onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                      placeholder="+1234567890"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right column: preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="rounded-lg border bg-[#e5ddd5] p-4 min-h-[300px]">
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-[88%] space-y-2 text-sm">
                {headerFormat === "TEXT" && headerText && (
                  <div className="font-semibold">
                    {headerHasVar ? previewText(headerText, [headerSample]) : headerText}
                  </div>
                )}
                {headerFormat !== "NONE" && headerFormat !== "TEXT" && headerMediaUrl && (
                  <div className="bg-muted rounded h-32 flex items-center justify-center text-xs text-muted-foreground">
                    {headerFormat} preview
                  </div>
                )}
                {body && (
                  <div className="whitespace-pre-wrap text-foreground">
                    {previewText(body, bodySamples)}
                  </div>
                )}
                {footer && (
                  <div className="text-xs text-muted-foreground">{footer}</div>
                )}
              </div>
              {buttons.length > 0 && (
                <div className="mt-2 space-y-1">
                  {buttons.map((b, i) => (
                    <div
                      key={i}
                      className="bg-white rounded text-center py-1.5 text-sm text-[#34B7F1] font-medium shadow-sm"
                    >
                      {b.text || "Button"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!valid || submitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEdit ? "Saving…" : "Submitting…"}
              </>
            ) : (
              isEdit ? "Save & resubmit" : "Submit for review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
