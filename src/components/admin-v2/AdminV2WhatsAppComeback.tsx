"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store/authStore";
import { SEGMENTS } from "@/lib/customerSegments";
import {
  MIN_AUDIENCE_FOR_HOLDOUT, MIN_PHONE_COVERAGE_FOR_HEADLINE,
  ATTRIBUTION_WINDOW_DAYS, PER_CUSTOMER_COOLDOWN_DAYS, MAX_ATTEMPTS_PER_CUSTOMER,
  MIN_TRIGGER_DAYS, MAX_TRIGGER_DAYS, STALENESS_CAP_DAYS,
} from "@/lib/comeback/config";
import {
  Loader2, Users, Info, AlertTriangle, CheckCircle2, Clock, Sparkles, Send, Plus,
} from "lucide-react";
import { ComebackTemplateCreator } from "@/components/admin-v2/comeback/ComebackTemplateCreator";

/**
 * Comeback Messages — a standing rule that watches every customer.
 *
 * The partner says, per customer group, what to send and how many days of silence
 * should pass first. The rule then keeps checking on its own: anyone who crosses
 * their group's threshold gets that group's message. What you say to a lapsed
 * regular is not what you say to someone who enquired and never ordered, which is
 * why the template is per segment rather than one for everybody.
 *
 * Auto-send is a switch. With it off the rule still runs but stops at a preview
 * for approval — useful while a partner is deciding whether to trust it, since
 * this sends marketing from the same number that carries their order
 * confirmations. With it on, no one is in the loop and the rule just runs.
 */

/**
 * Templates come from the API with ?sync=1, not straight from Hasura.
 *
 * whatsapp_message_templates is a local MIRROR of Meta's list, and it is only
 * reconciled when someone loads the Templates screen. Reading it directly meant a
 * template written here sat at PENDING until the partner happened to visit
 * another screen — so a message they had just created, and which Meta had already
 * approved, simply was not in this dropdown.
 */
async function loadTemplates(partnerId: string) {
  const r = await fetch(
    `/api/whatsapp/templates?partnerId=${partnerId}&sync=1`,
  ).then((x) => x.json());
  return (r?.templates || []).filter((t: any) => t.category === "MARKETING");
}

interface Settings {
  enabled: boolean;
  segments: string[];
  min_visits: number;
  template_id: string | null;
  template_name: string | null;
  template_language: string;
  send_from_phone_number_id: string | null;
  monthly_message_cap: number;
  url_button_index: number | null;
  auto_send: boolean;
  trigger_days: number | null;
}

interface SegTpl {
  segment: string;
  enabled: boolean;
  template_id: string | null;
  template_name: string | null;
  template_language: string;
  url_button_index: number | null;
  trigger_days: number | null;
}

interface Batch {
  id: string;
  status: string;
  blocked_reason: string | null;
  blocked_detail: string | null;
  breakdown: any;
  treatment_count: number;
  holdout_count: number;
  est_cost: number;
  est_cost_currency: string | null;
  template_name: string | null;
  message_preview: string | null;
  phone_coverage: number | null;
  store_cadence_days: number | null;
  built_at: string;
  expires_at: string;
  approved_at: string | null;
  scheduled_at: string | null;
  measured_at: string | null;
  results: any;
  created_at: string;
}

/**
 * Position of a DYNAMIC url button (one whose URL ends in a {{n}} variable) in a
 * template's BUTTONS component, or null if it has none.
 *
 * Read from the template itself rather than remembered from when it was created,
 * so a template written in the Templates screen — or edited later — is handled
 * correctly too. Meta addresses buttons positionally, so the index has to match
 * the template's own ordering.
 */
function dynamicUrlButtonIndex(components: any): number | null {
  const comps = Array.isArray(components) ? components : [];
  const btns = comps.find((c: any) => c?.type === "BUTTONS")?.buttons;
  if (!Array.isArray(btns)) return null;
  const i = btns.findIndex(
    (b: any) => b?.type === "URL" && /\{\{\d+\}\}/.test(String(b?.url || "")),
  );
  return i >= 0 ? i : null;
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";

export function AdminV2WhatsAppComeback() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [partner, setPartner] = useState<any>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [segTpls, setSegTpls] = useState<SegTpl[]>([]);

  const load = useCallback(async () => {
    if (!partnerId) return;
    try {
      const [res, tpl] = await Promise.all([
        fetch(`/api/whatsapp/comeback?partnerId=${partnerId}`).then((r) => r.json()),
        loadTemplates(partnerId).catch(() => []),
      ]);
      setPartner(res?.partner || null);
      setSettings(
        res?.settings || {
          enabled: false, segments: [], min_visits: 2, template_id: null,
          template_name: null, template_language: "en",
          send_from_phone_number_id: null, monthly_message_cap: 400,
          url_button_index: null, auto_send: false, trigger_days: null,
        },
      );
      setBatches(res?.batches || []);
      setSegTpls(res?.segmentTemplates || []);
      setTemplates(tpl || []);
    } catch {
      toast.error("Couldn't load Comeback Messages");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { load(); }, [load]);

  const post = async (body: any) => {
    const r = await fetch("/api/whatsapp/comeback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId, ...body }),
    });
    return r.json();
  };

  const saveSettings = async (next: Partial<Settings>) => {
    const merged = { ...(settings as Settings), ...next };
    setSettings(merged);
    const res = await post({
      action: "saveSettings",
      enabled: merged.enabled,
      segments: merged.segments,
      minVisits: merged.min_visits,
      templateId: merged.template_id,
      templateName: merged.template_name,
      templateLanguage: merged.template_language,
      urlButtonIndex: merged.url_button_index,
      autoSend: merged.auto_send,
      triggerDays: merged.trigger_days,
      monthlyMessageCap: merged.monthly_message_cap,
    });
    if (res?.error) toast.error("Couldn't save");
  };

  const saveSegTpl = async (segment: string, patch: Partial<SegTpl>) => {
    const cur = segTpls.find((t) => t.segment === segment) || {
      segment, enabled: true, template_id: null, template_name: null,
      template_language: "en", url_button_index: null, trigger_days: null,
    };
    const next = { ...cur, ...patch };
    setSegTpls((list) => {
      const rest = list.filter((t) => t.segment !== segment);
      return [...rest, next];
    });
    const res = await post({
      action: "saveSegmentTemplate",
      segment,
      enabled: next.enabled,
      templateId: next.template_id,
      templateName: next.template_name,
      templateLanguage: next.template_language,
      urlButtonIndex: next.url_button_index,
      triggerDays: next.trigger_days,
    });
    if (res?.error) toast.error("Couldn't save");
  };

  const buildPreview = async () => {
    setBuilding(true);
    try {
      const res = await post({ action: "build" });
      if (res?.blocked) toast.error(res.blocked.detail);
      else if (res?.error) toast.error("Couldn't build a preview");
      else {
        toast.success(
          res.treatment ? `${res.treatment} customers ready to review` : "Nothing to send right now",
        );
      }
      await load();
    } finally {
      setBuilding(false);
    }
  };

  const approve = async (batchId: string) => {
    setActing(batchId);
    try {
      const res = await post({ action: "approve", batchId, approvedBy: (userData as any)?.email });
      if (res?.ok && res.queued) toast.success(`Queued for ${res.queued} customers`);
      else if (res?.alreadyHandled) toast.info("Already sent");
      else toast.error("Couldn't approve");
      await load();
    } finally {
      setActing(null);
    }
  };

  const discard = async (batchId: string) => {
    setActing(batchId);
    try {
      await post({ action: "discard", batchId });
      toast.success("Discarded");
      await load();
    } finally {
      setActing(null);
    }
  };

  const live = useMemo(() => batches.find((b) => b.status === "preview"), [batches]);
  const history = useMemo(
    () => batches.filter((b) => b.status !== "preview" && b.status !== "blocked"),
    [batches],
  );
  const lastBlocked = useMemo(() => batches.find((b) => b.status === "blocked"), [batches]);
  const currency = partner?.currency || "₹";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const approved = templates.filter((t) => t.status === "APPROVED");
  const pending = templates.filter((t) => t.status === "PENDING");
  const noTemplate = approved.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Sparkles className="h-5 w-5 text-orange-500" /> Comeback Messages
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Keeps an eye on every customer and messages them when they go quiet for
            longer than you have allowed — with wording you choose per group.
          </p>
        </div>
        <HowItWorks />
      </div>

      {/* Readiness — for most restaurants the honest answer is "we can't reach them yet". */}
      {noTemplate && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">
              You need an approved marketing template first
            </p>
            <p className="mt-1 text-amber-800/80 dark:text-amber-200/70">
              A “we miss you” message is marketing under WhatsApp&apos;s rules, so it has to
              go out on a template Meta has approved in the MARKETING category.
              {pending.length > 0
                ? " Yours is with WhatsApp now — this usually takes a few minutes."
                : " We'll help you write one."}
            </p>
            {pending.length === 0 && (
              <Button size="sm" className="mt-3" onClick={() => setCreatorOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Write my comeback message
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-base font-semibold">Turn on Comeback Messages</Label>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Drafts a batch for you to review. It never sends on its own.
            </p>
          </div>
          <Switch
            checked={!!settings?.enabled}
            disabled={noTemplate}
            onCheckedChange={(v) => saveSettings({ enabled: v })}
          />
        </div>

        {settings?.enabled && (
          <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label className="text-sm">Send automatically</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    When on, the rule runs on its own and messages go out without
                    you approving each batch.
                  </p>
                </div>
                <Switch
                  checked={!!settings.auto_send}
                  onCheckedChange={(v) => saveSettings({ auto_send: v })}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">A message for each group</Label>
                <button
                  type="button"
                  onClick={() => setCreatorOpen(true)}
                  className="text-xs font-medium text-orange-600 hover:underline"
                >
                  <Plus className="mr-1 inline h-3 w-3" />Write a message
                </button>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pick who to chase, what to say to them, and how many days of
                silence should pass first. Groups with no message are left alone.
              </p>

              <div className="mt-3 space-y-2">
                {SEGMENTS.map((seg) => {
                  const t = segTpls.find((x) => x.segment === seg.id);
                  const on = !!t?.enabled && !!t?.template_name;
                  return (
                    <div
                      key={seg.id}
                      className={`rounded-lg border p-3 ${on ? "" : "bg-muted/30"}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${seg.className} shrink-0`}>{seg.label}</Badge>
                        <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                          {seg.definition}
                        </span>
                        <Switch
                          checked={!!t?.enabled}
                          onCheckedChange={(v) => saveSegTpl(seg.id, { enabled: v })}
                        />
                      </div>
                      {t?.enabled && (
                        <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <Select
                            value={t?.template_id || ""}
                            onValueChange={(v) => {
                              const tpl = templates.find((x) => x.id === v);
                              saveSegTpl(seg.id, {
                                template_id: v,
                                template_name: tpl?.name || null,
                                template_language: tpl?.language || "en",
                                url_button_index: dynamicUrlButtonIndex(tpl?.components),
                              });
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Choose what to say" />
                            </SelectTrigger>
                            <SelectContent>
                              {approved.map((x) => (
                                <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
                              ))}
                              {pending.map((x) => (
                                <SelectItem key={x.id} value={x.id} disabled>
                                  {x.name} — waiting for WhatsApp
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1.5">
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              after
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={STALENESS_CAP_DAYS}
                              value={t?.trigger_days ?? ""}
                              placeholder="auto"
                              onChange={(e) =>
                                saveSegTpl(seg.id, {
                                  trigger_days: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              className="h-9 w-20 rounded-md border bg-background px-2 text-sm"
                            />
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              days quiet
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Leave the days box empty to let each customer&apos;s own ordering
                rhythm decide — someone who used to come twice a week is overdue
                far sooner than someone who came monthly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* The live preview — the heart of the screen */}
      {live ? (
        <PreviewCard
          batch={live}
          currency={currency}
          busy={acting === live.id}
          onApprove={() => approve(live.id)}
          onDiscard={() => discard(live.id)}
        />
      ) : (
        <div className="rounded-xl border bg-card p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 font-medium">No batch waiting for you</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {lastBlocked?.blocked_detail ||
              "Build a preview to see who has gone quiet and what it would cost to reach them."}
          </p>
          <Button className="mt-4" onClick={buildPreview} disabled={building || !settings?.enabled || noTemplate}>
            {building ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
            Build a preview
          </Button>
        </div>
      )}

      {partnerId && (
        <ComebackTemplateCreator
          open={creatorOpen}
          onOpenChange={setCreatorOpen}
          partnerId={partnerId}
          storeName={partner?.store_name || ""}
          username={partner?.username || null}
          phoneNumberId={settings?.send_from_phone_number_id}
          onCreated={() => load()}
        />
      )}

      {history.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-5 py-3 font-semibold">Past batches</div>
          <div className="divide-y">
            {history.map((b) => (
              <HistoryRow key={b.id} batch={b} currency={currency} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** The exclusion arithmetic, so an audience size is explainable rather than magic. */
function Breakdown({ b, coverage }: { b: any; coverage: number | null }) {
  if (!b) return null;
  const rows: [string, number][] = ([
    ["no phone number on file", b.noPhone || 0],
    ["still ordering recently", b.tooRecent || 0],
    ["too few visits to count", b.tooFewVisits || 0],
    [`quiet longer than ${STALENESS_CAP_DAYS} days`, b.tooStale || 0],
    ["messaged recently already", b.cooldown || 0],
    ["opted out", b.optedOut || 0],
  ] as [string, number][]).filter(([, n]) => n > 0);
  const bad = Object.values(b.badPhone || {}).reduce((a: number, n: any) => a + Number(n), 0);
  if (bad > 0) rows.push(["unusable phone number", bad] as [string, number]);

  return (
    <div className="rounded-lg bg-muted/50 p-3 text-xs">
      <p className="font-medium text-foreground">
        Of {b.totalCustomers || 0} customers
      </p>
      <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
        {rows.map(([label, n]) => (
          <li key={label} className="flex justify-between gap-4">
            <span>{label}</span>
            <span className="tabular-nums">−{n}</span>
          </li>
        ))}
        <li className="flex justify-between gap-4 border-t pt-1 font-medium text-foreground">
          <span>ready to message</span>
          <span className="tabular-nums">{b.eligible || 0}</span>
        </li>
      </ul>
      {coverage != null && coverage < MIN_PHONE_COVERAGE_FOR_HEADLINE && (
        <p className="mt-2 border-t pt-2 text-amber-700 dark:text-amber-400">
          Only {Math.round(coverage * 100)}% of your orders record a phone number, so most
          of your customers can&apos;t be reached this way — and returns that walk in at the
          counter won&apos;t be visible in the results.
        </p>
      )}
    </div>
  );
}

function PreviewCard({
  batch, currency, busy, onApprove, onDiscard,
}: {
  batch: Batch; currency: string; busy: boolean;
  onApprove: () => void; onDiscard: () => void;
}) {
  const total = batch.treatment_count + batch.holdout_count;
  return (
    <div className="rounded-xl border-2 border-orange-200 bg-card p-5 dark:border-orange-900/50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Waiting for you</Badge>
            <span className="text-xs text-muted-foreground">
              built {fmtDate(batch.built_at)} · expires {fmtDate(batch.expires_at)}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {batch.treatment_count} <span className="text-base font-normal text-muted-foreground">customers to message</span>
          </p>
          <p className="text-sm text-muted-foreground">
            about {currency}{batch.est_cost?.toFixed(2)} in WhatsApp fees
            {batch.scheduled_at ? ` · would send around ${fmtDate(batch.scheduled_at)}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={busy}>Not now</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={busy || batch.treatment_count === 0}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Approve &amp; send
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send to {batch.treatment_count} customers?</AlertDialogTitle>
                <AlertDialogDescription>
                  This sends a marketing message from your own WhatsApp number and costs
                  about {currency}{batch.est_cost?.toFixed(2)}. Each customer can stop
                  future messages by replying, and won&apos;t be contacted again for at
                  least {PER_CUSTOMER_COOLDOWN_DAYS} days.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onApprove}>Send it</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Breakdown b={batch.breakdown} coverage={batch.phone_coverage} />
        <div className="space-y-2 text-xs text-muted-foreground">
          {batch.holdout_count > 0 ? (
            <p className="rounded-lg bg-muted/50 p-3">
              <strong className="text-foreground">{batch.holdout_count} held back on purpose.</strong>{" "}
              We leave a small group un-messaged so that in {ATTRIBUTION_WINDOW_DAYS} days we
              can tell you how many extra orders this actually caused — rather than counting
              people who would have come back anyway.
            </p>
          ) : total > 0 ? (
            <p className="rounded-lg bg-muted/50 p-3">
              This batch is under {MIN_AUDIENCE_FOR_HOLDOUT} people, so we aren&apos;t holding
              a comparison group back — it would be too small to mean anything. Results will
              build up across batches instead.
            </p>
          ) : null}
          {batch.store_cadence_days != null && (
            <p className="rounded-lg bg-muted/50 p-3">
              Your customers typically return every{" "}
              <strong className="text-foreground">{batch.store_cadence_days} days</strong>.
              Everyone here is well past their own usual gap.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ batch, currency }: { batch: Batch; currency: string }) {
  const r = batch.results || {};
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
      <div>
        <p className="font-medium">
          {batch.treatment_count} messaged
          {batch.holdout_count ? ` · ${batch.holdout_count} held back` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {fmtDate(batch.approved_at || batch.created_at)} · {batch.template_name || "—"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {batch.measured_at ? (
          <span className="text-xs">
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
            {r.extraOrders != null
              ? `about ${r.extraOrders} extra orders`
              : `${r.returned ?? 0} came back`}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            <Clock className="mr-1 inline h-3.5 w-3.5" /> measuring
          </span>
        )}
        <Badge variant="outline" className="text-xs">{batch.status}</Badge>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="mr-2 h-4 w-4" /> How this works
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 text-sm">
        <p className="font-semibold">Who gets picked</p>
        <p className="mt-1 text-muted-foreground">
          Not a fixed number of days. Each customer is measured against their own
          rhythm — someone who used to come twice a week is overdue much sooner than
          someone who came every other month. In practice that lands between{" "}
          {MIN_TRIGGER_DAYS} and {MAX_TRIGGER_DAYS} days of silence, and we stop
          entirely after {STALENESS_CAP_DAYS} days, when a message is more likely to
          annoy than to work.
        </p>
        <p className="mt-3 font-semibold">How often</p>
        <p className="mt-1 text-muted-foreground">
          At most {MAX_ATTEMPTS_PER_CUSTOMER} messages per customer, ever, and never
          within {PER_CUSTOMER_COOLDOWN_DAYS} days of each other. The third message in
          a win-back sequence performs worst and gets blocked most — and a block hurts
          the same number your order confirmations go out on.
        </p>
        <p className="mt-3 font-semibold">How results are measured</p>
        <p className="mt-1 text-muted-foreground">
          When a batch is big enough we hold ~10% back and message nobody in that
          group. Comparing the two after {ATTRIBUTION_WINDOW_DAYS} days shows how many
          orders the message actually caused, instead of taking credit for customers
          who were coming back regardless.
        </p>
        <p className="mt-3 font-semibold">The segments</p>
        <ul className="mt-1 space-y-1 text-muted-foreground">
          {SEGMENTS.filter((s) => ["at_risk", "lapsed", "one_and_done"].includes(s.id)).map((s) => (
            <li key={s.id}><strong className="text-foreground">{s.label}</strong> — {s.definition}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
