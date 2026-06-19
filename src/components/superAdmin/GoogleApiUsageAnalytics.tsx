"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  getGoogleApiUsageStats,
  type GoogleApiUsageStats,
} from "@/app/actions/googleApiUsage";

const REFRESH_MS = 8000;

const fmt = (n: number) => n.toLocaleString("en-IN");

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${accent}`}>{fmt(value)}</p>
    </div>
  );
}

// Per-API request breakdown shown when an order/partner row is expanded.
function ApiBreakdown({ items }: { items: { api: string; count: number }[] }) {
  if (items.length === 0) {
    return <p className="px-2 py-2 text-xs text-stone-400">No API detail</p>;
  }
  return (
    <div className="flex flex-wrap gap-2 px-2 py-2">
      {items.map((b) => (
        <span
          key={b.api}
          className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs"
        >
          <span className="font-medium text-stone-700">{b.api}</span>
          <span className="rounded bg-stone-100 px-1.5 font-semibold tabular-nums text-stone-900">
            {fmt(b.count)}
          </span>
        </span>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h3 className="text-sm font-bold text-stone-900">{title}</h3>
        {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
      </div>
      <div className="p-2 sm:p-3">{children}</div>
    </div>
  );
}

export default function GoogleApiUsageAnalytics() {
  const [stats, setStats] = useState<GoogleApiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  // Which order / partner rows are expanded to show their API breakdown.
  const [openOrders, setOpenOrders] = useState<Set<string>>(new Set());
  const [openPartners, setOpenPartners] = useState<Set<string>>(new Set());
  const liveRef = useRef(live);
  liveRef.current = live;

  const toggleKey = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    key: string,
  ) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const load = useCallback(async () => {
    try {
      const s = await getGoogleApiUsageStats();
      setStats(s);
      setErr(null);
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (liveRef.current) load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const maxDay = Math.max(1, ...(stats?.byDay.map((d) => d.count) || [1]));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Google Maps API Usage</h2>
          <p className="text-sm text-stone-500">
            Request counts across the platform · {updatedAt ? `updated ${updatedAt}` : "loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              live ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-600"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${live ? "bg-green-500 animate-pulse" : "bg-stone-400"}`} />
            {live ? "Live" : "Paused"}
          </button>
          <button
            onClick={load}
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{err}</div>
      )}
      {loading && !stats && <p className="text-sm text-stone-500">Loading usage…</p>}

      {stats && (
        <>
          {/* Totals — all live */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Today" value={stats.totals.today} accent="text-[#E85D04]" />
            <Stat label="This Week" value={stats.totals.week} accent="text-blue-600" />
            <Stat label="This Month" value={stats.totals.month} accent="text-violet-600" />
            <Stat label="All-time" value={stats.totals.all} accent="text-stone-900" />
          </div>

          {/* Per API */}
          <SectionCard title="By API" subtitle="Request count per Google API, by period">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-2 py-2">API</th>
                    <th className="px-2 py-2 text-right">Today</th>
                    <th className="px-2 py-2 text-right">Week</th>
                    <th className="px-2 py-2 text-right">Month</th>
                    <th className="px-2 py-2 text-right">All-time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byApi.length === 0 && (
                    <tr><td colSpan={5} className="px-2 py-3 text-center text-stone-400">No requests yet</td></tr>
                  )}
                  {stats.byApi.map((a) => (
                    <tr key={a.api} className="border-t border-stone-100">
                      <td className="px-2 py-2 font-medium text-stone-800">{a.api}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(a.today)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(a.week)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(a.month)}</td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums">{fmt(a.all)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Per day */}
          <SectionCard title="Per day (last 30 days)" subtitle="Total requests per calendar day">
            {stats.byDay.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-stone-400">No requests yet</p>
            ) : (
              <div className="space-y-1">
                {stats.byDay.slice().reverse().map((d) => (
                  <div key={d.day} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 tabular-nums text-stone-500">{d.day}</span>
                    <div className="h-4 flex-1 rounded bg-stone-100">
                      <div
                        className="h-4 rounded bg-[#E85D04]/80"
                        style={{ width: `${Math.max(2, (d.count / maxDay) * 100)}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-stone-700">{fmt(d.count)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Per partner this month — click a row for the API breakdown */}
          <SectionCard
            title="By partner (this month)"
            subtitle="Requests per partner · latest first · click a row for the API breakdown"
          >
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-2 py-2">Partner</th>
                    <th className="px-2 py-2">Last used</th>
                    <th className="px-2 py-2 text-right">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byPartnerMonth.length === 0 && (
                    <tr><td colSpan={3} className="px-2 py-3 text-center text-stone-400">No requests this month</td></tr>
                  )}
                  {stats.byPartnerMonth.map((p, i) => {
                    const key = (p.partnerId || "none") + ":" + i;
                    const open = openPartners.has(key);
                    return (
                      <Fragment key={key}>
                        <tr
                          className="cursor-pointer border-t border-stone-100 hover:bg-stone-50"
                          onClick={() => toggleKey(setOpenPartners, key)}
                        >
                          <td className="px-2 py-2 text-stone-800">
                            <span className="inline-flex items-center gap-1">
                              <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${open ? "rotate-90" : ""}`} />
                              {p.storeName}
                            </span>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs tabular-nums text-stone-500">{p.lastAt}</td>
                          <td className="px-2 py-2 text-right font-semibold tabular-nums">{fmt(p.count)}</td>
                        </tr>
                        {open && (
                          <tr className="border-t border-stone-50 bg-stone-50/60">
                            <td colSpan={3} className="p-0"><ApiBreakdown items={p.byApi} /></td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Per order — click a row for the API breakdown */}
          <SectionCard
            title="By order"
            subtitle="Maps requests tied to a specific order · latest first · click a row for the API breakdown"
          >
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Partner</th>
                    <th className="px-2 py-2">Last used</th>
                    <th className="px-2 py-2 text-right">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byOrder.length === 0 && (
                    <tr><td colSpan={4} className="px-2 py-3 text-center text-stone-400">No order-attributed requests yet</td></tr>
                  )}
                  {stats.byOrder.map((o) => {
                    const open = openOrders.has(o.orderId);
                    return (
                      <Fragment key={o.orderId}>
                        <tr
                          className="cursor-pointer border-t border-stone-100 hover:bg-stone-50"
                          onClick={() => toggleKey(setOpenOrders, o.orderId)}
                        >
                          <td className="px-2 py-2">
                            <span className="inline-flex items-center gap-1">
                              <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${open ? "rotate-90" : ""}`} />
                              <span className="font-mono text-xs text-stone-700">#{o.displayId || o.orderId.slice(0, 8)}</span>
                            </span>
                          </td>
                          <td className="px-2 py-2 text-stone-800">{o.storeName}</td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs tabular-nums text-stone-500">{o.lastAt}</td>
                          <td className="px-2 py-2 text-right font-semibold tabular-nums">{fmt(o.count)}</td>
                        </tr>
                        {open && (
                          <tr className="border-t border-stone-50 bg-stone-50/60">
                            <td colSpan={4} className="p-0"><ApiBreakdown items={o.byApi} /></td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Recent (live feed) */}
          <SectionCard title="Recent requests (live)" subtitle="Latest 50 metered requests">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-2 py-2">Time</th>
                    <th className="px-2 py-2">API</th>
                    <th className="px-2 py-2">Source</th>
                    <th className="px-2 py-2">Partner</th>
                    <th className="px-2 py-2">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.length === 0 && (
                    <tr><td colSpan={5} className="px-2 py-3 text-center text-stone-400">No requests yet</td></tr>
                  )}
                  {stats.recent.map((r) => (
                    <tr key={r.id} className="border-t border-stone-100">
                      <td className="px-2 py-2 whitespace-nowrap tabular-nums text-xs text-stone-500">{r.createdAt}</td>
                      <td className="px-2 py-2">
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-700">{r.api}</span>
                      </td>
                      <td className="px-2 py-2 text-xs text-stone-500">{r.source || "—"}</td>
                      <td className="px-2 py-2 text-stone-800">{r.storeName}</td>
                      <td className="px-2 py-2 font-mono text-xs text-stone-500">{r.orderId ? r.orderId.slice(0, 8) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
