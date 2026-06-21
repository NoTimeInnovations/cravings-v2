"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Upload,
  X,
  Ban,
  Play,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ImageUpload } from "@/components/storefront/ImageUpload";
import VideoEditor from "@/components/VideoEditor";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { fetchFromHasura } from "@/lib/hasuraClient";

const DAILY_LIMIT = 250;

type VarSource = "phone" | "name" | "fixed";
interface VarMapItem {
  source: VarSource;
  value?: string;
}

interface TemplateRow {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: any[];
}

interface BroadcastRow {
  id: string;
  template_name: string;
  language: string;
  category: string;
  status: string;
  scheduled_at: string | null;
  daily_limit: number;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  created_at: string;
}

interface ParsedRecipient {
  phone: string;
  name: string;
}

// "Send now" creates a broadcast with status="scheduled" + scheduled_at=now; the
// per-minute cron then dispatches it. Show such due broadcasts as "queued" (not
// "scheduled", which is reserved for ones genuinely set for a future time).
function broadcastStatusLabel(
  status: string,
  scheduledAt: string | null,
): string {
  if (status === "scheduled") {
    const due = !scheduledAt || new Date(scheduledAt).getTime() <= Date.now();
    return due ? "queued" : "scheduled";
  }
  return status;
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "sending":
    case "queued":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "scheduled":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "paused":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "cancelled":
      return "bg-stone-100 text-stone-700 border-stone-200";
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// Count distinct {{n}} placeholders in a BODY component, ordered ascending.
function bodyVarIndices(components: any[]): number[] {
  const body = (components || []).find((c) => c?.type === "BODY");
  const text: string = body?.text || "";
  const indices = new Set<number>();
  (text.match(/\{\{(\d+)\}\}/g) || []).forEach((m) => {
    const n = parseInt(m.replace(/[{}]/g, ""), 10);
    if (!isNaN(n)) indices.add(n);
  });
  return [...indices].sort((a, b) => a - b);
}

function bodyText(components: any[]): string {
  return (components || []).find((c) => c?.type === "BODY")?.text || "";
}

// Header text variable: Meta allows a single {{1}} in a TEXT header.
function headerHasVar(components: any[]): boolean {
  const h = (components || []).find((c) => c?.type === "HEADER");
  return h?.format === "TEXT" && /\{\{\d+\}\}/.test(h?.text || "");
}

// Media header type for the template (image/video/document) — the broadcast must
// attach a media URL when present (sent as {<type>: { link }} to every recipient).
function headerMediaType(
  components: any[],
): "image" | "video" | "document" | null {
  const h = (components || []).find((c) => c?.type === "HEADER");
  const fmt = String(h?.format || "").toUpperCase();
  return ["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)
    ? (fmt.toLowerCase() as "image" | "video" | "document")
    : null;
}

// Pull the partner's customers (phone + name) from their non-cancelled orders.
const BROADCAST_CUSTOMERS_QUERY = `
  query BroadcastCustomers($partner_id: uuid!) {
    orders(
      where: { partner_id: { _eq: $partner_id }, status: { _neq: "cancelled" } }
      order_by: { created_at: desc }
      limit: 5000
    ) {
      phone
      user { full_name phone }
    }
  }
`;

export function AdminV2WhatsAppBroadcast() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;

  const [connected, setConnected] = useState<boolean | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const loadBroadcasts = async () => {
    if (!partnerId) return;
    try {
      const res = await fetch(`/api/whatsapp/broadcasts?partnerId=${partnerId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setBroadcasts(data.broadcasts || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load broadcasts");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!partnerId) return;
    try {
      const res = await fetch(`/api/whatsapp/templates?partnerId=${partnerId}`);
      const data = await res.json();
      // Broadcasts are promotional, so only approved MARKETING templates qualify.
      const marketing = (data.templates || []).filter(
        (t: TemplateRow) =>
          (t.status || "").toUpperCase() === "APPROVED" &&
          (t.category || "").toUpperCase() === "MARKETING",
      );
      setTemplates(marketing);
    } catch {
      /* surfaced in dialog */
    }
  };

  useEffect(() => {
    if (!partnerId) return;
    loadStatus();
    loadBroadcasts();
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  // Poll while anything is in flight so progress bars advance live.
  const hasActive = broadcasts.some(
    (b) => b.status === "sending" || b.status === "scheduled",
  );
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(loadBroadcasts, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActive, partnerId]);

  const act = async (id: string, action: "cancel" | "resume") => {
    if (!partnerId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/whatsapp/broadcasts/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Action failed");
      toast.success(action === "cancel" ? "Broadcast cancelled" : "Broadcast resumed");
      loadBroadcasts();
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-green-600" />
            Broadcast
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Send an approved marketing template to a list of customers. Sends run
            in the background, so you can close this page. Up to {DAILY_LIMIT}{" "}
            messages per day — larger lists continue automatically the next day
            after you resume.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadBroadcasts} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setCreatorOpen(true)}
            disabled={!connected}
            title={!connected ? "Connect your WABA in Settings first" : "New broadcast"}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> New Broadcast
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
                Broadcasting requires a connected WABA. Open Settings → WhatsApp
                Business and click <b>Connect WhatsApp Business</b>.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your broadcasts</CardTitle>
          <CardDescription>
            Track delivery progress. Cancel anytime, or resume one paused by the
            daily limit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No broadcasts yet. Click <b>New Broadcast</b> to send one.
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b) => {
                const done = b.sent_count + b.failed_count;
                const pct = b.total_recipients
                  ? Math.round((done / b.total_recipients) * 100)
                  : 0;
                return (
                  <div key={b.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{b.template_name}</span>
                          <Badge variant="outline" className="font-normal">
                            {b.language}
                          </Badge>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded border ${statusBadge(broadcastStatusLabel(b.status, b.scheduled_at))}`}
                          >
                            {broadcastStatusLabel(b.status, b.scheduled_at)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Users className="h-3 w-3" />
                          {b.total_recipients} recipients
                          {b.status === "scheduled" &&
                            (broadcastStatusLabel(b.status, b.scheduled_at) === "queued" ? (
                              <> · sending shortly</>
                            ) : (
                              b.scheduled_at && (
                                <> · scheduled {new Date(b.scheduled_at).toLocaleString()}</>
                              )
                            ))}
                        </div>
                      </div>
                      <div className="flex gap-1 self-end sm:self-auto">
                        {b.status === "paused" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => act(b.id, "resume")}
                            disabled={busyId === b.id}
                          >
                            {busyId === b.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-1" />
                            )}
                            Resume
                          </Button>
                        )}
                        {["scheduled", "sending", "paused"].includes(b.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => act(b.id, "cancel")}
                            disabled={busyId === b.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Ban className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Progress value={pct} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {b.sent_count} sent
                          {b.failed_count > 0 && (
                            <span className="text-red-600"> · {b.failed_count} failed</span>
                          )}
                        </span>
                        <span>
                          {done}/{b.total_recipients}
                        </span>
                      </div>
                    </div>

                    {b.last_error && b.status === "paused" && (
                      <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
                        {b.last_error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <BroadcastCreatorDialog
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        partnerId={partnerId}
        templates={templates}
        onCreated={() => {
          setCreatorOpen(false);
          loadBroadcasts();
        }}
      />
    </div>
  );
}

function BroadcastCreatorDialog({
  open,
  onOpenChange,
  partnerId,
  templates,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  partnerId: string | undefined;
  templates: TemplateRow[];
  onCreated: () => void;
}) {
  const [templateId, setTemplateId] = useState<string>("");
  const [varMap, setVarMap] = useState<VarMapItem[]>([]);
  const [headerValue, setHeaderValue] = useState("");
  const [manualText, setManualText] = useState("");
  const [excelRecipients, setExcelRecipients] = useState<ParsedRecipient[] | null>(null);
  const [excelFileName, setExcelFileName] = useState("");
  const [tab, setTab] = useState<"manual" | "excel" | "customers">("manual");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Media header (image/video/document) sent to every recipient via a public URL.
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [videoFileForEditor, setVideoFileForEditor] = useState<File | null>(null);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  // "My customers" recipient source (from non-cancelled order history).
  const [customers, setCustomers] = useState<ParsedRecipient[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerPhones, setSelectedCustomerPhones] = useState<Set<string>>(
    new Set(),
  );

  // Upload header media to S3 and store the public URL (sent as a {link}).
  const applyMedia = async (getUrl: () => Promise<string>) => {
    setUploadingMedia(true);
    try {
      setHeaderMediaUrl(await getUrl());
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
      setHeaderMediaUrl("");
    } finally {
      setUploadingMedia(false);
    }
  };

  const template = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templateId, templates],
  );
  const varIndices = useMemo(
    () => (template ? bodyVarIndices(template.components) : []),
    [template],
  );
  const hasHeaderVar = useMemo(
    () => (template ? headerHasVar(template.components) : false),
    [template],
  );
  const mediaHeaderType = useMemo(
    () => (template ? headerMediaType(template.components) : null),
    [template],
  );

  const reset = () => {
    setTemplateId("");
    setVarMap([]);
    setHeaderValue("");
    setManualText("");
    setExcelRecipients(null);
    setExcelFileName("");
    setTab("manual");
    setScheduleMode("now");
    setScheduleAt("");
    setHeaderMediaUrl("");
    setUploadingMedia(false);
    setVideoFileForEditor(null);
    setShowVideoEditor(false);
    setCustomers([]);
    setSelectedCustomerPhones(new Set());
  };

  // When the template changes, seed the variable map with sensible defaults:
  // {{1}} -> phone, {{2}} -> name, the rest -> a fixed value.
  useEffect(() => {
    if (!template) {
      setVarMap([]);
      return;
    }
    setVarMap(
      varIndices.map((_, i) =>
        i === 0
          ? { source: "phone" as VarSource }
          : i === 1
            ? { source: "name" as VarSource }
            : { source: "fixed" as VarSource, value: "" },
      ),
    );
    setHeaderValue("");
    setHeaderMediaUrl("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // Load the partner's customers (from orders) the first time the tab is opened.
  useEffect(() => {
    if (tab !== "customers" || !partnerId || customers.length || loadingCustomers) {
      return;
    }
    setLoadingCustomers(true);
    fetchFromHasura(BROADCAST_CUSTOMERS_QUERY, { partner_id: partnerId })
      .then((data: any) => {
        const seen = new Set<string>();
        const list: ParsedRecipient[] = [];
        for (const o of data?.orders || []) {
          const phone = String(o?.phone || o?.user?.phone || "").trim();
          const digits = phone.replace(/[\s\-\+\(\)]/g, "");
          if (digits.length < 10 || seen.has(digits)) continue;
          seen.add(digits);
          list.push({ phone, name: String(o?.user?.full_name || "").trim() });
        }
        setCustomers(list);
        setSelectedCustomerPhones(new Set(list.map((c) => c.phone)));
      })
      .catch(() => toast.error("Couldn't load customers"))
      .finally(() => setLoadingCustomers(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, partnerId]);

  // Parse the manual textarea: one recipient per line, "phone[,name]" (comma or tab).
  const manualRecipients = useMemo<ParsedRecipient[]>(() => {
    return manualText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\t]/).map((p) => p.trim());
        return { phone: parts[0] || "", name: parts[1] || "" };
      })
      .filter((r) => r.phone);
  }, [manualText]);

  const rawRecipients =
    tab === "excel"
      ? excelRecipients || []
      : tab === "customers"
        ? customers.filter((c) => selectedCustomerPhones.has(c.phone))
        : manualRecipients;

  // Validate + dedupe for the live counter shown to the user.
  const { valid, invalidCount, dupCount } = useMemo(() => {
    const seen = new Set<string>();
    let invalid = 0;
    let dup = 0;
    const out: ParsedRecipient[] = [];
    for (const r of rawRecipients) {
      const digits = (r.phone || "").replace(/[\s\-\+\(\)]/g, "");
      if (digits.length < 10) {
        invalid++;
        continue;
      }
      if (seen.has(digits)) {
        dup++;
        continue;
      }
      seen.add(digits);
      out.push(r);
    }
    return { valid: out, invalidCount: invalid, dupCount: dup };
  }, [rawRecipients]);

  const handleExcel = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      if (!rows.length) {
        toast.error("That sheet looks empty.");
        return;
      }
      // Detect a header row: look for "phone"/"name" labels.
      let phoneCol = 0;
      let nameCol = 1;
      let startRow = 0;
      const first = rows[0].map((c) => String(c ?? "").toLowerCase().trim());
      const looksLikeHeader = first.some(
        (c) => c.includes("phone") || c.includes("mobile") || c.includes("number") || c === "name",
      );
      if (looksLikeHeader) {
        startRow = 1;
        const pIdx = first.findIndex(
          (c) => c.includes("phone") || c.includes("mobile") || c.includes("number"),
        );
        const nIdx = first.findIndex((c) => c.includes("name"));
        if (pIdx >= 0) phoneCol = pIdx;
        if (nIdx >= 0) nameCol = nIdx;
      }
      const parsed: ParsedRecipient[] = [];
      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i] || [];
        const phone = String(row[phoneCol] ?? "").trim();
        const name = String(row[nameCol] ?? "").trim();
        if (phone) parsed.push({ phone, name });
      }
      if (!parsed.length) {
        toast.error("No phone numbers found. Expected a 'phone' column (and optional 'name').");
        return;
      }
      setExcelRecipients(parsed);
      setExcelFileName(file.name);
      toast.success(`Loaded ${parsed.length} rows from ${file.name}`);
    } catch (e: any) {
      console.error("Excel parse failed:", e);
      toast.error("Couldn't read that file. Use .xlsx or .csv with phone + name columns.");
    }
  };

  const previewText = useMemo(() => {
    if (!template) return "";
    let text = bodyText(template.components);
    const sample = valid[0];
    varIndices.forEach((n, i) => {
      const m = varMap[i];
      let v = `{{${n}}}`;
      if (m?.source === "phone") v = sample?.phone || "phone";
      else if (m?.source === "name") v = sample?.name || "name";
      else if (m?.source === "fixed") v = m.value || `{{${n}}}`;
      text = text.replace(new RegExp(`\\{\\{${n}\\}\\}`, "g"), v);
    });
    return text;
  }, [template, varIndices, varMap, valid]);

  const canSubmit =
    !!partnerId &&
    !!template &&
    valid.length > 0 &&
    varMap.every((m) => m.source !== "fixed" || (m.value ?? "").trim().length > 0) &&
    (!hasHeaderVar || headerValue.trim().length > 0) &&
    (!mediaHeaderType || headerMediaUrl.trim().length > 0) &&
    !uploadingMedia &&
    (scheduleMode === "now" || scheduleAt.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || !template) return;
    setSubmitting(true);
    try {
      const scheduledAt =
        scheduleMode === "later" && scheduleAt
          ? new Date(scheduleAt).toISOString()
          : null;
      const res = await fetch("/api/whatsapp/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          templateId: template.id,
          scheduledAt,
          variableMap: varMap,
          headerParams: hasHeaderVar ? [headerValue.trim()] : null,
          headerMediaUrl: mediaHeaderType ? headerMediaUrl : null,
          recipients: valid,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create broadcast");
      toast.success(
        scheduledAt
          ? `Broadcast scheduled for ${data.total_recipients} recipients`
          : `Broadcast queued for ${data.total_recipients} recipients`,
      );
      reset();
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create broadcast");
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
      <DialogContent className="!max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New broadcast</DialogTitle>
          <DialogDescription>
            Pick an approved template, choose who receives it, and send now or
            schedule for later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Template */}
          <div className="space-y-1.5">
            <Label>Template</Label>
            {templates.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/40">
                No approved <b>Marketing</b> templates yet. Create one (category
                Marketing) in <b>Templates</b> and wait for Meta approval, then
                come back here.
              </div>
            ) : (
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an approved template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.language}
                      {t.category === "MARKETING" ? " · Marketing" : ` · ${t.category}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {template && (
            <>
              {/* Live preview */}
              <div className="rounded-lg border bg-[#e5ddd5] p-3">
                <div className="bg-white rounded-lg p-3 shadow-sm max-w-[90%] text-sm whitespace-pre-wrap">
                  {previewText}
                </div>
              </div>

              {/* Header variable (if any) */}
              {hasHeaderVar && (
                <div className="space-y-1.5">
                  <Label>Header value</Label>
                  <Input
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    placeholder="Value for the header {{1}}"
                  />
                </div>
              )}

              {/* Media header — the image/video/document sent to every recipient */}
              {mediaHeaderType && (
                <div className="space-y-1.5">
                  <Label className="capitalize">Header {mediaHeaderType}</Label>
                  {mediaHeaderType === "image" && (
                    <ImageUpload
                      value={headerMediaUrl}
                      onChange={(url) => setHeaderMediaUrl(url)}
                      label=""
                      folder="wa-broadcast"
                    />
                  )}
                  {mediaHeaderType === "video" && (
                    <div className="space-y-2">
                      {headerMediaUrl && (
                        <video
                          src={headerMediaUrl}
                          controls
                          className="w-full max-w-xs rounded-md border"
                        />
                      )}
                      <Input
                        type="file"
                        accept="video/mp4,video/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setVideoFileForEditor(f);
                            setShowVideoEditor(true);
                          }
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                  {mediaHeaderType === "document" && (
                    <div className="space-y-2">
                      {headerMediaUrl && (
                        <a
                          href={headerMediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline"
                        >
                          Uploaded document
                        </a>
                      )}
                      <Input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            void applyMedia(
                              () => uploadFileToS3(f, f.name) as Promise<string>,
                            );
                          }
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                  {uploadingMedia && (
                    <p className="text-xs text-muted-foreground">Uploading…</p>
                  )}
                  {showVideoEditor && videoFileForEditor && (
                    <VideoEditor
                      isOpen={showVideoEditor}
                      videoFile={videoFileForEditor}
                      onClose={() => {
                        setShowVideoEditor(false);
                        setVideoFileForEditor(null);
                      }}
                      onComplete={(blob) => {
                        setShowVideoEditor(false);
                        setVideoFileForEditor(null);
                        void applyMedia(
                          () =>
                            uploadFileToS3(
                              blob,
                              `wa-broadcast-${Date.now()}.mp4`,
                            ) as Promise<string>,
                        );
                      }}
                    />
                  )}
                </div>
              )}

              {/* Variable mapping */}
              {varIndices.length > 0 && (
                <div className="space-y-2">
                  <Label>Message variables</Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Choose what fills each placeholder for every recipient.
                  </p>
                  <div className="space-y-2">
                    {varIndices.map((n, i) => (
                      <div key={n} className="flex items-center gap-2">
                        <code className="text-xs w-12 shrink-0">{`{{${n}}}`}</code>
                        <Select
                          value={varMap[i]?.source || "fixed"}
                          onValueChange={(v) =>
                            setVarMap((m) =>
                              m.map((x, idx) =>
                                idx === i ? { ...x, source: v as VarSource } : x,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="phone">Recipient phone</SelectItem>
                            <SelectItem value="name">Recipient name</SelectItem>
                            <SelectItem value="fixed">Fixed value</SelectItem>
                          </SelectContent>
                        </Select>
                        {varMap[i]?.source === "fixed" && (
                          <Input
                            value={varMap[i]?.value || ""}
                            onChange={(e) =>
                              setVarMap((m) =>
                                m.map((x, idx) =>
                                  idx === i ? { ...x, value: e.target.value } : x,
                                ),
                              )
                            }
                            placeholder={`Value for {{${n}}}`}
                            className="flex-1"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipients */}
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="manual">Enter manually</TabsTrigger>
                    <TabsTrigger value="customers">My customers</TabsTrigger>
                    <TabsTrigger value="excel">Upload Excel</TabsTrigger>
                  </TabsList>
                  <TabsContent value="manual" className="space-y-1.5">
                    <Textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      rows={6}
                      placeholder={"One per line:\n9876543210, Asha\n9123456780, Ravi\n9000000000"}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: <code>phone, name</code> — name optional, phone required.
                    </p>
                  </TabsContent>
                  <TabsContent value="customers" className="space-y-2">
                    {loadingCustomers ? (
                      <p className="text-sm text-muted-foreground">Loading customers…</p>
                    ) : customers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No customers found from your orders yet.
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {selectedCustomerPhones.size}/{customers.length} selected
                          </span>
                          <button
                            type="button"
                            className="text-primary underline"
                            onClick={() =>
                              setSelectedCustomerPhones(
                                selectedCustomerPhones.size === customers.length
                                  ? new Set()
                                  : new Set(customers.map((c) => c.phone)),
                              )
                            }
                          >
                            {selectedCustomerPhones.size === customers.length
                              ? "Clear all"
                              : "Select all"}
                          </button>
                        </div>
                        <div className="max-h-48 divide-y overflow-auto rounded-md border">
                          {customers.map((c) => (
                            <label
                              key={c.phone}
                              className="flex items-center gap-2 px-2 py-1.5 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCustomerPhones.has(c.phone)}
                                onChange={(e) =>
                                  setSelectedCustomerPhones((prev) => {
                                    const n = new Set(prev);
                                    if (e.target.checked) n.add(c.phone);
                                    else n.delete(c.phone);
                                    return n;
                                  })
                                }
                              />
                              <span className="font-mono text-xs">{c.phone}</span>
                              {c.name && (
                                <span className="truncate text-muted-foreground">
                                  {c.name}
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </TabsContent>
                  <TabsContent value="excel" className="space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleExcel(f);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" /> Choose .xlsx / .csv
                      </Button>
                      {excelFileName && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          {excelFileName}
                          <button
                            type="button"
                            onClick={() => {
                              setExcelRecipients(null);
                              setExcelFileName("");
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Columns: <b>phone</b> (required) and <b>name</b> (optional).
                      Header row auto-detected; otherwise column 1 = phone, column
                      2 = name.
                    </p>
                  </TabsContent>
                </Tabs>

                {/* Recipient summary */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="font-normal">
                    {valid.length} valid recipient{valid.length === 1 ? "" : "s"}
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="outline" className="font-normal text-amber-700 border-amber-200">
                      {invalidCount} skipped (bad number)
                    </Badge>
                  )}
                  {dupCount > 0 && (
                    <Badge variant="outline" className="font-normal text-stone-600">
                      {dupCount} duplicate{dupCount === 1 ? "" : "s"} removed
                    </Badge>
                  )}
                  {valid.length > DAILY_LIMIT && (
                    <span className="text-orange-700">
                      Over {DAILY_LIMIT}/day — first {DAILY_LIMIT} send today, the
                      rest after you resume tomorrow.
                    </span>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <Label>When to send</Label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={scheduleMode === "now"}
                      onChange={() => setScheduleMode("now")}
                    />
                    Send now
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={scheduleMode === "later"}
                      onChange={() => setScheduleMode("later")}
                    />
                    Schedule for later
                  </label>
                  {scheduleMode === "later" && (
                    <Input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="w-auto"
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : scheduleMode === "later" ? (
              "Schedule broadcast"
            ) : (
              `Send to ${valid.length || ""} now`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
