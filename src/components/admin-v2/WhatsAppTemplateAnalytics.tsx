"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  MousePointerClick,
  Info,
  RefreshCw,
} from "lucide-react";

interface TemplateLite {
  name: string;
  status: string;
  category: string;
  components: any[];
}

interface ClickSummary {
  template: string;
  totalClicks: number;
  byButton: { button: string; count: number }[];
}

// Does this template have at least one quick-reply button? Only those are
// click-tracked (URL/CTA/OTP buttons send no webhook).
function hasQuickReply(components: any[]): boolean {
  const btns = (components || []).find(
    (c) => (c?.type || "").toUpperCase() === "BUTTONS",
  );
  return (btns?.buttons || []).some(
    (b: any) => (b?.type || "").toUpperCase() === "QUICK_REPLY",
  );
}

export function WhatsAppTemplateAnalytics({
  partnerId,
  templates,
  onClose,
}: {
  partnerId: string | undefined;
  templates: TemplateLite[];
  onClose: () => void;
}) {
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<ClickSummary[]>([]);

  const load = useCallback(async () => {
    if (!partnerId) {
      setLoading(false);
      setError("No partner in session.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/whatsapp/analytics/template-clicks?partnerId=${encodeURIComponent(
          partnerId,
        )}&days=${days}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load analytics");
      setSummaries(data.summary || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [partnerId, days]);

  useEffect(() => {
    load();
  }, [load]);

  const byName = useMemo(() => {
    const m = new Map<string, ClickSummary>();
    for (const s of summaries) m.set(s.template, s);
    return m;
  }, [summaries]);

  const totalClicks = useMemo(
    () => summaries.reduce((a, s) => a + (s.totalClicks || 0), 0),
    [summaries],
  );

  // Templates sorted by clicks (desc), then name.
  const rows = useMemo(() => {
    return [...templates]
      .map((t) => ({ t, clicks: byName.get(t.name)?.totalClicks || 0 }))
      .sort((a, b) => b.clicks - a.clicks || a.t.name.localeCompare(b.t.name));
  }, [templates, byName]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button
            onClick={onClose}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to templates
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-green-600" />
            Template Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Quick-reply button taps recorded per template.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex gap-3 p-4 items-start">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-900/90">
            Only <b>quick-reply</b> button taps are counted (recorded from your webhook).
            <b> URL / call-to-action buttons</b> like “Order Now” send no signal from WhatsApp,
            so their taps can’t be tracked. Counts accrue going forward — not backdated.
          </div>
        </CardContent>
      </Card>

      {!loading && !error && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MousePointerClick className="h-4 w-4" />
          <span>
            <b className="text-foreground">{totalClicks}</b> total button{" "}
            {totalClicks === 1 ? "tap" : "taps"} across all templates in this range
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-4 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No templates found.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ t, clicks }) => {
            const summary = byName.get(t.name);
            const trackable = hasQuickReply(t.components);
            return (
              <Card key={t.name}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold break-all">{t.name}</CardTitle>
                    <Badge variant="outline" className="shrink-0 text-[11px]">
                      {t.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {!trackable ? (
                    <p className="text-sm text-muted-foreground">
                      No quick-reply button — taps aren’t trackable for this template.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold tracking-tight">{clicks}</span>
                        <span className="text-sm text-muted-foreground">
                          button {clicks === 1 ? "tap" : "taps"}
                        </span>
                      </div>
                      {summary && summary.byButton.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {summary.byButton.map((b) => (
                            <div
                              key={b.button}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-muted-foreground truncate mr-2">
                                “{b.button}”
                              </span>
                              <span className="font-semibold">{b.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
