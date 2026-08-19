"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Info,
  Loader2,
  Plus,
  Send,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { SEGMENTS, type SegmentId } from "@/lib/customerSegments";
import { STALENESS_CAP_DAYS } from "@/lib/comeback/config";
import { ComebackTemplateCreator } from "@/components/admin-v2/comeback/ComebackTemplateCreator";
import { AdminV3Button, StatusPill, V3Card } from "./ui/primitives";

/**
 * /admin-v3 → WhatsApp → Comeback messages.
 *
 * A straight re-skin of `src/components/admin-v2/AdminV2WhatsAppComeback.tsx`:
 * same `/api/whatsapp/comeback` GET/POST contract, the same `?sync=1` template
 * read (the local `whatsapp_message_templates` mirror is only reconciled when
 * the Templates screen loads, so reading Hasura directly would hide a template
 * Meta has already approved), and the same per-segment save shape. Nothing about
 * who gets messaged, or when, is decided here — the standing rule runs server
 * side; this screen only edits its settings.
 *
 * What the design shows and we DO have: the master switch, the per-group
 * template + "days quiet" pair, and the past-batch list with its measured
 * outcome. What it shows and we do NOT have: nothing invented — the batch rows
 * come straight from the API, and an unmeasured batch says "measuring" rather
 * than guessing a return count.
 */

/* ------------------------------------------------------------------- types */

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
  treatment_count: number;
  holdout_count: number;
  template_name: string | null;
  approved_at: string | null;
  measured_at: string | null;
  results: { returned?: number; extraOrders?: number } | null;
  created_at: string;
}

interface TemplateRow {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: unknown;
}

/* ----------------------------------------------------------------- helpers */

/** MARKETING templates only — a "we miss you" is marketing under Meta's rules. */
async function loadTemplates(partnerId: string): Promise<TemplateRow[]> {
  const r = await fetch(
    `/api/whatsapp/templates?partnerId=${partnerId}&sync=1`,
  ).then((x) => x.json());
  return ((r?.templates || []) as TemplateRow[]).filter(
    (t) => t.category === "MARKETING",
  );
}

/**
 * Position of a DYNAMIC url button (one whose URL ends in a {{n}} variable) in
 * the template's BUTTONS component, or null. Read from the template rather than
 * remembered, because Meta addresses buttons positionally and a template edited
 * later can move them.
 */
function dynamicUrlButtonIndex(components: unknown): number | null {
  const comps = Array.isArray(components) ? components : [];
  const btns = (comps as Array<{ type?: string; buttons?: unknown }>).find(
    (c) => c?.type === "BUTTONS",
  )?.buttons;
  if (!Array.isArray(btns)) return null;
  const i = (btns as Array<{ type?: string; url?: string }>).findIndex(
    (b) => b?.type === "URL" && /\{\{\d+\}\}/.test(String(b?.url || "")),
  );
  return i >= 0 ? i : null;
}

const fmtDate = (s: string | null) =>
  s
    ? new Date(s).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

/**
 * Design order: strongest relationship first, "never ordered" last. Every
 * segment in `SEGMENTS` is rendered — leaving one out would make it silently
 * unreachable — but the five the design draws lead the list.
 */
const SEGMENT_ORDER: SegmentId[] = [
  "vip",
  "regulars",
  "repeat",
  "new",
  "at_risk",
  "one_and_done",
  "lapsed",
  "lead",
];

/** The design's per-group chip colours, one stock Tailwind pair each. */
const SEG_CHIP: Record<SegmentId, string> = {
  vip: "text-violet-800 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950 dark:border-violet-900",
  regulars:
    "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-900",
  repeat:
    "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-900",
  new: "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-950 dark:border-sky-900",
  at_risk:
    "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-900",
  one_and_done:
    "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-900",
  lapsed:
    "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-900",
  lead: "text-zinc-700 bg-zinc-100 border-zinc-200 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700",
};

/** 38×22 pill switch — same geometry as the Flows toggles. */
function CbToggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[2px] transition-colors",
        on
          ? "justify-end bg-zinc-900 dark:bg-zinc-50"
          : "justify-start bg-zinc-200 dark:bg-zinc-700",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="h-[18px] w-[18px] rounded-full bg-white dark:bg-zinc-900" />
    </button>
  );
}

const SECTION_DIVIDER = "border-b border-zinc-100 dark:border-zinc-800";

/* ------------------------------------------------------------------ screen */

export function AdminV3WhatsAppComeback({
  onBack,
}: { onBack?: () => void } = {}) {
  const { userData } = useAuthStore();
  const partnerId = (userData as { id?: string } | undefined)?.id;

  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [partner, setPartner] = React.useState<{
    store_name?: string;
    username?: string | null;
  } | null>(null);
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [segTpls, setSegTpls] = React.useState<SegTpl[]>([]);
  const [creatorOpen, setCreatorOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!partnerId) return;
    try {
      const [res, tpl] = await Promise.all([
        fetch(`/api/whatsapp/comeback?partnerId=${partnerId}`).then((r) =>
          r.json(),
        ),
        loadTemplates(partnerId).catch(() => [] as TemplateRow[]),
      ]);
      setPartner(res?.partner || null);
      setSettings(
        res?.settings || {
          enabled: false,
          segments: [],
          min_visits: 2,
          template_id: null,
          template_name: null,
          template_language: "en",
          send_from_phone_number_id: null,
          monthly_message_cap: 400,
          url_button_index: null,
          auto_send: false,
          trigger_days: null,
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

  React.useEffect(() => {
    load();
  }, [load]);

  const post = React.useCallback(
    async (body: Record<string, unknown>) => {
      const r = await fetch("/api/whatsapp/comeback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, ...body }),
      });
      return r.json();
    },
    [partnerId],
  );

  const saveSettings = async (next: Partial<Settings>) => {
    if (!settings) return;
    const merged = { ...settings, ...next };
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
    const cur: SegTpl = segTpls.find((t) => t.segment === segment) || {
      segment,
      enabled: true,
      template_id: null,
      template_name: null,
      template_language: "en",
      url_button_index: null,
      trigger_days: null,
    };
    const next = { ...cur, ...patch };
    setSegTpls((list) => [...list.filter((t) => t.segment !== segment), next]);
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

  /** Manual kick — identical to what the rule does on its own, no approval step. */
  const runNow = async () => {
    setRunning(true);
    try {
      const res = await post({ action: "run" });
      if (res?.blocked) toast.error(res.blocked.detail);
      else if (res?.error) toast.error("Couldn't run");
      else if (res?.queued) toast.success(`Sending to ${res.queued} customers`);
      else toast.info("Nobody is due a message right now");
      await load();
    } finally {
      setRunning(false);
    }
  };

  const approved = React.useMemo(
    () => templates.filter((t) => t.status === "APPROVED"),
    [templates],
  );
  const pending = React.useMemo(
    () => templates.filter((t) => t.status === "PENDING"),
    [templates],
  );
  const noTemplate = approved.length === 0;

  const history = React.useMemo(
    () => batches.filter((b) => b.status !== "blocked"),
    [batches],
  );

  const orderedSegments = React.useMemo(() => {
    const byId = new Map(SEGMENTS.map((s) => [s.id, s]));
    const first = SEGMENT_ORDER.map((id) => byId.get(id)).filter(
      (s): s is (typeof SEGMENTS)[number] => !!s,
    );
    const rest = SEGMENTS.filter((s) => !SEGMENT_ORDER.includes(s.id));
    return [...first, ...rest];
  }, []);

  const onCount = segTpls.filter((t) => t.enabled).length;

  const masterHint = noTemplate
    ? "Write a message for at least one group to start."
    : settings?.enabled
      ? "Customers are checked regularly. Anyone past their group's limit is messaged automatically — nothing waits on your approval."
      : "Switch this on and quiet customers will be checked and messaged automatically.";

  /* ------------------------------------------------------------- rendering */

  return (
    <div className="flex flex-col">
      {/* ------------------------------------------------------------ header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to WhatsApp"
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <ArrowLeft size={17} strokeWidth={1.8} />
          </button>
        )}
        <div className="min-w-0 flex-[1_1_200px]">
          <h1 className="m-0 text-[16px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Comeback messages
          </h1>
          <p className="mt-[3px] text-[12.5px] leading-none text-zinc-500 dark:text-zinc-400">
            Reach customers who have gone quiet
          </p>
        </div>
      </div>

      {/* -------------------------------------------------------------- body */}
      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-zinc-500 dark:text-zinc-400">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* No approved MARKETING template — the honest blocker for most. */}
            {noTemplate && (
              <div className="flex items-start gap-2.5 border-y border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-900 dark:bg-amber-950 lg:rounded-xl lg:border">
                <AlertTriangle
                  size={16}
                  className="mt-px flex-none text-amber-600 dark:text-amber-400"
                />
                <div className="min-w-0">
                  <p className="m-0 text-[13px] font-semibold leading-tight text-amber-900 dark:text-amber-300">
                    You need an approved marketing template first
                  </p>
                  <p className="mt-1 text-[12.5px] leading-[1.5] text-amber-800 dark:text-amber-400/80">
                    A “we miss you” message is marketing under WhatsApp&apos;s
                    rules, so it has to go out on a template Meta has approved in
                    the MARKETING category.
                    {pending.length > 0
                      ? " Yours is with WhatsApp now — this usually takes a few minutes."
                      : " We'll help you write one."}
                  </p>
                  {pending.length === 0 && (
                    <AdminV3Button
                      variant="primary"
                      className="mt-3 h-[34px] px-3.5"
                      onClick={() => setCreatorOpen(true)}
                    >
                      <Plus size={15} strokeWidth={2} />
                      Write my comeback message
                    </AdminV3Button>
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------- master card */}
            <V3Card className="flex flex-wrap items-center gap-3 gap-y-2.5 px-4 py-3.5">
              <div className="min-w-0 flex-[1_1_220px]">
                <div className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                  Comeback messages
                </div>
                <div className="mt-[3px] text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
                  {masterHint}
                </div>
              </div>
              <CbToggle
                on={!!settings?.enabled}
                disabled={noTemplate}
                label="Turn comeback messages on"
                onChange={(v) => saveSettings({ enabled: v })}
              />
            </V3Card>

            {/* ------------------------------------------------ who to chase */}
            {settings?.enabled && (
              <V3Card>
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2.5 gap-y-2 px-4 py-[13px]",
                    SECTION_DIVIDER,
                  )}
                >
                  <div className="min-w-0 flex-[1_1_auto]">
                    <div className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                      Who to chase
                    </div>
                    <div className="mt-[3px] text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
                      Turn on a group, pick its message and how long silence
                      should last. Groups left off are never messaged.
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCreatorOpen(true)}
                      className="text-[12px] font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
                    >
                      Write a message
                    </button>
                    <StatusPill tone="outline" className="font-medium">
                      {onCount} of {orderedSegments.length} on
                    </StatusPill>
                  </div>
                </div>

                {orderedSegments.map((seg) => {
                  const t = segTpls.find((x) => x.segment === seg.id);
                  return (
                    <div
                      key={seg.id}
                      className={cn("px-4 py-3", SECTION_DIVIDER)}
                    >
                      <div className="flex flex-wrap items-center gap-2.5 gap-y-2">
                        <span
                          className={cn(
                            "flex-none rounded-md border px-2 py-[3px] text-[11.5px] font-semibold leading-none",
                            SEG_CHIP[seg.id],
                          )}
                        >
                          {seg.label}
                        </span>
                        <span className="min-w-0 flex-[1_1_200px] text-[12.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
                          {seg.definition}
                        </span>
                        <CbToggle
                          on={!!t?.enabled}
                          label={`Message ${seg.label}`}
                          onChange={(v) => saveSegTpl(seg.id, { enabled: v })}
                        />
                      </div>

                      {t?.enabled && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-[9px]">
                          <div className="relative min-w-0 flex-[1_1_200px]">
                            <select
                              value={t?.template_id || ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                const tpl = templates.find((x) => x.id === v);
                                saveSegTpl(seg.id, {
                                  template_id: v || null,
                                  template_name: tpl?.name || null,
                                  template_language: tpl?.language || "en",
                                  url_button_index: dynamicUrlButtonIndex(
                                    tpl?.components,
                                  ),
                                });
                              }}
                              className="h-9 w-full appearance-none rounded-md border border-zinc-200 bg-white pl-[11px] pr-8 font-mono text-[13px] leading-none text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-500"
                            >
                              <option value="">Choose what to say</option>
                              {approved.map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                              {pending.map((x) => (
                                <option key={x.id} value={x.id} disabled>
                                  {x.name} — waiting for WhatsApp
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={15}
                              strokeWidth={2}
                              className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                            />
                          </div>
                          <span className="text-[12px] leading-none text-zinc-400 dark:text-zinc-500">
                            after
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={STALENESS_CAP_DAYS}
                            value={t?.trigger_days ?? ""}
                            placeholder="auto"
                            aria-label={`Days quiet before messaging ${seg.label}`}
                            onChange={(e) =>
                              saveSegTpl(seg.id, {
                                trigger_days: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            className="h-9 w-[70px] min-w-0 flex-[0_1_70px] rounded-md border border-zinc-200 bg-white px-[11px] text-center text-[13px] leading-none tabular-nums text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
                          />
                          <span className="text-[12px] leading-none text-zinc-400 dark:text-zinc-500">
                            days quiet
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex gap-2 rounded-b-none bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50 lg:rounded-b-xl">
                  <Info
                    size={14}
                    strokeWidth={1.8}
                    className="mt-px flex-none text-zinc-400 dark:text-zinc-500"
                  />
                  <span className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
                    Leave the days box empty and each customer&apos;s own rhythm
                    decides — a twice-a-week regular is overdue sooner than a
                    monthly one.
                  </span>
                </div>
              </V3Card>
            )}

            {/* ----------------------------------------------- past batches */}
            <V3Card>
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2.5 gap-y-2 px-4 py-[13px]",
                  SECTION_DIVIDER,
                )}
              >
                <span className="flex-[1_1_auto] text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                  Past batches
                </span>
                <AdminV3Button
                  variant="small"
                  className="h-[30px]"
                  onClick={runNow}
                  disabled={running || !settings?.enabled || noTemplate}
                >
                  {running ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} strokeWidth={1.7} />
                  )}
                  Run now
                </AdminV3Button>
              </div>

              {history.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
                  No batches yet. Once a group is switched on, every send shows up
                  here with how many customers came back.
                </p>
              ) : (
                history.map((b, i) => {
                  const r = b.results || {};
                  return (
                    <div
                      key={b.id}
                      className={cn(
                        "flex flex-wrap items-center gap-2.5 px-4 py-[13px]",
                        i < history.length - 1 && SECTION_DIVIDER,
                      )}
                    >
                      <div className="min-w-0 flex-[1_1_200px]">
                        <div className="text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
                          {b.treatment_count} messaged
                          {b.holdout_count
                            ? ` · ${b.holdout_count} held back`
                            : ""}
                        </div>
                        <div className="mt-[3px] text-[12px] leading-none text-zinc-400 dark:text-zinc-500">
                          {fmtDate(b.approved_at || b.created_at)} ·{" "}
                          <span translate="no" className="notranslate font-mono">
                            {b.template_name || "—"}
                          </span>
                        </div>
                      </div>
                      {b.measured_at ? (
                        <StatusPill tone="green">
                          <CheckCircle2 size={12} className="mr-1" />
                          {r.extraOrders != null
                            ? `about ${r.extraOrders} extra orders`
                            : `${r.returned ?? 0} came back`}
                        </StatusPill>
                      ) : (
                        <StatusPill tone="neutral">
                          <Clock size={12} className="mr-1" />
                          measuring
                        </StatusPill>
                      )}
                    </div>
                  );
                })
              )}
            </V3Card>
          </>
        )}
      </div>

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
    </div>
  );
}
