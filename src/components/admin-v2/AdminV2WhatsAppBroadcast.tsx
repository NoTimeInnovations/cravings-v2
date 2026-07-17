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
  Download,
  X,
  Ban,
  Play,
  Users,
  Check,
  CheckCheck,
  Clock,
  Search,
  Signal,
  IndianRupee,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ImageUpload } from "@/components/storefront/ImageUpload";
import VideoEditor from "@/components/VideoEditor";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { formatMoney } from "@/lib/utils";
import { explainWhatsAppError } from "@/lib/whatsapp-errors";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const DAILY_LIMIT = 250;

export interface PhoneCorrection {
  original: string;
  corrected: string;
  name: string;
  valid: boolean;
  changed: boolean;
}

// Clean + normalise one recipient phone to E.164 before sending. Strips stray
// spaces/dashes/brackets, turns a leading 00 into +, and validates with
// libphonenumber (default region India, matching the send path). `valid` is
// false when it still can't be parsed into a real number — the UI flags those so
// the owner can fix or drop them before the broadcast starts.
export function correctRecipientPhone(r: ParsedRecipient): PhoneCorrection {
  const original = (r.phone || "").trim();
  let cleaned = original.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
  const parsed = cleaned.startsWith("+")
    ? parsePhoneNumberFromString(cleaned)
    : parsePhoneNumberFromString(cleaned, "IN");
  if (parsed && parsed.isValid()) {
    const e164 = parsed.number;
    return {
      original,
      corrected: e164,
      name: r.name || "",
      valid: true,
      changed: e164 !== original,
    };
  }
  const fallback = cleaned || original;
  return {
    original,
    corrected: fallback,
    name: r.name || "",
    valid: false,
    changed: fallback !== original,
  };
}

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
  delivered_count: number;
  read_count: number;
  failed_count: number;
  total_cost: number;
  cost_currency: string | null;
  cost_source: string | null; // estimate | partial | meta_analytics
  cost_reconciled_at: string | null;
  last_error: string | null;
  created_at: string;
}

interface ParsedRecipient {
  phone: string;
  name: string;
}

// A connected WhatsApp number the partner can broadcast from.
interface WaNumber {
  id: string;
  phone_number_id: string;
  display_phone: string | null;
  is_primary: boolean;
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

// Format a Date as a <input type="datetime-local"> value (LOCAL time,
// "YYYY-MM-DDTHH:mm") — used for the schedule picker's min + sensible default.
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [numbers, setNumbers] = useState<WaNumber[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [blocklistOpen, setBlocklistOpen] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const loadStatus = async () => {
    if (!partnerId) return;
    try {
      const res = await fetch(`/api/whatsapp/meta/status?partnerId=${partnerId}`);
      const data = await res.json();
      setConnected(!!data.connected);
      setNumbers(Array.isArray(data.integrations) ? data.integrations : []);
    } catch {
      setConnected(false);
      setNumbers([]);
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

  // One combined Excel across every broadcast: an "Overview" sheet with the
  // grand totals only (no per-broadcast breakdown), plus a "Broadcasts" sheet
  // with one totals row per broadcast (no per-recipient rows). Built entirely
  // from the already-loaded list — no extra network calls.
  const downloadAllReports = async () => {
    if (!broadcasts.length) {
      toast.error("No broadcasts to export yet");
      return;
    }
    setDownloadingAll(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Grand totals. "Received" = delivered (reached the phone; already
      // includes those who read). "Not received" = everyone else
      // (recipients − received) — the honest miss count: hard failures PLUS
      // messages sent but never confirmed delivered. Received + Not received
      // always equals Recipients, so the numbers reconcile.
      const totals = broadcasts.reduce(
        (acc, b) => {
          acc.recipients += b.total_recipients || 0;
          acc.received += b.delivered_count || 0;
          acc.read += b.read_count || 0;
          return acc;
        },
        { recipients: 0, received: 0, read: 0 },
      );
      const notReceived = Math.max(0, totals.recipients - totals.received);

      // Costs can span currencies — sum per currency so the total is never wrong.
      const costByCurrency = new Map<string, number>();
      for (const b of broadcasts) {
        if (!b.total_cost) continue;
        const cur = (b.cost_currency || "INR").toUpperCase();
        costByCurrency.set(cur, (costByCurrency.get(cur) || 0) + b.total_cost);
      }
      const costLine = costByCurrency.size
        ? [...costByCurrency.entries()].map(([cur, amt]) => formatMoney(amt, cur)).join("  |  ")
        : "—";

      // ── Sheet 1: Overview — a plain-English line anyone can read + the
      // headline numbers (Received + Not received = Recipients) ──
      const dPct = pct(totals.received, totals.recipients);
      const rPct = pct(totals.read, totals.recipients);
      const nrPct = pct(notReceived, totals.recipients);
      const sentence =
        `Across ${broadcasts.length} broadcast${broadcasts.length === 1 ? "" : "s"}, ` +
        `${totals.recipients.toLocaleString()} customers were messaged — ` +
        `${totals.received.toLocaleString()} received it (${dPct}%) and ` +
        `${totals.read.toLocaleString()} read it (${rPct}%). ` +
        `The other ${notReceived.toLocaleString()} did not receive it (${nrPct}%). ` +
        `Estimated cost: ${costLine}.`;
      const overview: (string | number)[][] = [
        ["WhatsApp broadcasts — summary"],
        [sentence],
        ["Generated", fmtTime(new Date().toISOString())],
        [],
        ["Broadcasts", broadcasts.length],
        ["Recipients", totals.recipients],
        ["Received", totals.received, `${dPct}%`],
        ["Read", totals.read, `${rPct}%`],
        ["Not received", notReceived, `${nrPct}%`],
        [],
        ["Total cost (est.)", costLine],
      ];
      const wsOverview = XLSX.utils.aoa_to_sheet(overview);
      wsOverview["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

      // ── Sheet 2: one row per broadcast — same headline metrics ──
      const header = [
        "Template",
        "Language",
        "Status",
        "Created",
        "Recipients",
        "Received",
        "Read",
        "Not received",
        "Cost",
        "Currency",
      ];
      const rows = broadcasts.map((b) => {
        const rec = b.total_recipients || 0;
        const got = b.delivered_count || 0;
        return [
          b.template_name || "",
          b.language || "",
          broadcastStatusLabel(b.status, b.scheduled_at),
          fmtTime(b.created_at),
          rec,
          got,
          b.read_count || 0,
          Math.max(0, rec - got),
          b.total_cost || 0,
          (b.cost_currency || "").toUpperCase(),
        ];
      });
      const totalRow = [
        "TOTAL",
        "",
        "",
        "",
        totals.recipients,
        totals.received,
        totals.read,
        notReceived,
        costByCurrency.size === 1 ? [...costByCurrency.values()][0] : "",
        costByCurrency.size === 1 ? [...costByCurrency.keys()][0] : costByCurrency.size ? "mixed" : "",
      ];
      const wsList = XLSX.utils.aoa_to_sheet([header, ...rows, [], totalRow]);
      wsList["!cols"] = [
        { wch: 26 },
        { wch: 10 },
        { wch: 12 },
        { wch: 18 },
        { wch: 12 },
        { wch: 10 },
        { wch: 8 },
        { wch: 13 },
        { wch: 12 },
        { wch: 9 },
      ];
      XLSX.utils.book_append_sheet(wb, wsList, "Broadcasts");

      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `whatsapp_broadcasts_report_${stamp}.xlsx`);
      toast.success("All-broadcasts report downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't generate the report");
    } finally {
      setDownloadingAll(false);
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
            in the background, so you can close this page. Each broadcast is capped
            at your WhatsApp daily messaging limit (your number&apos;s current
            tier), minus whatever you&apos;ve already sent today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadBroadcasts} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={downloadAllReports}
            disabled={downloadingAll || broadcasts.length === 0}
            title="Download one Excel with the overall totals + every broadcast's totals"
          >
            {downloadingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download all
          </Button>
          <Button
            variant="outline"
            onClick={() => setBlocklistOpen(true)}
            title="Blocked / unsubscribed numbers — never sent broadcasts"
          >
            <Ban className="h-4 w-4 mr-2" /> Blocklist
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
                  <div
                    key={b.id}
                    onClick={() => setDetailId(b.id)}
                    className="p-4 border rounded-lg space-y-3 cursor-pointer transition-colors hover:bg-muted/40 hover:border-green-200"
                  >
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
                            onClick={(e) => {
                              e.stopPropagation();
                              act(b.id, "resume");
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              act(b.id, "cancel");
                            }}
                            disabled={busyId === b.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Ban className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Progress value={pct} className="h-2" />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <FunnelChips b={b} />
                        <span className="text-xs text-muted-foreground">
                          {done}/{b.total_recipients}
                        </span>
                      </div>
                    </div>

                    {b.last_error && b.status === "paused" && (
                      <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
                        {b.last_error}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-0.5">
                      {b.total_cost > 0 ? (
                        <span className="text-xs font-medium text-foreground">
                          {formatMoney(b.total_cost, b.cost_currency || "INR")}
                          <span className="text-muted-foreground font-normal">
                            {" "}cost
                          </span>
                        </span>
                      ) : b.delivered_count > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Calculating cost…
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      <span className="text-xs text-green-700 flex items-center gap-0.5">
                        View details <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
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
        numbers={numbers}
        onCreated={() => {
          setCreatorOpen(false);
          loadBroadcasts();
        }}
      />

      <BroadcastDetailDialog
        broadcastId={detailId}
        partnerId={partnerId}
        onClose={() => setDetailId(null)}
        onChanged={loadBroadcasts}
      />

      <BlocklistDialog
        open={blocklistOpen}
        onOpenChange={setBlocklistOpen}
        partnerId={partnerId}
      />
    </div>
  );
}

// Per-partner blocklist manager — view/search the numbers excluded from all
// broadcasts (auto-added on STOP, or added manually), and block/unblock numbers.
function BlocklistDialog({
  open,
  onOpenChange,
  partnerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partnerId?: string;
}) {
  const [rows, setRows] = useState<
    { id?: string; phone: string; reason: string | null; created_at?: string }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (q = "") => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const url = `/api/whatsapp/optouts?partnerId=${partnerId}${
        q ? `&search=${encodeURIComponent(q)}` : ""
      }`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setRows(data.optouts || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load blocklist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSearch("");
      load("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partnerId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(search.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const add = async () => {
    const phone = newPhone.trim();
    if (!phone || !partnerId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/optouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add");
      toast.success(data.alreadyBlocked ? "Already on the blocklist" : "Number blocked");
      setNewPhone("");
      load(search.trim());
    } catch (e: any) {
      toast.error(e?.message || "Failed to add");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (phone: string) => {
    if (!partnerId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/optouts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to remove");
      toast.success("Unblocked — they can receive broadcasts again");
      load(search.trim());
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-600" /> Blocklist
            <span className="text-sm font-normal text-muted-foreground">
              ({total})
            </span>
          </DialogTitle>
          <DialogDescription>
            Customers who replied STOP, plus numbers you add here, are never sent
            any broadcast — excluded automatically at send time. A customer can
            rejoin on their own by replying START.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Block a number (with country code, e.g. 919633440123)"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add} disabled={busy || !newPhone.trim()}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search blocked numbers…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {search ? "No matches." : "No blocked numbers yet."}
            </div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id || r.phone}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.phone}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.reason === "STOP" ? "Replied STOP" : "Added manually"}
                    {r.created_at ? ` · ${fmtTime(r.created_at)}` : ""}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-red-600 shrink-0"
                  onClick={() => remove(r.phone)}
                  disabled={busy}
                  title="Unblock"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact delivery-funnel chips shown on each broadcast card.
function FunnelChips({ b }: { b: BroadcastRow }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="flex items-center gap-1 text-muted-foreground">
        <Check className="h-3 w-3" />
        {b.sent_count} sent
      </span>
      <span className="flex items-center gap-1 text-sky-600">
        <CheckCheck className="h-3 w-3" />
        {b.delivered_count} delivered
      </span>
      <span className="flex items-center gap-1 text-green-600">
        <CheckCheck className="h-3 w-3" />
        {b.read_count} read
      </span>
      {b.failed_count > 0 && (
        <span className="flex items-center gap-1 text-red-600">
          <X className="h-3 w-3" />
          {b.failed_count} failed
        </span>
      )}
    </div>
  );
}

function BroadcastCreatorDialog({
  open,
  onOpenChange,
  partnerId,
  templates,
  numbers,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  partnerId: string | undefined;
  templates: TemplateRow[];
  numbers: WaNumber[];
  onCreated: () => void;
}) {
  const [templateId, setTemplateId] = useState<string>("");
  // Which connected number sends this broadcast (only shown when >1 connected).
  const [sendFromPhoneNumberId, setSendFromPhoneNumberId] = useState<string>("");
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
  // Daily send cap derived from the partner's live Meta messaging tier ("q
  // number") and today's usage. `remaining` = tier − sent today.
  const [limitInfo, setLimitInfo] = useState<{
    dailyLimit: number;
    remaining: number;
  } | null>(null);
  // Phone-format corrections to confirm before sending (null = not reviewing).
  const [correctionReview, setCorrectionReview] = useState<PhoneCorrection[] | null>(
    null,
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
    setSendFromPhoneNumberId("");
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
    setLimitInfo(null);
    setCorrectionReview(null);
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

  // Default the "send from" number to the partner's primary when the dialog opens.
  useEffect(() => {
    if (!open || sendFromPhoneNumberId || numbers.length === 0) return;
    const primary = numbers.find((n) => n.is_primary) || numbers[0];
    if (primary) setSendFromPhoneNumberId(primary.phone_number_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, numbers]);

  // On open, read the partner's live daily cap (Meta tier) + today's usage so we
  // can hard-limit how many recipients can be queued.
  useEffect(() => {
    if (!open || !partnerId) return;
    setLimitInfo(null);
    // Cap tracks the SELECTED sending number's tier (Meta's limit is per-number).
    const q = sendFromPhoneNumberId
      ? `?partnerId=${partnerId}&phoneNumberId=${encodeURIComponent(sendFromPhoneNumberId)}`
      : `?partnerId=${partnerId}`;
    fetch(`/api/whatsapp/meta/phone-quality${q}`)
      .then((r) => r.json())
      .then((d) => {
        const u = d?.usage;
        if (u) {
          const dailyLimit = Number(u.dailyLimit) || DAILY_LIMIT;
          const remaining = Number.isFinite(Number(u.remaining))
            ? Number(u.remaining)
            : dailyLimit;
          setLimitInfo({ dailyLimit, remaining });
        }
      })
      .catch(() => {
        /* fall back to the default cap below */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partnerId, sendFromPhoneNumberId]);

  // Effective cap: a scheduled-for-later send gets the full daily tier (it runs
  // on a future day); a send-now is bounded by what's left today.
  const dailyLimit = limitInfo?.dailyLimit ?? DAILY_LIMIT;
  const remainingToday = limitInfo?.remaining ?? DAILY_LIMIT;
  const cap = scheduleMode === "later" ? dailyLimit : remainingToday;
  // A friendly cap label that doesn't print MAX_SAFE_INTEGER for unlimited tiers.
  const capLabel =
    cap >= 1_000_000 ? "unlimited" : cap.toLocaleString();

  // Keep the customer selection within the cap — trims the lowest-priority
  // (later-in-list) picks whenever the cap shrinks (e.g. tier loads, or the user
  // switches from "schedule later" to "send now" with less remaining today).
  useEffect(() => {
    setSelectedCustomerPhones((prev) => {
      if (prev.size <= cap) return prev;
      const kept = new Set<string>();
      for (const c of customers) {
        if (prev.has(c.phone)) {
          kept.add(c.phone);
          if (kept.size >= cap) break;
        }
      }
      return kept;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap, customers]);

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
    valid.length <= cap &&
    varMap.every((m) => m.source !== "fixed" || (m.value ?? "").trim().length > 0) &&
    (!hasHeaderVar || headerValue.trim().length > 0) &&
    (!mediaHeaderType || headerMediaUrl.trim().length > 0) &&
    !uploadingMedia &&
    (scheduleMode === "now" || scheduleAt.trim().length > 0);

  // Send click → first auto-correct number formats, show the owner exactly what
  // changed (and any that can't be fixed), then send. If nothing needs fixing it
  // goes straight through.
  const handleSend = () => {
    if (!canSubmit || !template) return;
    const corrections = valid.map(correctRecipientPhone);
    const needsReview = corrections.some((c) => c.changed || !c.valid);
    if (needsReview) {
      setCorrectionReview(corrections);
      return;
    }
    doSubmit(corrections.filter((c) => c.valid).map((c) => ({ phone: c.corrected, name: c.name })));
  };

  const doSubmit = async (recipientsToSend: ParsedRecipient[]) => {
    if (!template || recipientsToSend.length === 0) return;
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
          recipients: recipientsToSend,
          sendFromPhoneNumberId: sendFromPhoneNumberId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create broadcast");
      toast.success(
        scheduledAt
          ? `Broadcast scheduled for ${data.total_recipients} recipients`
          : `Broadcast queued for ${data.total_recipients} recipients`,
      );
      setCorrectionReview(null);
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
          {/* Send-from number — only when the partner has more than one connected */}
          {numbers.length > 1 && (
            <div className="space-y-1.5">
              <Label>Send from</Label>
              <Select
                value={sendFromPhoneNumberId}
                onValueChange={setSendFromPhoneNumberId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose which number sends this broadcast" />
                </SelectTrigger>
                <SelectContent>
                  {numbers.map((n) => (
                    <SelectItem key={n.phone_number_id} value={n.phone_number_id}>
                      {n.display_phone || n.phone_number_id}
                      {n.is_primary ? " · default" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Recipients see this number as the sender. Its own daily limit
                applies.
              </p>
            </div>
          )}

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
                            {customers.length > cap && (
                              <span className="text-orange-700">
                                {" "}· max {capLabel}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            className="text-primary underline"
                            onClick={() =>
                              setSelectedCustomerPhones(
                                selectedCustomerPhones.size >=
                                  Math.min(cap, customers.length)
                                  ? new Set()
                                  : new Set(
                                      customers.slice(0, cap).map((c) => c.phone),
                                    ),
                              )
                            }
                          >
                            {selectedCustomerPhones.size >=
                            Math.min(cap, customers.length)
                              ? "Clear all"
                              : `Select all (max ${capLabel})`}
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
                                    if (e.target.checked && prev.size >= cap) {
                                      toast.error(
                                        `You can send to at most ${capLabel} ${
                                          scheduleMode === "later"
                                            ? "per day on your plan"
                                            : "today (daily limit minus what's already sent)"
                                        }.`,
                                      );
                                      return prev;
                                    }
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
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    Limit: {capLabel}
                    {scheduleMode === "later"
                      ? "/day"
                      : " left today"}
                  </Badge>
                  {valid.length > cap && (
                    <span className="text-red-600">
                      Over your limit — remove {(valid.length - cap).toLocaleString()}.
                      You can send at most {capLabel}{" "}
                      {scheduleMode === "later" ? "per day" : "today"}.
                    </span>
                  )}
                  {cap <= 0 && (
                    <span className="text-red-600">
                      Daily limit already reached — schedule for later or try again
                      tomorrow.
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
                      onChange={() => {
                        setScheduleMode("later");
                        // Default to ~15 min out so the field is never empty or
                        // accidentally in the past.
                        if (!scheduleAt) {
                          setScheduleAt(
                            toLocalInput(new Date(Date.now() + 15 * 60 * 1000)),
                          );
                        }
                      }}
                    />
                    Schedule for later
                  </label>
                  {scheduleMode === "later" && (
                    <Input
                      type="datetime-local"
                      value={scheduleAt}
                      min={toLocalInput(new Date(Date.now() + 60 * 1000))}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="w-auto"
                    />
                  )}
                </div>
                {scheduleMode === "later" && (
                  <p className="text-xs text-muted-foreground">
                    Sends at this date &amp; time in your local timezone (
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}); it may
                    fire up to a minute later. You can cancel any time before it
                    starts.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
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

      <PhoneCorrectionDialog
        corrections={correctionReview}
        submitting={submitting}
        scheduleLater={scheduleMode === "later"}
        onCancel={() => setCorrectionReview(null)}
        onConfirm={(recipients) => doSubmit(recipients)}
      />
    </Dialog>
  );
}

// Review dialog: shows every number whose format was auto-corrected (original →
// corrected) and any that couldn't be validated (skipped), so the owner sees
// exactly what will be sent before the broadcast starts.
function PhoneCorrectionDialog({
  corrections,
  submitting,
  scheduleLater,
  onCancel,
  onConfirm,
}: {
  corrections: PhoneCorrection[] | null;
  submitting: boolean;
  scheduleLater: boolean;
  onCancel: () => void;
  onConfirm: (recipients: ParsedRecipient[]) => void;
}) {
  const open = !!corrections;
  const list = corrections || [];
  const changed = list.filter((c) => c.valid && c.changed);
  const invalid = list.filter((c) => !c.valid);
  const sendable = list.filter((c) => c.valid);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="!max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review number corrections</DialogTitle>
          <DialogDescription>
            We tidied up some numbers before sending. {sendable.length} will be
            sent
            {invalid.length > 0 && `, ${invalid.length} can't be fixed and will be skipped`}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {changed.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Corrected ({changed.length})
              </div>
              <div className="max-h-48 divide-y overflow-auto rounded-md border">
                {changed.map((c, i) => (
                  <div
                    key={`${c.original}-${i}`}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs"
                  >
                    <span className="font-mono text-muted-foreground line-through">
                      {c.original}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-green-700">{c.corrected}</span>
                    {c.name && (
                      <span className="truncate text-muted-foreground">{c.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {invalid.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-red-600">
                Can&apos;t be fixed — will be skipped ({invalid.length})
              </div>
              <div className="max-h-40 divide-y overflow-auto rounded-md border border-red-200">
                {invalid.map((c, i) => (
                  <div
                    key={`${c.original}-${i}`}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs"
                  >
                    <span className="font-mono text-red-700">{c.original || "(empty)"}</span>
                    <span className="text-muted-foreground">
                      not a valid phone number
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Back
          </Button>
          <Button
            onClick={() =>
              onConfirm(sendable.map((c) => ({ phone: c.corrected, name: c.name })))
            }
            disabled={submitting || sendable.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : scheduleLater ? (
              `Schedule ${sendable.length}`
            ) : (
              `Send ${sendable.length} now`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════
//  Broadcast detail — delivery funnel, cost, number health, recipients
// ════════════════════════════════════════════════════════════════

interface DetailBroadcast {
  id: string;
  template_name: string;
  language: string;
  category: string;
  status: string;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  total_cost: number;
  cost_estimated: number | null;
  cost_currency: string | null;
  cost_source: string | null; // estimate | partial | meta_analytics
  cost_reconciled_at: string | null;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface PhoneQuality {
  connected: boolean;
  currency?: string;
  usage?: { sentToday: number; dailyLimit: number };
  phone?: {
    verifiedName: string | null;
    displayPhoneNumber: string | null;
    qualityRating: string | null;
    messagingLimitTier: string | null;
  } | null;
  actualSpend?: { amount: number; currency: string | null; periodLabel: string } | null;
}

interface RecipientRow {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error: string | null;
  error_code: string | null;
  error_title: string | null;
  cost_amount: number | null;
  cost_currency: string | null;
  cost_source: string | null;
  pricing_category: string | null;
}

interface ErrorBucket {
  code: string | null;
  count: number;
  category: string;
  categoryLabel: string;
  side: string;
  retryable: boolean;
  summary: string;
  action?: string;
  metaTitle: string | null;
}

const RECIPIENT_PAGE = 50;

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "read", label: "Read" },
  { key: "delivered", label: "Delivered" },
  { key: "sent", label: "Sent" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "skipped", label: "Skipped" },
];

function fmtTime(s: string | null | undefined): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// WhatsApp-style status indicator for one recipient.
function RecipientTick({ status }: { status: string }) {
  switch (status) {
    case "read":
      return (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCheck className="h-4 w-4" /> Read
        </span>
      );
    case "delivered":
      return (
        <span className="flex items-center gap-1 text-sky-600">
          <CheckCheck className="h-4 w-4" /> Delivered
        </span>
      );
    case "sent":
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Check className="h-4 w-4" /> Sent
        </span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1 text-red-600">
          <X className="h-4 w-4" /> Failed
        </span>
      );
    case "skipped":
      return (
        <span className="flex items-center gap-1 text-stone-500">
          <Ban className="h-4 w-4" /> Skipped
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-amber-600">
          <Clock className="h-4 w-4" /> Pending
        </span>
      );
  }
}

function qualityLabel(rating: string | null | undefined): {
  text: string;
  cls: string;
} {
  switch ((rating || "").toUpperCase()) {
    case "GREEN":
      return { text: "High quality", cls: "bg-green-100 text-green-800 border-green-200" };
    case "YELLOW":
      return { text: "Medium quality", cls: "bg-amber-100 text-amber-800 border-amber-200" };
    case "RED":
      return { text: "Low quality", cls: "bg-red-100 text-red-800 border-red-200" };
    default:
      return { text: "Not rated", cls: "bg-muted text-muted-foreground border-border" };
  }
}

function tierLabel(tier: string | null | undefined): string {
  switch ((tier || "").toUpperCase()) {
    case "TIER_50":
      return "50 customers / day";
    case "TIER_250":
      return "250 customers / day";
    case "TIER_1K":
      return "1,000 customers / day";
    case "TIER_10K":
      return "10,000 customers / day";
    case "TIER_100K":
      return "100,000 customers / day";
    case "TIER_UNLIMITED":
      return "Unlimited";
    default:
      return "—";
  }
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function BroadcastDetailDialog({
  broadcastId,
  partnerId,
  onClose,
  onChanged,
}: {
  broadcastId: string | null;
  partnerId: string | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<DetailBroadcast | null>(null);
  const [quality, setQuality] = useState<PhoneQuality | null>(null);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [errorBreakdown, setErrorBreakdown] = useState<ErrorBucket[]>([]);
  const [errorCodeFilter, setErrorCodeFilter] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const open = !!broadcastId;

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadDetail = async () => {
    if (!broadcastId || !partnerId) return;
    try {
      const res = await fetch(
        `/api/whatsapp/broadcasts/${broadcastId}?partnerId=${partnerId}`,
      );
      const data = await res.json();
      if (res.ok) {
        setDetail(data.broadcast);
        setErrorBreakdown(data.errorBreakdown || []);
      }
    } catch {
      /* keep prior */
    }
  };

  // Build a downloadable Excel report: a Summary sheet (stats + failure
  // breakdown) and a Recipients sheet (every number with its full timeline +
  // failure reason). Pulls ALL recipients from the export endpoint.
  const downloadReport = async () => {
    if (!broadcastId || !partnerId || !detail) return;
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/whatsapp/broadcasts/${broadcastId}/export?partnerId=${partnerId}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Export failed");

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const cur = detail.cost_currency || quality?.currency || "INR";
      const recips = detail.total_recipients || 0;
      const notReceived = Math.max(0, recips - detail.delivered_count);
      const dPct = pct(detail.delivered_count, recips);
      const rPct = pct(detail.read_count, recips);
      const nrPct = pct(notReceived, recips);
      const sentence =
        `${recips.toLocaleString()} customers were messaged — ` +
        `${detail.delivered_count.toLocaleString()} received it (${dPct}%) and ` +
        `${detail.read_count.toLocaleString()} read it (${rPct}%). ` +
        `The other ${notReceived.toLocaleString()} did not receive it (${nrPct}%). ` +
        `Estimated cost: ${detail.total_cost ?? 0} ${cur}.`;
      const summary: (string | number)[][] = [
        ["Broadcast report"],
        [sentence],
        [],
        ["Template", detail.template_name],
        ["Language", detail.language],
        ["Status", detail.status],
        ["Created", fmtTime(detail.created_at)],
        ["Started", detail.started_at ? fmtTime(detail.started_at) : "—"],
        ["Completed", detail.completed_at ? fmtTime(detail.completed_at) : "—"],
        [],
        ["Recipients", recips],
        ["Received", detail.delivered_count, `${dPct}%`],
        ["Read", detail.read_count, `${rPct}%`],
        ["Not received", notReceived, `${nrPct}%`],
        [],
        ["Total cost (est.)", `${detail.total_cost ?? 0} ${cur}`],
      ];
      if (errorBreakdown.length) {
        summary.push(
          [],
          ["Failure breakdown"],
          ["Count", "Category", "On (side)", "Code", "Retryable", "Reason"],
        );
        for (const b of errorBreakdown) {
          summary.push([
            b.count,
            b.categoryLabel,
            b.side,
            b.code || "unknown",
            b.retryable ? "yes" : "no",
            b.summary,
          ]);
        }
      }
      const ws1 = XLSX.utils.aoa_to_sheet(summary);
      ws1["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, ws1, "Summary");

      const header = [
        "Phone",
        "Name",
        "Status",
        "Sent at",
        "Delivered at",
        "Read at",
        "Failed at",
        "Error code",
        "Error title",
        "Error message",
        "Failure category",
        "On (side)",
        "Cost",
        "Currency",
      ];
      const rows = (data.recipients || []).map((r: any) => [
        r.phone || "",
        r.name || "",
        r.status || "",
        r.sent_at ? fmtTime(r.sent_at) : "",
        r.delivered_at ? fmtTime(r.delivered_at) : "",
        r.read_at ? fmtTime(r.read_at) : "",
        r.failed_at ? fmtTime(r.failed_at) : "",
        r.error_code || "",
        r.error_title || "",
        r.error || "",
        r.error_category || "",
        r.error_side || "",
        r.cost_amount ?? "",
        r.cost_currency || "",
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([header, ...rows]);
      ws2["!cols"] = [
        { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 18 },
        { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 28 }, { wch: 40 },
        { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "Recipients");

      const safe = (detail.template_name || "broadcast").replace(/[^\w.-]+/g, "_");
      XLSX.writeFile(wb, `broadcast_${safe}_${broadcastId.slice(0, 8)}.xlsx`);
      toast.success("Report downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't generate the report");
    } finally {
      setDownloading(false);
    }
  };

  const loadQuality = async () => {
    if (!partnerId) return;
    try {
      const res = await fetch(`/api/whatsapp/meta/phone-quality?partnerId=${partnerId}`);
      const data = await res.json();
      if (res.ok) setQuality(data);
    } catch {
      /* optional */
    }
  };

  const loadRecipients = async (reset: boolean) => {
    if (!broadcastId || !partnerId) return;
    const offset = reset ? 0 : recipients.length;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const qs = new URLSearchParams({
        partnerId,
        status: statusFilter,
        search: debouncedSearch,
        limit: String(RECIPIENT_PAGE),
        offset: String(offset),
      });
      if (errorCodeFilter) qs.set("errorCode", errorCodeFilter);
      const res = await fetch(
        `/api/whatsapp/broadcasts/${broadcastId}/recipients?${qs.toString()}`,
      );
      const data = await res.json();
      if (res.ok) {
        setRecipients((prev) =>
          reset ? data.recipients : [...prev, ...data.recipients],
        );
        setFilteredTotal(data.filteredTotal || 0);
        setCounts(data.counts || {});
      }
    } catch {
      /* surfaced as empty */
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial load when opened.
  useEffect(() => {
    if (!open) {
      setDetail(null);
      setQuality(null);
      setRecipients([]);
      setCounts({});
      setSearch("");
      setDebouncedSearch("");
      setStatusFilter("all");
      setExpanded(null);
      setErrorBreakdown([]);
      setErrorCodeFilter(null);
      return;
    }
    loadDetail();
    loadQuality();
    // recipients load handled by the filter effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, broadcastId]);

  // Reload recipients when filters change.
  useEffect(() => {
    if (!open) return;
    loadRecipients(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, broadcastId, debouncedSearch, statusFilter, errorCodeFilter]);

  // Live-poll while the broadcast is still in flight.
  const live =
    detail?.status === "sending" || detail?.status === "scheduled";
  useEffect(() => {
    if (!open || !live) return;
    const t = setInterval(() => {
      loadDetail();
      loadRecipients(true);
      onChanged(); // keep the underlying list cards in sync while live
    }, 7000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, live, debouncedSearch, statusFilter]);

  const total = detail?.total_recipients || 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-[99vw] w-[99vw] h-[97vh] max-h-[97vh] overflow-y-auto sm:!max-w-[98vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Megaphone className="h-5 w-5 text-green-600" />
            {detail?.template_name || "Broadcast"}
            {detail && (
              <Badge variant="outline" className="font-normal">
                {detail.language}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {detail?.started_at
              ? `Sent ${fmtTime(detail.started_at)}`
              : detail?.scheduled_at
                ? `Scheduled ${fmtTime(detail.scheduled_at)}`
                : detail?.created_at
                  ? `Created ${fmtTime(detail.created_at)}`
                  : "Loading…"}
            {detail?.completed_at && ` · Completed ${fmtTime(detail.completed_at)}`}
          </DialogDescription>
          {detail && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadReport}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Excel report
              </Button>
            </div>
          )}
        </DialogHeader>

        {!detail ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Delivery funnel */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <FunnelStat label="Recipients" value={total} sub="100%" tone="muted" />
              <FunnelStat
                label="Sent"
                value={detail.sent_count}
                sub={`${pct(detail.sent_count, total)}%`}
                tone="muted"
              />
              <FunnelStat
                label="Delivered"
                value={detail.delivered_count}
                sub={`${pct(detail.delivered_count, total)}%`}
                tone="sky"
              />
              <FunnelStat
                label="Read"
                value={detail.read_count}
                sub={`${pct(detail.read_count, total)}%`}
                tone="green"
              />
              <FunnelStat
                label="Failed"
                value={detail.failed_count}
                sub={`${pct(detail.failed_count, total)}%`}
                tone="red"
              />
            </div>

            {/* Cost + Number health */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cost */}
              <div className="rounded-lg border p-3 space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <IndianRupee className="h-3.5 w-3.5" /> Cost
                </div>
                <div className="text-xl font-semibold">
                  {formatMoney(
                    detail.total_cost || 0,
                    detail.cost_currency || quality?.currency || "INR",
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Meta published {detail.category?.toLowerCase() || "marketing"} rate
                  {(detail.delivered_count || 0) > 0
                    ? " · charged per delivered message"
                    : " · charged on delivery"}
                </div>
                {quality?.actualSpend && (
                  <div className="text-xs text-foreground pt-1 border-t mt-1">
                    Meta-confirmed ({quality.actualSpend.periodLabel}):{" "}
                    <span className="font-medium">
                      {formatMoney(
                        quality.actualSpend.amount,
                        quality.actualSpend.currency || quality?.currency || "USD",
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Number health */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Signal className="h-3.5 w-3.5" /> Your number
                </div>
                {quality?.phone ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded border ${qualityLabel(quality.phone.qualityRating).cls}`}
                      >
                        {qualityLabel(quality.phone.qualityRating).text}
                      </span>
                      {quality.phone.displayPhoneNumber && (
                        <span className="text-xs text-muted-foreground">
                          {quality.phone.displayPhoneNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Limit: {tierLabel(quality.phone.messagingLimitTier)}
                    </div>
                    {quality.usage && (
                      <div className="space-y-1">
                        <Progress
                          value={pct(quality.usage.sentToday, quality.usage.dailyLimit)}
                          className="h-1.5"
                        />
                        <div className="text-xs text-muted-foreground">
                          {quality.usage.sentToday}/{quality.usage.dailyLimit} sent today
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Quality info unavailable.
                  </div>
                )}
              </div>
            </div>

            {/* Failure breakdown — every error code categorised, with counts */}
            {errorBreakdown.length > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Why messages failed
                  <span className="ml-auto">
                    {errorCodeFilter && (
                      <button
                        className="text-primary underline"
                        onClick={() => setErrorCodeFilter(null)}
                      >
                        Clear filter
                      </button>
                    )}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {errorBreakdown.map((b) => {
                    const active = errorCodeFilter === (b.code ?? "unknown");
                    return (
                      <button
                        key={b.code ?? "unknown"}
                        onClick={() =>
                          setErrorCodeFilter(active ? null : b.code ?? "unknown")
                        }
                        className={`w-full text-left rounded-md border p-2 transition-colors ${
                          active
                            ? "border-green-600 bg-green-50"
                            : "hover:bg-muted border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{b.count}</span>
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded border bg-background">
                            {b.categoryLabel}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {b.side}
                            {b.retryable ? " · retryable" : ""}
                          </span>
                          {b.code && (
                            <span className="text-[11px] text-muted-foreground ml-auto font-mono">
                              #{b.code}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {b.summary}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recipient explorer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Recipients</Label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search number or name"
                    className="pl-7 h-8 w-56 text-sm"
                  />
                </div>
              </div>

              {/* Status filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {STATUS_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setStatusFilter(t.key)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      statusFilter === t.key
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    {t.label}
                    {counts[t.key] != null && (
                      <span className="ml-1 opacity-70">{counts[t.key]}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="rounded-md border divide-y max-h-80 overflow-auto">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No recipients match.
                  </div>
                ) : (
                  recipients.map((r) => {
                    const ts =
                      r.read_at || r.delivered_at || r.failed_at || r.sent_at;
                    const isFailed = r.status === "failed";
                    const exp = expanded === r.id;
                    return (
                      <div key={r.id} className="px-3 py-2 text-sm">
                        <div
                          className={`flex items-center justify-between gap-2 ${isFailed ? "cursor-pointer" : ""}`}
                          onClick={() =>
                            isFailed && setExpanded(exp ? null : r.id)
                          }
                        >
                          <div className="min-w-0">
                            <div className="font-mono text-xs truncate">{r.phone}</div>
                            {r.name && (
                              <div className="text-xs text-muted-foreground truncate">
                                {r.name}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {r.cost_amount != null && r.cost_amount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {formatMoney(
                                  r.cost_amount,
                                  r.cost_currency || detail.cost_currency || "INR",
                                  4,
                                )}
                              </span>
                            )}
                            {ts && (
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {fmtTime(ts)}
                              </span>
                            )}
                            <span className="text-xs w-24 justify-end flex">
                              <RecipientTick status={r.status} />
                            </span>
                          </div>
                        </div>
                        {isFailed && exp && (
                          <div className="mt-1.5 text-xs bg-red-50 border border-red-200 rounded px-2 py-1.5 text-red-800">
                            {(() => {
                              const ex = explainWhatsAppError(r.error_code, r.error);
                              return (
                                <>
                                  <div className="font-medium">{ex.summary}</div>
                                  {ex.action && (
                                    <div className="text-red-700/80 mt-0.5">
                                      {ex.action}
                                    </div>
                                  )}
                                  {(r.error_code || r.error_title) && (
                                    <div className="text-red-500/70 mt-0.5">
                                      Meta code {r.error_code || "?"}
                                      {r.error_title ? ` · ${r.error_title}` : ""}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {recipients.length < filteredTotal && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => loadRecipients(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Load more (${recipients.length}/${filteredTotal})`
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FunnelStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  tone: "muted" | "sky" | "green" | "red";
}) {
  const toneCls =
    tone === "sky"
      ? "text-sky-600"
      : tone === "green"
        ? "text-green-600"
        : tone === "red"
          ? "text-red-600"
          : "text-foreground";
  return (
    <div className="rounded-lg border p-2.5 text-center">
      <div className={`text-lg font-semibold ${toneCls}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
