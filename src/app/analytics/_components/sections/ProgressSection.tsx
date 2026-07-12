"use client";

/**
 * Daily progress — log the team's day-by-day sales activity (calls done, new
 * free trials, new paid customers) and see the full history. DB-backed and
 * shared: everyone sees and adds to the same log. The summary at the top (and
 * the one on the Target tab) aggregates these entries over 24h / 7d / 30d.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NotebookPen,
  Pencil,
  X,
  RefreshCw,
  Loader2,
  Phone,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SectionHeader } from "./OverviewSection";
import { ProgressSummaryTable, nfIN } from "../progressShared";
import type { DailyLogEntry, DailyLogResponse } from "../types";

const REFRESH_MS = 30_000;

const istToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const parseD = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtD = (s: string) => {
  try {
    return parseD(s).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
};
const clampNum = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export default function ProgressSection() {
  const [data, setData] = useState<DailyLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [fDate, setFDate] = useState(istToday);
  const [fCalls, setFCalls] = useState("");
  const [fTrials, setFTrials] = useState("");
  const [fPaid, setFPaid] = useState("");
  const [fNote, setFNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    try {
      const r = await fetch("/api/stats/daily-log", { cache: "no-store" });
      const d = await r.json();
      setData(d);
    } catch (e) {
      console.error("daily-log load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const entries = data?.entries ?? [];

  const resetForm = () => {
    setEditId(null);
    setFDate(istToday());
    setFCalls("");
    setFTrials("");
    setFPaid("");
    setFNote("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const calls = clampNum(fCalls);
    const freeTrials = clampNum(fTrials);
    const paidCustomers = clampNum(fPaid);
    const note = fNote.trim();
    if (calls + freeTrials + paidCustomers === 0 && !note) {
      toast.error("Enter at least one number or a note");
      return;
    }
    setSubmitting(true);
    const payload = { logDate: fDate, calls, freeTrials, paidCustomers, note: note || null };
    const r = await fetch("/api/stats/daily-log", {
      method: editId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
    });
    setSubmitting(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Couldn't save");
      return;
    }
    toast.success(editId ? "Log updated" : "Logged");
    resetForm();
    await load(true);
  };

  const startEdit = (en: DailyLogEntry) => {
    setEditId(en.id);
    setFDate(en.logDate);
    setFCalls(en.calls ? String(en.calls) : "");
    setFTrials(en.freeTrials ? String(en.freeTrials) : "");
    setFPaid(en.paidCustomers ? String(en.paidCustomers) : "");
    setFNote(en.note ?? "");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this log entry?")) return;
    setData((prev) =>
      prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== id) } : prev
    );
    if (editId === id) resetForm();
    const r = await fetch(`/api/stats/daily-log?id=${id}`, { method: "DELETE" });
    if (!r.ok) {
      toast.error("Delete failed");
      await load(true);
    } else {
      toast.success("Deleted");
      await load(true);
    }
  };

  const totals = useMemo(
    () =>
      entries.reduce(
        (a, e) => ({
          calls: a.calls + e.calls,
          freeTrials: a.freeTrials + e.freeTrials,
          paidCustomers: a.paidCustomers + e.paidCustomers,
        }),
        { calls: 0, freeTrials: 0, paidCustomers: 0 }
      ),
    [entries]
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Daily progress"
        subtitle="Log calls, free trials and paid customers each day — shared with everyone, saved in the database"
        right={
          <button
            type="button"
            onClick={() => load(true)}
            className="inline-flex size-8 items-center justify-center rounded-md border bg-white text-muted-foreground shadow-sm hover:bg-neutral-50"
            title="Refresh"
          >
            <RefreshCw className={refreshing ? "size-3.5 animate-spin" : "size-3.5"} />
          </button>
        }
      />

      {/* summary */}
      <Card className="border bg-white p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Progress at a glance</h3>
          <span className="text-xs text-muted-foreground">vs the prior equal period</span>
        </div>
        <ProgressSummaryTable summary={data?.summary ?? null} loading={loading} />
      </Card>

      {/* log form */}
      <Card ref={formRef} className="border bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <NotebookPen className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            {editId ? "Edit log entry" : "Log today's progress"}
          </h3>
        </div>
        <form
          onSubmit={submit}
          className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-[auto_1fr_1fr_1fr_1.6fr_auto]"
        >
          <Field label="Date">
            <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required />
          </Field>
          <Field label="Calls done" icon={<Phone className="size-3" />}>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0"
              value={fCalls}
              onChange={(e) => setFCalls(e.target.value)}
            />
          </Field>
          <Field label="New free trials" icon={<Sparkles className="size-3" />}>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0"
              value={fTrials}
              onChange={(e) => setFTrials(e.target.value)}
            />
          </Field>
          <Field label="New paid customers" icon={<BadgeCheck className="size-3" />}>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0"
              value={fPaid}
              onChange={(e) => setFPaid(e.target.value)}
            />
          </Field>
          <Field label="Note (optional)">
            <Input
              type="text"
              maxLength={200}
              placeholder="e.g. Kavaratti market visit"
              value={fNote}
              onChange={(e) => setFNote(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : editId ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
            {editId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* daily logs */}
      <Card className="border bg-white p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Daily logs</h3>
          <span className="text-xs text-muted-foreground">{nfIN(entries.length)} entries</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
            Loading…
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <NotebookPen className="size-5" />
            </div>
            <div className="text-base font-semibold">No entries yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Log the day&rsquo;s calls, free trials and paid customers above.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 text-left font-medium">Date</th>
                  <th className="px-3 py-2.5 text-right font-medium">Calls</th>
                  <th className="px-3 py-2.5 text-right font-medium">Free trials</th>
                  <th className="px-3 py-2.5 text-right font-medium">Paid customers</th>
                  <th className="px-3 py-2.5 text-left font-medium">Note</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-muted last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium">{fmtD(e.logDate)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{nfIN(e.calls)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-sky-700">
                      {nfIN(e.freeTrials)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-700">
                      {nfIN(e.paidCustomers)}
                    </td>
                    <td className="px-3 py-2.5 text-left text-muted-foreground">{e.note ?? ""}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(e)}
                        className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => del(e.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                        title="Delete"
                      >
                        <X className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20 font-semibold">
                  <td className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    All-time total
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{nfIN(totals.calls)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-sky-700">
                    {nfIN(totals.freeTrials)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">
                    {nfIN(totals.paidCustomers)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Saved in the database and shared with everyone — no localStorage. The Target tab shows this
        same progress above the restaurant watchlist.
      </p>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
