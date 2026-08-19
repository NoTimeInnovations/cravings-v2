"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Download,
  Loader2,
  Play,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/authStore";
import { cn, formatMoney } from "@/lib/utils";
import { todayRange } from "@/lib/partnerTime";

import { AdminV3Button, MiniProgress, StatusPill, V3Card } from "./ui/primitives";
import { BlocklistDialog } from "./wabroad/BlocklistDialog";
import { BroadcastCreatorDialog } from "./wabroad/CreatorDialog";
import { BroadcastDetailDialog } from "./wabroad/DetailDialog";
import {
  CONTROL,
  FIELD_LABEL,
  broadcastStatusLabel,
  fmtTime,
  statusTone,
  titleCase,
  type BroadcastRow,
  type PhoneQuality,
  type TemplateRow,
  type WaNumber,
} from "./wabroad/shared";

/**
 * /admin-v3 → WhatsApp → Broadcast.
 *
 * Send one approved MARKETING template to many customers. Everything here talks
 * to the same endpoints admin-v2's Broadcast screen uses — `/api/whatsapp/
 * broadcasts`, `/templates`, `/meta/status`, `/meta/phone-quality`, `/optouts` —
 * so a broadcast created from v3 is indistinguishable from one created in v2.
 *
 * The design's stat strip reads "Sent today / Daily limit left / Spend today".
 * The first two come from Meta's live per-number tier (`/meta/phone-quality` →
 * `usage`) and show "—" when Meta is unreachable rather than a made-up number.
 * "Spend today" is NOT a Meta figure: Meta only publishes spend per billing
 * period, so this sums `total_cost` across the broadcasts CREATED today in the
 * partner's own timezone, and says so under the value.
 */
export function AdminV3WhatsAppBroadcast({
  onBack,
}: {
  /** Set by the shell; falls back to admin-v2's WhatsApp hub until then. */
  onBack?: () => void;
} = {}) {
  const { userData } = useAuthStore();
  const partner = userData as any;
  const partnerId = partner?.id as string | undefined;
  const tz = partner?.timezone as string | undefined;

  const [connected, setConnected] = React.useState<boolean | null>(null);
  const [numbers, setNumbers] = React.useState<WaNumber[]>([]);
  const [broadcasts, setBroadcasts] = React.useState<BroadcastRow[]>([]);
  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [quality, setQuality] = React.useState<PhoneQuality | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [creatorOpen, setCreatorOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [blocklistOpen, setBlocklistOpen] = React.useState(false);
  const [downloadingAll, setDownloadingAll] = React.useState(false);

  /* ------------------------------------------------------------- loaders */

  const loadStatus = React.useCallback(async () => {
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
  }, [partnerId]);

  const loadBroadcasts = React.useCallback(async () => {
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
  }, [partnerId]);

  const loadTemplates = React.useCallback(async () => {
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
      /* surfaced inside the creator dialog */
    }
  }, [partnerId]);

  const loadQuality = React.useCallback(async () => {
    if (!partnerId) return;
    try {
      const res = await fetch(
        `/api/whatsapp/meta/phone-quality?partnerId=${partnerId}`,
      );
      const data = await res.json();
      if (res.ok) setQuality(data);
    } catch {
      /* the strip renders "—" */
    }
  }, [partnerId]);

  React.useEffect(() => {
    if (!partnerId) return;
    loadStatus();
    loadBroadcasts();
    loadTemplates();
    loadQuality();
  }, [partnerId, loadStatus, loadBroadcasts, loadTemplates, loadQuality]);

  // Poll while anything is in flight so the progress bars advance live.
  const hasActive = broadcasts.some(
    (b) => b.status === "sending" || b.status === "scheduled",
  );
  React.useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(loadBroadcasts, 8000);
    return () => clearInterval(t);
  }, [hasActive, loadBroadcasts]);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadBroadcasts(), loadQuality()]);
    setRefreshing(false);
  };

  /* ------------------------------------------------------------- actions */

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
      toast.success(
        action === "cancel" ? "Broadcast cancelled" : "Broadcast resumed",
      );
      loadBroadcasts();
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  /**
   * One combined Excel across every broadcast: an "Overview" sheet with the
   * grand totals, plus a "Broadcasts" sheet with one totals row per broadcast.
   * Built entirely from the already-loaded list — no extra network calls.
   */
  const downloadAllReports = async () => {
    if (!broadcasts.length) {
      toast.error("No broadcasts to export yet");
      return;
    }
    setDownloadingAll(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // "Received" = delivered (reached the phone; already includes those who
      // read). "Not received" = recipients − received — the honest miss count:
      // hard failures PLUS messages sent but never confirmed delivered.
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
        ? [...costByCurrency.entries()]
            .map(([cur, amt]) => formatMoney(amt, cur))
            .join("  |  ")
        : "—";

      const p = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);
      const dPct = p(totals.received, totals.recipients);
      const rPct = p(totals.read, totals.recipients);
      const nrPct = p(notReceived, totals.recipients);
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
        costByCurrency.size === 1
          ? [...costByCurrency.keys()][0]
          : costByCurrency.size
            ? "mixed"
            : "",
      ];
      const wsList = XLSX.utils.aoa_to_sheet([header, ...rows, [], totalRow]);
      wsList["!cols"] = [
        { wch: 26 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 12 },
        { wch: 10 }, { wch: 8 }, { wch: 13 }, { wch: 12 }, { wch: 9 },
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

  /* --------------------------------------------------------- stat strip */

  const sentToday = quality?.usage?.sentToday;
  const dailyLimit = quality?.usage?.dailyLimit;
  const remaining =
    quality?.usage?.remaining != null && Number.isFinite(quality.usage.remaining)
      ? quality.usage.remaining
      : dailyLimit != null && sentToday != null
        ? Math.max(0, dailyLimit - sentToday)
        : undefined;

  // Spend on the broadcasts created during the partner's own "today".
  const spendToday = React.useMemo(() => {
    const { startISO, endISO } = todayRange(tz);
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    let amount = 0;
    let currency: string | null = null;
    let mixed = false;
    for (const b of broadcasts) {
      const t = new Date(b.created_at).getTime();
      if (!Number.isFinite(t) || t < start || t > end) continue;
      if (!b.total_cost) continue;
      const cur = (b.cost_currency || "INR").toUpperCase();
      if (currency && currency !== cur) mixed = true;
      currency = currency || cur;
      amount += b.total_cost;
    }
    return { amount, currency: currency || "INR", mixed };
  }, [broadcasts, tz]);

  const nfmt = (n: number | undefined) =>
    n == null ? "—" : n >= 1_000_000 ? "unlimited" : n.toLocaleString();

  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------------- header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        {onBack && (
          <AdminV3Button
            variant="icon"
            onClick={onBack}
            aria-label="Back to WhatsApp"
          >
            <ArrowLeft size={17} strokeWidth={1.8} />
          </AdminV3Button>
        )}

        <div className="min-w-0 flex-[1_1_200px]">
          <div className="text-[16px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Broadcast
          </div>
          <div className="mt-[5px] text-[12.5px] font-normal leading-none text-zinc-500 dark:text-zinc-400">
            Send one approved template to many customers
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            title="Refresh"
            aria-label="Refresh broadcasts"
            className={cn(CONTROL, "w-[34px] px-0")}
          >
            <RefreshCw
              size={15}
              strokeWidth={1.8}
              className={refreshing ? "animate-spin" : undefined}
            />
          </button>
          <button
            type="button"
            onClick={downloadAllReports}
            disabled={downloadingAll || broadcasts.length === 0}
            title="One Excel with the overall totals plus every broadcast's totals"
            className={CONTROL}
          >
            {downloadingAll ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} strokeWidth={1.8} />
            )}
            Download all
          </button>
          <AdminV3Button
            variant="primary"
            className="h-[34px] px-[14px] text-[13px] font-medium"
            onClick={() => setCreatorOpen(true)}
            disabled={!connected}
            title={
              !connected
                ? "Connect your WhatsApp Business Account in Settings first"
                : "New broadcast"
            }
          >
            <Plus size={15} strokeWidth={2} />
            New broadcast
          </AdminV3Button>
        </div>
      </div>

      {/* ------------------------------------------------------------ body */}
      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {connected === false && (
          <V3Card className="flex items-start gap-3 border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <AlertCircle
              size={18}
              strokeWidth={1.8}
              className="mt-[1px] shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div>
              <div className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-amber-900 dark:text-amber-200">
                Connect your WhatsApp Business Account
              </div>
              <div className="mt-1.5 text-[12.5px] leading-[1.5] text-amber-800 dark:text-amber-300">
                Broadcasting needs a connected WABA. Open Settings → WhatsApp
                Business and click <b>Connect WhatsApp Business</b>.
              </div>
            </div>
          </V3Card>
        )}

        {/* Stat strip */}
        <V3Card className="flex flex-wrap items-center gap-x-[22px] gap-y-3.5 px-4 py-3.5">
          <div>
            <div className={FIELD_LABEL}>Sent today</div>
            <div className="mt-1 text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
              {nfmt(sentToday)}
            </div>
          </div>

          <div className="w-px self-stretch bg-zinc-100 dark:bg-zinc-800" />

          <div>
            <div className={FIELD_LABEL}>Daily limit left</div>
            <div className="mt-1 flex items-baseline gap-1.5 text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
              {nfmt(remaining)}
              {dailyLimit != null && (
                <span className="text-[12px] font-normal text-zinc-400 dark:text-zinc-500">
                  of {nfmt(dailyLimit)}
                </span>
              )}
            </div>
          </div>

          <div className="w-px self-stretch bg-zinc-100 dark:bg-zinc-800" />

          <div>
            <div className={FIELD_LABEL}>Spend today</div>
            <div className="mt-1 text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
              {formatMoney(spendToday.amount, spendToday.currency)}
            </div>
            <div className="mt-[3px] text-[11px] leading-none text-zinc-400 dark:text-zinc-500">
              {spendToday.mixed
                ? "today's broadcasts (mixed currencies)"
                : "today's broadcasts"}
            </div>
          </div>

          <div className="min-w-0 flex-[1_1_200px] text-[12px] font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
            Sends run in the background — you can leave this page.
          </div>
        </V3Card>

        {/* Broadcast list */}
        <V3Card className="lg:overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className="flex-[1_1_auto] text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              Your broadcasts
            </span>
            <span className="whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Newest first
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2
                size={22}
                className="animate-spin text-zinc-400 dark:text-zinc-500"
              />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="px-4 py-12 text-center text-[13px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
              No broadcasts yet. Use <b>New broadcast</b> to send your first one.
            </div>
          ) : (
            broadcasts.map((b) => {
              const label = broadcastStatusLabel(b.status, b.scheduled_at);
              const done = b.sent_count + b.failed_count;
              const progress = b.total_recipients
                ? (done / b.total_recipients) * 100
                : 0;
              const canResume = b.status === "paused";
              const canCancel = ["scheduled", "sending", "paused"].includes(
                b.status,
              );
              return (
                <div
                  key={b.id}
                  className="border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                    <span
                      className="font-mono text-[13px] font-semibold leading-none text-zinc-950 dark:text-zinc-50"
                      translate="no"
                    >
                      {b.template_name}
                    </span>
                    <StatusPill tone={statusTone(label)}>
                      {titleCase(label)}
                    </StatusPill>
                    <span className="text-[12px] leading-none tabular-nums text-zinc-400 dark:text-zinc-500">
                      {b.total_recipients} recipients
                      {label === "scheduled" && b.scheduled_at
                        ? ` · ${fmtTime(b.scheduled_at)}`
                        : label === "queued"
                          ? " · sending shortly"
                          : ""}
                    </span>
                    <span className="ml-auto text-[12.5px] font-medium leading-none tabular-nums text-zinc-950 dark:text-zinc-50">
                      {b.total_cost > 0
                        ? formatMoney(b.total_cost, b.cost_currency || "INR")
                        : b.delivered_count > 0
                          ? "Calculating…"
                          : "—"}
                    </span>
                  </div>

                  <MiniProgress
                    value={progress}
                    className="mb-[9px] mt-[11px] h-[5px]"
                  />

                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
                    <Stat label="Sent" value={b.sent_count} />
                    <Stat label="Delivered" value={b.delivered_count} />
                    <Stat label="Read" value={b.read_count} />
                    <Stat label="Failed" value={b.failed_count} danger />

                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {canResume && (
                        <button
                          type="button"
                          onClick={() => act(b.id, "resume")}
                          disabled={busyId === b.id}
                          className={cn(CONTROL, "h-[26px] px-2 text-[12px]")}
                        >
                          {busyId === b.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Play size={12} strokeWidth={1.9} />
                          )}
                          Resume
                        </button>
                      )}
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => act(b.id, "cancel")}
                          disabled={busyId === b.id}
                          className="inline-flex h-[26px] items-center gap-1 rounded-md px-2 text-[12px] font-medium leading-none text-red-600 transition-colors hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          <Ban size={12} strokeWidth={1.9} /> Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetailId(b.id)}
                        className="text-[12.5px] font-medium leading-none text-zinc-600 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                      >
                        Details
                      </button>
                    </div>
                  </div>

                  {b.last_error && b.status === "paused" && (
                    <div className="mt-2.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11.5px] leading-[1.5] text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      {b.last_error}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
            <span className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
              A broadcast paused by the daily limit resumes when it resets.
            </span>
            <button
              type="button"
              onClick={() => setBlocklistOpen(true)}
              title="Blocked / unsubscribed numbers — never sent broadcasts"
              className={cn(CONTROL, "ml-auto h-[30px]")}
            >
              <Ban
                size={14}
                strokeWidth={1.8}
                className="text-zinc-500 dark:text-zinc-400"
              />
              Blocklist
            </button>
          </div>
        </V3Card>
      </div>

      <BroadcastCreatorDialog
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        partnerId={partnerId}
        templates={templates}
        numbers={numbers}
        onCreated={() => {
          setCreatorOpen(false);
          loadBroadcasts();
          loadQuality();
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

/** One "Sent 18" pair from the design's per-broadcast metric row. */
function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-[5px]">
      <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
      <span
        className={cn(
          "text-[12.5px] font-medium leading-none tabular-nums",
          danger && value > 0
            ? "text-red-700 dark:text-red-400"
            : "text-zinc-700 dark:text-zinc-300",
        )}
      >
        {value}
      </span>
    </span>
  );
}
