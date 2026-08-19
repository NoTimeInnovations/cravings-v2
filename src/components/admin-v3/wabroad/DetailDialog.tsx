"use client";

import * as React from "react";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCheck,
  Clock,
  Download,
  Loader2,
  Search,
  Signal,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatMoney } from "@/lib/utils";
import { explainWhatsAppError } from "@/lib/whatsapp-errors";

import { AdminV3Button, MiniProgress, StatusPill } from "../ui/primitives";
import {
  INPUT,
  fmtTime,
  pct,
  qualityLabel,
  tierLabel,
  type DetailBroadcast,
  type ErrorBucket,
  type PhoneQuality,
  type RecipientRow,
} from "./shared";

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

/** WhatsApp-style status indicator for one recipient. */
function RecipientTick({ status }: { status: string }) {
  switch (status) {
    case "read":
      return (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCheck size={14} /> Read
        </span>
      );
    case "delivered":
      return (
        <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
          <CheckCheck size={14} /> Delivered
        </span>
      );
    case "sent":
      return (
        <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
          <Check size={14} /> Sent
        </span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <X size={14} /> Failed
        </span>
      );
    case "skipped":
      return (
        <span className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
          <Ban size={14} /> Skipped
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <Clock size={14} /> Pending
        </span>
      );
  }
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
      ? "text-sky-600 dark:text-sky-400"
      : tone === "green"
        ? "text-green-600 dark:text-green-400"
        : tone === "red"
          ? "text-red-600 dark:text-red-400"
          : "text-zinc-950 dark:text-zinc-50";
  return (
    <div className="rounded-lg border border-zinc-200 p-2.5 text-center dark:border-zinc-800">
      <div
        className={cn(
          "text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em]",
          toneCls,
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[11px] leading-none text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-[3px] text-[11px] leading-none tabular-nums text-zinc-400 dark:text-zinc-500">
        {sub}
      </div>
    </div>
  );
}

/**
 * One broadcast in full: delivery funnel, cost, the sending number's health,
 * why messages failed, and every recipient with its timeline.
 *
 * Reads the same four admin-v2 endpoints — `/broadcasts/:id`,
 * `/broadcasts/:id/recipients`, `/broadcasts/:id/export` and
 * `/meta/phone-quality` — and polls while the send is still in flight.
 */
export function BroadcastDetailDialog({
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
  const [detail, setDetail] = React.useState<DetailBroadcast | null>(null);
  const [quality, setQuality] = React.useState<PhoneQuality | null>(null);
  const [recipients, setRecipients] = React.useState<RecipientRow[]>([]);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [filteredTotal, setFilteredTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [errorBreakdown, setErrorBreakdown] = React.useState<ErrorBucket[]>([]);
  const [errorCodeFilter, setErrorCodeFilter] = React.useState<string | null>(
    null,
  );
  const [downloading, setDownloading] = React.useState(false);

  const open = !!broadcastId;

  React.useEffect(() => {
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

  const loadQuality = async () => {
    if (!partnerId) return;
    try {
      const res = await fetch(
        `/api/whatsapp/meta/phone-quality?partnerId=${partnerId}`,
      );
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

  /**
   * Excel report: a Summary sheet (headline stats + failure breakdown) and a
   * Recipients sheet (every number with its timeline and failure reason).
   */
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
      ws1["!cols"] = [
        { wch: 18 },
        { wch: 22 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 60 },
      ];
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

  // Initial load when opened; full reset when closed.
  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!open) return;
    loadRecipients(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, broadcastId, debouncedSearch, statusFilter, errorCodeFilter]);

  const live = detail?.status === "sending" || detail?.status === "scheduled";
  React.useEffect(() => {
    if (!open || !live) return;
    const t = setInterval(() => {
      loadDetail();
      loadRecipients(true);
      onChanged(); // keep the underlying list rows in sync while live
    }, 7000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, live, debouncedSearch, statusFilter]);

  const total = detail?.total_recipients || 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="h-[95vh] max-h-[95vh] w-[97vw] overflow-y-auto dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-[1100px]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            <span className="font-mono" translate="no">
              {detail?.template_name || "Broadcast"}
            </span>
            {detail && <StatusPill tone="outline">{detail.language}</StatusPill>}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
            {detail?.started_at
              ? `Sent ${fmtTime(detail.started_at)}`
              : detail?.scheduled_at
                ? `Scheduled ${fmtTime(detail.scheduled_at)}`
                : detail?.created_at
                  ? `Created ${fmtTime(detail.created_at)}`
                  : "Loading…"}
            {detail?.completed_at && ` · Completed ${fmtTime(detail.completed_at)}`}
          </DialogDescription>
        </DialogHeader>

        {!detail ? (
          <div className="flex justify-center py-12">
            <Loader2
              size={22}
              className="animate-spin text-zinc-400 dark:text-zinc-500"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <AdminV3Button
                variant="small"
                onClick={downloadReport}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} strokeWidth={1.8} />
                )}
                Download Excel report
              </AdminV3Button>
            </div>

            {/* Delivery funnel */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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

            {/* Cost + number health */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400">
                  <Wallet size={13} strokeWidth={1.8} /> Cost
                </div>
                <div className="text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
                  {formatMoney(
                    detail.total_cost || 0,
                    detail.cost_currency || quality?.currency || "INR",
                  )}
                </div>
                <div className="text-[11.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
                  Meta published {detail.category?.toLowerCase() || "marketing"}{" "}
                  rate
                  {(detail.delivered_count || 0) > 0
                    ? " · charged per delivered message"
                    : " · charged on delivery"}
                </div>
                {quality?.actualSpend && (
                  <div className="mt-1 border-t border-zinc-100 pt-1 text-[11.5px] text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                    Meta-confirmed ({quality.actualSpend.periodLabel}):{" "}
                    <span className="font-medium tabular-nums">
                      {formatMoney(
                        quality.actualSpend.amount,
                        quality.actualSpend.currency || quality?.currency || "USD",
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400">
                  <Signal size={13} strokeWidth={1.8} /> Your number
                </div>
                {quality?.phone ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-[9px] py-[2.5px] text-[11px] font-bold leading-none",
                          qualityLabel(quality.phone.qualityRating).cls,
                        )}
                      >
                        {qualityLabel(quality.phone.qualityRating).text}
                      </span>
                      {quality.phone.displayPhoneNumber && (
                        <span
                          className="text-[11.5px] text-zinc-500 dark:text-zinc-400"
                          translate="no"
                        >
                          {quality.phone.displayPhoneNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                      Limit: {tierLabel(quality.phone.messagingLimitTier)}
                    </div>
                    {quality.usage && (
                      <div className="flex flex-col gap-1">
                        <MiniProgress
                          className="h-[5px]"
                          value={pct(
                            quality.usage.sentToday,
                            quality.usage.dailyLimit,
                          )}
                        />
                        <div className="text-[11.5px] tabular-nums text-zinc-500 dark:text-zinc-400">
                          {quality.usage.sentToday}/{quality.usage.dailyLimit} sent
                          today
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                    Quality info unavailable.
                  </div>
                )}
              </div>
            </div>

            {/* Failure breakdown */}
            {errorBreakdown.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400">
                  <AlertCircle size={13} strokeWidth={1.8} /> Why messages failed
                  {errorCodeFilter && (
                    <button
                      type="button"
                      className="ml-auto text-zinc-600 underline underline-offset-2 dark:text-zinc-300"
                      onClick={() => setErrorCodeFilter(null)}
                    >
                      Clear filter
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {errorBreakdown.map((b) => {
                    const active = errorCodeFilter === (b.code ?? "unknown");
                    return (
                      <button
                        key={b.code ?? "unknown"}
                        type="button"
                        onClick={() =>
                          setErrorCodeFilter(active ? null : (b.code ?? "unknown"))
                        }
                        className={cn(
                          "w-full rounded-md border p-2 text-left transition-colors",
                          active
                            ? "border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-800"
                            : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                            {b.count}
                          </span>
                          <StatusPill tone="outline">{b.categoryLabel}</StatusPill>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {b.side}
                            {b.retryable ? " · retryable" : ""}
                          </span>
                          {b.code && (
                            <span className="ml-auto font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                              #{b.code}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[11.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
                          {b.summary}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recipient explorer */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                  Recipients
                </span>
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-[9px] top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search number or name"
                    className={cn(INPUT, "h-8 w-56 pl-7 text-[12.5px]")}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {STATUS_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setStatusFilter(t.key)}
                    className={cn(
                      "rounded-full border px-[10px] py-[4px] text-[11.5px] font-medium leading-none transition-colors",
                      statusFilter === t.key
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                    )}
                  >
                    {t.label}
                    {counts[t.key] != null && (
                      <span className="ml-1 tabular-nums opacity-70">
                        {counts[t.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="max-h-80 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2
                      size={18}
                      className="animate-spin text-zinc-400 dark:text-zinc-500"
                    />
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
                    No recipients match.
                  </div>
                ) : (
                  recipients.map((r) => {
                    const ts = r.read_at || r.delivered_at || r.failed_at || r.sent_at;
                    const isFailed = r.status === "failed";
                    const exp = expanded === r.id;
                    return (
                      <div key={r.id} className="px-3 py-2">
                        <div
                          className={cn(
                            "flex items-center justify-between gap-2",
                            isFailed && "cursor-pointer",
                          )}
                          onClick={() => isFailed && setExpanded(exp ? null : r.id)}
                        >
                          <div className="min-w-0">
                            <div
                              className="truncate font-mono text-[12px] leading-none text-zinc-950 dark:text-zinc-50"
                              translate="no"
                            >
                              {r.phone}
                            </div>
                            {r.name && (
                              <div
                                className="mt-1 truncate text-[11.5px] leading-none text-zinc-500 dark:text-zinc-400"
                                translate="no"
                              >
                                {r.name}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-3 text-[11.5px]">
                            {r.cost_amount != null && r.cost_amount > 0 && (
                              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                                {formatMoney(
                                  r.cost_amount,
                                  r.cost_currency || detail.cost_currency || "INR",
                                  4,
                                )}
                              </span>
                            )}
                            {ts && (
                              <span className="hidden text-zinc-500 dark:text-zinc-400 sm:inline">
                                {fmtTime(ts)}
                              </span>
                            )}
                            <span className="flex w-24 justify-end">
                              <RecipientTick status={r.status} />
                            </span>
                          </div>
                        </div>
                        {isFailed && exp && (
                          <div className="mt-1.5 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11.5px] leading-[1.5] text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                            {(() => {
                              const ex = explainWhatsAppError(r.error_code, r.error);
                              return (
                                <>
                                  <div className="font-medium">{ex.summary}</div>
                                  {ex.action && (
                                    <div className="mt-0.5 text-red-700 dark:text-red-400">
                                      {ex.action}
                                    </div>
                                  )}
                                  {(r.error_code || r.error_title) && (
                                    <div className="mt-0.5 text-red-500 dark:text-red-500">
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
                <AdminV3Button
                  variant="small"
                  className="w-full"
                  onClick={() => loadRecipients(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    `Load more (${recipients.length}/${filteredTotal})`
                  )}
                </AdminV3Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
