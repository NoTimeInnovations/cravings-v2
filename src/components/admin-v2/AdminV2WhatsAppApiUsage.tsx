"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  Activity,
  CheckCircle2,
  Send,
  Ban,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";

interface ApiLogRow {
  id: string;
  method: string;
  path: string;
  status: number | null;
  ref: string | null;
  created_at: string;
}
interface MsgLogRow {
  template_name: string | null;
  status: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}
interface KeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const SUMMARY_QUERY = `
  query ApiUsageSummary($p: uuid!, $d1: timestamptz!, $d7: timestamptz!, $d30: timestamptz!) {
    today:      partner_api_logs_aggregate(where: { partner_id: { _eq: $p }, created_at: { _gte: $d1 } }) { aggregate { count } }
    week:       partner_api_logs_aggregate(where: { partner_id: { _eq: $p }, created_at: { _gte: $d7 } }) { aggregate { count } }
    month:      partner_api_logs_aggregate(where: { partner_id: { _eq: $p }, created_at: { _gte: $d30 } }) { aggregate { count } }
    errors30:   partner_api_logs_aggregate(where: { partner_id: { _eq: $p }, created_at: { _gte: $d30 }, status: { _gte: 400 } }) { aggregate { count } }
    rl30:       partner_api_logs_aggregate(where: { partner_id: { _eq: $p }, created_at: { _gte: $d30 }, status: { _eq: 429 } }) { aggregate { count } }
    sent30:     whatsapp_message_logs_aggregate(where: { partner_id: { _eq: $p }, category: { _eq: "api" }, status: { _eq: "sent" },   created_at: { _gte: $d30 } }) { aggregate { count } }
    failed30:   whatsapp_message_logs_aggregate(where: { partner_id: { _eq: $p }, category: { _eq: "api" }, status: { _eq: "failed" }, created_at: { _gte: $d30 } }) { aggregate { count } }
    delivered30:whatsapp_message_logs_aggregate(where: { partner_id: { _eq: $p }, category: { _eq: "api" }, delivered_at: { _is_null: false }, created_at: { _gte: $d30 } }) { aggregate { count } }
    read30:     whatsapp_message_logs_aggregate(where: { partner_id: { _eq: $p }, category: { _eq: "api" }, read_at: { _is_null: false }, created_at: { _gte: $d30 } }) { aggregate { count } }
  }
`;

const LOGS_QUERY = `
  query ApiLogs($p: uuid!, $since: timestamptz!) {
    partner_api_logs(where: { partner_id: { _eq: $p }, created_at: { _gte: $since } }, order_by: { created_at: desc }, limit: 1000) {
      id method path status ref created_at
    }
    whatsapp_message_logs(where: { partner_id: { _eq: $p }, category: { _eq: "api" }, created_at: { _gte: $since } }, order_by: { created_at: desc }, limit: 1000) {
      template_name status delivered_at read_at created_at
    }
    partner_api_keys(where: { partner_id: { _eq: $p } }, order_by: { created_at: desc }) {
      id name key_prefix last_used_at revoked_at created_at
    }
  }
`;

function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}
function todayMidnightIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtTime(s: string): string {
  try {
    return new Date(s).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}
function statusClass(status: number | null): string {
  if (status == null) return "bg-muted text-muted-foreground";
  if (status < 300) return "bg-green-100 text-green-800 border-green-200";
  if (status === 429) return "bg-orange-100 text-orange-800 border-orange-200";
  if (status < 500) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}
// Friendly endpoint label from the request path.
function endpointLabel(path: string): string {
  if (path.endsWith("/send-template")) return "Send template";
  if (path.endsWith("/templates")) return "List templates";
  return path.replace("/api/v1/", "");
}

export function AdminV2WhatsAppApiUsage() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [logs, setLogs] = useState<ApiLogRow[]>([]);
  const [msgs, setMsgs] = useState<MsgLogRow[]>([]);
  const [keys, setKeys] = useState<KeyRow[]>([]);

  const load = async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const [sum, rows] = await Promise.all([
        fetchFromHasura(SUMMARY_QUERY, {
          p: partnerId,
          d1: todayMidnightIso(),
          d7: iso(7),
          d30: iso(30),
        }),
        fetchFromHasura(LOGS_QUERY, { p: partnerId, since: iso(30) }),
      ]);
      setSummary({
        today: sum?.today?.aggregate?.count || 0,
        week: sum?.week?.aggregate?.count || 0,
        month: sum?.month?.aggregate?.count || 0,
        errors30: sum?.errors30?.aggregate?.count || 0,
        rl30: sum?.rl30?.aggregate?.count || 0,
        sent30: sum?.sent30?.aggregate?.count || 0,
        failed30: sum?.failed30?.aggregate?.count || 0,
        delivered30: sum?.delivered30?.aggregate?.count || 0,
        read30: sum?.read30?.aggregate?.count || 0,
      });
      setLogs(rows?.partner_api_logs || []);
      setMsgs(rows?.whatsapp_message_logs || []);
      setKeys(rows?.partner_api_keys || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load API usage");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  // ── Derived views (computed from the last 30 days of logs) ──
  const daily = useMemo(() => {
    const days: { key: string; label: string; total: number; errors: number }[] = [];
    const map = new Map<string, { total: number; errors: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      map.set(k, { total: 0, errors: 0 });
      days.push({ key: k, label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), total: 0, errors: 0 });
    }
    for (const r of logs) {
      const k = dayKey(new Date(r.created_at));
      const bucket = map.get(k);
      if (bucket) {
        bucket.total++;
        if ((r.status ?? 0) >= 400) bucket.errors++;
      }
    }
    for (const d of days) {
      const b = map.get(d.key)!;
      d.total = b.total;
      d.errors = b.errors;
    }
    return days;
  }, [logs]);
  const maxDaily = Math.max(1, ...daily.map((d) => d.total));

  const endpoints = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of logs) m.set(r.path, (m.get(r.path) || 0) + 1);
    return [...m.entries()].map(([path, count]) => ({ label: endpointLabel(path), count })).sort((a, b) => b.count - a.count);
  }, [logs]);

  const topTemplates = useMemo(() => {
    const m = new Map<string, { sent: number; delivered: number; failed: number }>();
    for (const r of msgs) {
      const name = r.template_name || "—";
      const cur = m.get(name) || { sent: 0, delivered: 0, failed: 0 };
      if (r.status === "sent") cur.sent++;
      if (r.status === "failed") cur.failed++;
      if (r.delivered_at) cur.delivered++;
      m.set(name, cur);
    }
    return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sent - a.sent).slice(0, 8);
  }, [msgs]);

  const recent = logs.slice(0, 40);

  const successRate = summary && summary.month > 0
    ? Math.round(((summary.month - summary.errors30) / summary.month) * 100)
    : null;
  const deliveryRate = summary && summary.sent30 > 0
    ? Math.round((summary.delivered30 / summary.sent30) * 100)
    : null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7 text-emerald-600" />
            API Usage
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Calls to your public API (<code>/api/v1</code>) and the messages sent through it — last 30 days.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} title="Refresh">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex gap-3 p-4 items-start">
            <KeyRound className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-amber-900">No API access yet</div>
              <div className="text-amber-800/80 mt-0.5">
                This account has no API key. Contact the Cravings team to get one, then usage will show up here.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Activity} tone="emerald" label="API calls (30d)" value={summary?.month ?? 0}
              sub={`${summary?.today ?? 0} today · ${summary?.week ?? 0} this week`} />
            <StatCard icon={CheckCircle2} tone="green" label="Success rate (30d)"
              value={successRate == null ? "—" : `${successRate}%`}
              sub={`${summary?.errors30 ?? 0} errors · ${summary?.rl30 ?? 0} rate-limited`} />
            <StatCard icon={Send} tone="sky" label="Messages sent (30d)" value={summary?.sent30 ?? 0}
              sub={`${summary?.failed30 ?? 0} failed`} />
            <StatCard icon={CheckCircle2} tone="green" label="Delivery rate (30d)"
              value={deliveryRate == null ? "—" : `${deliveryRate}%`}
              sub={`${summary?.delivered30 ?? 0} delivered · ${summary?.read30 ?? 0} read`} />
          </div>

          {/* Calls per day */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calls per day</CardTitle>
              <CardDescription>Last 14 days. Red = failed calls (4xx/5xx).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1.5 h-40">
                {daily.map((d) => {
                  const h = Math.round((d.total / maxDaily) * 100);
                  const errH = d.total > 0 ? Math.round((d.errors / d.total) * h) : 0;
                  return (
                    <div key={d.key} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full flex flex-col justify-end h-32 relative" title={`${d.label}: ${d.total} calls, ${d.errors} errors`}>
                        <div className="w-full rounded-t bg-emerald-500/80 transition-all group-hover:bg-emerald-500" style={{ height: `${h}%` }}>
                          <div className="w-full rounded-t bg-red-400" style={{ height: `${errH}%` }} />
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground leading-none">{d.total}</span>
                      <span className="text-[9px] text-muted-foreground/70 leading-none rotate-0 whitespace-nowrap">{d.label.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Endpoint breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By endpoint (30d)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {endpoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No calls yet.</p>
                ) : (
                  endpoints.map((e) => (
                    <div key={e.label} className="flex items-center justify-between text-sm">
                      <span>{e.label}</span>
                      <Badge variant="outline" className="font-normal">{e.count}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top templates sent (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                {topTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages sent via the API yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {topTemplates.map((t) => (
                      <div key={t.name} className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-mono text-xs truncate">{t.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {t.sent} sent · {t.delivered} delivered{t.failed ? ` · ${t.failed} failed` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* API keys */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> API keys
              </CardTitle>
              <CardDescription>Keys issued for this account (the secret is never shown).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border divide-y">
                {keys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{k.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{k.key_prefix}… · created {fmtTime(k.created_at)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {k.revoked_at ? (
                        <Badge variant="outline" className="text-red-700 border-red-200"><Ban className="h-3 w-3 mr-1" /> Revoked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-700 border-green-200">Active</Badge>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {k.last_used_at ? `used ${fmtTime(k.last_used_at)}` : "never used"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent calls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent calls</CardTitle>
              <CardDescription>Most recent {recent.length} requests.</CardDescription>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No API calls yet.</p>
              ) : (
                <div className="rounded-md border divide-y max-h-96 overflow-auto">
                  {recent.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${statusClass(r.status)}`}>
                          {r.status ?? "—"}
                        </span>
                        <span className="truncate">{endpointLabel(r.path)}</span>
                        {r.ref && <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {r.ref}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{fmtTime(r.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  tone: "emerald" | "green" | "sky";
  label: string;
  value: number | string;
  sub?: string;
}) {
  const toneCls =
    tone === "sky" ? "text-sky-600" : tone === "green" ? "text-green-600" : "text-emerald-600";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${toneCls}`} /> {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
