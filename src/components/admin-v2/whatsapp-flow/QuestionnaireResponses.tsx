"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  Download,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuestionnaireAnswer } from "@/lib/whatsappFlow/questionnaire";

/**
 * Every questionnaire submission this store has received, one row per customer.
 *
 * Shared by the admin-v2 and admin-v3 Flows screens. Columns come from the rows
 * themselves, not from the questionnaire as it stands today, so answers to a
 * question that has since been renamed or removed still show up.
 */

interface ResponseRow {
  id: string;
  flow_id: string | null;
  flow_name: string | null;
  node_id: string;
  contact_phone: string;
  contact_name: string | null;
  answers: QuestionnaireAnswer[];
  summary: string | null;
  submitted_at: string;
}

interface Source {
  node_id: string;
  flow_id: string | null;
  flow_name: string | null;
}

const PAGE_SIZE = 50;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QuestionnaireResponses({
  partnerId,
  onClose,
}: {
  partnerId?: string;
  /** Back to the flows list. */
  onClose: () => void;
}) {
  const [rows, setRows] = React.useState<ResponseRow[]>([]);
  const [columns, setColumns] = React.useState<{ name: string; label: string }[]>([]);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [total, setTotal] = React.useState(0);
  const [nodeId, setNodeId] = React.useState<string>("all");
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        partnerId,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (nodeId !== "all") params.set("nodeId", nodeId);
      const res = await fetch(`/api/whatsapp/questionnaire-responses?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load responses");
      setRows(data.responses || []);
      setColumns(data.columns || []);
      setTotal(data.total || 0);
      // The filter list is global, so only adopt it while unfiltered — a
      // filtered fetch would otherwise shrink the dropdown to the one option
      // already chosen and there'd be no way back to "All".
      if (nodeId === "all") setSources(data.sources || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load responses");
    } finally {
      setLoading(false);
    }
  }, [partnerId, nodeId, page]);

  React.useEffect(() => {
    load();
  }, [load]);

  const downloadCsv = () => {
    if (!partnerId) return;
    const params = new URLSearchParams({ partnerId, format: "csv" });
    if (nodeId !== "all") params.set("nodeId", nodeId);
    window.open(`/api/whatsapp/questionnaire-responses?${params}`, "_blank");
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="-ml-2">
          <ChevronLeft className="mr-1 h-4 w-4" /> Flows
        </Button>
        <span className="text-sm font-medium">Questionnaire responses</span>
        <span className="text-xs text-muted-foreground">
          {total} {total === 1 ? "answer" : "answers"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {sources.length > 1 && (
            <Select
              value={nodeId}
              onValueChange={(v) => {
                setNodeId(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-8 w-[190px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All questionnaires</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.node_id} value={s.node_id}>
                    {s.flow_name || "Untitled flow"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCsv}
            disabled={!rows.length}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !rows.length ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Inbox className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No answers yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            When a customer fills in a questionnaire step, their answers land
            here — one row each, with a column per question.
          </p>
        </div>
      ) : (
        <>
          {/* Wide tables scroll inside their own box so the page never does. */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <Th>When</Th>
                  <Th>Customer</Th>
                  {sources.length > 1 && nodeId === "all" && <Th>Flow</Th>}
                  {columns.map((c) => (
                    <Th key={c.name}>{c.label}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const byName = new Map((r.answers || []).map((a) => [a.name, a.value]));
                  return (
                    <tr key={r.id} className="border-t align-top">
                      <Td className="whitespace-nowrap text-muted-foreground">
                        {formatWhen(r.submitted_at)}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="block font-medium">
                          {r.contact_name || r.contact_phone}
                        </span>
                        {r.contact_name && (
                          <span className="block text-[10px] text-muted-foreground">
                            {r.contact_phone}
                          </span>
                        )}
                      </Td>
                      {sources.length > 1 && nodeId === "all" && (
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {r.flow_name || "—"}
                        </Td>
                      )}
                      {columns.map((c) => (
                        <Td key={c.name}>{byName.get(c.name) || "—"}</Td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {page + 1} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= pages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 font-medium text-muted-foreground">{children}</th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
