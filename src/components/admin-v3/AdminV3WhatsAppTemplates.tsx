"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Info,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/authStore";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { WhatsAppTemplateAnalytics } from "@/components/admin-v2/WhatsAppTemplateAnalytics";

import { AdminV3Button, V3Card } from "./ui/primitives";
import { TemplateEditorView } from "./watpl/TemplateEditorView";
import {
  OTP_TEMPLATE_NAME,
  OTP_TEMPLATE_PAYLOAD,
  categoryLabel,
  statusLabel,
  statusTone,
  type TemplateRow,
  type WaNumber,
} from "./watpl/shared";

/**
 * /admin-v3 → WhatsApp → Templates.
 *
 * The messages Meta has approved for sending. Same data path as
 * `AdminV2WhatsAppTemplates`: `/api/whatsapp/meta/status` for the connection and
 * the partner's numbers, `/api/whatsapp/templates` (GET, POST, DELETE) for the
 * list — templates are per-WABA, so the list is scoped to the selected number
 * and each number's WABA is synced from Meta the first time it is viewed.
 *
 * Only the chrome is new. Create / edit opens the ported editor sub-view; the
 * button-click analytics screen is admin-v2's, reused as-is rather than
 * duplicated (nothing in the v3 design covers it, and it is read-only).
 */

/* ------------------------------------------------------------------- pills */

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}

const STATUS_PILL: Record<"green" | "amber" | "red" | "neutral", string> = {
  green:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  neutral:
    "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none",
        STATUS_PILL[statusTone(status)],
      ].join(" ")}
    >
      {statusLabel(status)}
    </span>
  );
}

/** 30×30 row action, matching the design's outlined square buttons. */
function RowIconButton({
  children,
  title,
  onClick,
  disabled,
  tone = "neutral",
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "danger"
          ? "border-zinc-200 bg-white text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ screen */

export function AdminV3WhatsAppTemplates({
  onBack,
}: {
  /** Set by the shell. Without it, falls back to the WhatsApp hub route. */
  onBack?: () => void;
} = {}) {
  const router = useRouter();
  const { userData } = useAuthStore();
  const partnerId = (userData as { id?: string } | undefined)?.id;

  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  // The editor is an inline view (component switch), not a modal.
  const [editor, setEditor] = React.useState<
    { mode: "create" } | { mode: "edit"; template: TemplateRow } | null
  >(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [connected, setConnected] = React.useState<boolean | null>(null);
  const [showAnalytics, setShowAnalytics] = React.useState(false);
  const [addingOtp, setAddingOtp] = React.useState(false);
  const [query, setQuery] = React.useState("");
  // Templates are per-WABA. When a partner has several numbers they pick which
  // number's WABA to manage; "" until resolved / when they have one number.
  const [numbers, setNumbers] = React.useState<WaNumber[]>([]);
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = React.useState("");
  // Only the latest load commits (guards against the mount double-load race where
  // an unscoped "all WABAs" response could land after the scoped one).
  const reqId = React.useRef(0);
  // Numbers whose WABA we already synced this session — so the FIRST view of a
  // number pulls its templates, but switching back and forth doesn't re-hit Meta.
  const syncedNumbers = React.useRef<Set<string>>(new Set());

  // The OTP template is the same for everyone; offer a one-click add until the
  // partner has it (in any status — submitted / approved).
  const hasOtpTemplate = templates.some((t) => t.name === OTP_TEMPLATE_NAME);

  const load = React.useCallback(
    async (
      opts: { sync?: boolean; phoneNumberId?: string; useSyncSpinner?: boolean } = {},
    ) => {
      if (!partnerId) return;
      const phoneNumberId = opts.phoneNumberId ?? selectedPhoneNumberId;
      const myId = ++reqId.current;
      if (opts.useSyncSpinner) setSyncing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({ partnerId });
        if (opts.sync) params.set("sync", "1");
        if (phoneNumberId) params.set("phoneNumberId", phoneNumberId);
        const res = await fetch(`/api/whatsapp/templates?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load");
        // Drop stale responses so a late unscoped list can't overwrite a scoped one.
        if (myId === reqId.current) setTemplates(data.templates || []);
      } catch (e: any) {
        if (myId === reqId.current) toast.error(e?.message || "Failed to load templates");
      } finally {
        if (myId === reqId.current) {
          setLoading(false);
          setSyncing(false);
        }
      }
    },
    [partnerId, selectedPhoneNumberId],
  );

  const loadStatus = React.useCallback(async () => {
    if (!partnerId) return;
    try {
      const res = await fetch(`/api/whatsapp/meta/status?partnerId=${partnerId}`);
      const data = await res.json();
      setConnected(!!data.connected);
      const list: WaNumber[] = Array.isArray(data.integrations) ? data.integrations : [];
      setNumbers(list);
      setSelectedPhoneNumberId(
        (prev) =>
          prev ||
          list.find((n) => n.is_primary)?.phone_number_id ||
          list[0]?.phone_number_id ||
          "",
      );
    } catch {
      setConnected(false);
    }
  }, [partnerId]);

  React.useEffect(() => {
    if (!partnerId) return;
    void loadStatus();
  }, [partnerId, loadStatus]);

  // Load the list whenever the partner or the selected number's WABA changes.
  // For a multi-number partner, wait until the primary is resolved so we don't
  // flash the unscoped "all WABAs" list. The FIRST time a number is viewed we
  // sync its WABA from Meta (its per-WABA templates may not be mirrored yet).
  React.useEffect(() => {
    if (!partnerId) return;
    if (numbers.length > 1 && !selectedPhoneNumberId) return;
    const firstView =
      !!selectedPhoneNumberId && !syncedNumbers.current.has(selectedPhoneNumberId);
    if (firstView) syncedNumbers.current.add(selectedPhoneNumberId);
    void load({ sync: firstView, phoneNumberId: selectedPhoneNumberId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, selectedPhoneNumberId, numbers.length]);

  const handleDelete = async (row: TemplateRow) => {
    if (!partnerId) return;
    if (
      !(await confirmDialog({
        title: `Delete template "${row.name}"?`,
        description: "This removes it from Meta too.",
        confirmText: "Delete",
        destructive: true,
      }))
    )
      return;
    setDeletingId(row.id);
    try {
      const res = await fetch(
        `/api/whatsapp/templates/${row.id}?partnerId=${partnerId}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete");
      toast.success("Template deleted");
      setTemplates((t) => t.filter((x) => x.id !== row.id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  // One-click create + submit the standard OTP template for Meta review.
  const handleAddOtp = async () => {
    if (!partnerId) return;
    setAddingOtp(true);
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          ...OTP_TEMPLATE_PAYLOAD,
          phoneNumberId: selectedPhoneNumberId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Meta rejected the template");
      toast.success("OTP template submitted — Meta will review within ~24h");
      void load({});
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit OTP template");
    } finally {
      setAddingOtp(false);
    }
  };

  const goBack = () => {
    if (onBack) onBack();
    else router.push("/admin-v3?view=WhatsApp");
  };

  /** "3 approved · 1 rejected · 1 in review" — only the parts that exist. */
  const summary = React.useMemo(() => {
    const counts = { green: 0, amber: 0, red: 0, neutral: 0 };
    templates.forEach((t) => {
      counts[statusTone(t.status)] += 1;
    });
    const parts: string[] = [];
    if (counts.green) parts.push(`${counts.green} approved`);
    if (counts.red) parts.push(`${counts.red} rejected`);
    if (counts.amber) parts.push(`${counts.amber} in review`);
    if (counts.neutral) parts.push(`${counts.neutral} other`);
    return parts.join(" · ");
  }, [templates]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      [t.name, t.category, t.language, t.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [templates, query]);

  /* ------------------------------------------------------------ sub-views */

  if (editor) {
    return (
      <TemplateEditorView
        mode={editor.mode}
        initial={editor.mode === "edit" ? editor.template : null}
        partnerId={partnerId}
        phoneNumberId={selectedPhoneNumberId}
        onClose={() => setEditor(null)}
        onSaved={() => {
          setEditor(null);
          void load({});
        }}
      />
    );
  }

  if (showAnalytics) {
    return (
      <div className="px-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <WhatsAppTemplateAnalytics
          partnerId={partnerId}
          templates={templates}
          onClose={() => setShowAnalytics(false)}
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------- list */

  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------- sticky header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-3.5 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 lg:px-[clamp(14px,3vw,28px)]">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back to WhatsApp"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>

        <div className="min-w-0 flex-[1_1_200px]">
          <div className="text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Templates
          </div>
          <div className="mt-0.5 text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            Messages Meta has approved for sending
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {numbers.length > 1 && (
            <select
              value={selectedPhoneNumberId}
              onChange={(e) => setSelectedPhoneNumberId(e.target.value)}
              title="Templates are per number — pick which one to manage"
              className="h-[34px] max-w-[190px] shrink-0 rounded-md border border-zinc-200 bg-white px-2.5 text-[13px] font-medium leading-none text-zinc-700 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:focus:border-zinc-500"
            >
              {numbers.map((n) => (
                <option key={n.phone_number_id} value={n.phone_number_id}>
                  {(n.display_phone || n.phone_number_id) + (n.is_primary ? " · default" : "")}
                </option>
              ))}
            </select>
          )}

          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3"
            onClick={() => setShowAnalytics(true)}
            disabled={!connected}
            title={
              !connected
                ? "Connect your WhatsApp Business account first"
                : "View template button-click analytics"
            }
          >
            <BarChart3
              size={15}
              strokeWidth={1.7}
              className="flex-none text-zinc-500 dark:text-zinc-400"
            />
            Analytics
          </AdminV3Button>

          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3"
            onClick={() => {
              if (selectedPhoneNumberId) syncedNumbers.current.add(selectedPhoneNumberId);
              void load({ sync: true, useSyncSpinner: true });
            }}
            disabled={syncing || !connected}
            title={
              !connected
                ? "Connect your WhatsApp Business account first"
                : "Sync statuses from Meta"
            }
          >
            {syncing ? (
              <Loader2 size={15} className="flex-none animate-spin text-zinc-500 dark:text-zinc-400" />
            ) : (
              <RefreshCw
                size={15}
                strokeWidth={1.7}
                className="flex-none text-zinc-500 dark:text-zinc-400"
              />
            )}
            Sync from Meta
          </AdminV3Button>

          <AdminV3Button
            variant="strong"
            className="h-[34px] px-3.5 font-medium"
            onClick={() => setEditor({ mode: "create" })}
            disabled={!connected}
            title={
              !connected
                ? "Connect your WhatsApp Business account first"
                : "Create a new template"
            }
          >
            <Plus size={15} strokeWidth={2} className="flex-none" />
            New template
          </AdminV3Button>
        </div>
      </div>

      {/* ------------------------------------------------------------ body */}
      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {connected === false && (
          <V3Card className="flex items-start gap-3 border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-900 dark:bg-amber-950">
            <AlertCircle
              size={18}
              strokeWidth={1.8}
              className="mt-px flex-none text-amber-600 dark:text-amber-400"
            />
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold leading-tight text-amber-900 dark:text-amber-300">
                Connect your WhatsApp Business account
              </div>
              <div className="mt-1 text-[12.5px] font-normal leading-[1.45] text-amber-800 dark:text-amber-400">
                Template management needs a connected WABA. Open Settings → WhatsApp Business
                and click <b>Connect WhatsApp Business</b>.
              </div>
            </div>
          </V3Card>
        )}

        {connected && !loading && !hasOtpTemplate && (
          <V3Card className="flex flex-wrap items-center gap-3 gap-y-3 px-4 py-3.5">
            <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] border border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
              <ShieldCheck size={19} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-[1_1_240px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                  OTP / login code
                </span>
                <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-[9px] py-[3px] text-[11px] font-semibold leading-none text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
                  Recommended
                </span>
              </div>
              <div className="mt-[3px] text-[12.5px] font-normal leading-[1.45] text-zinc-500 dark:text-zinc-400">
                The standard verification-code template used to log customers in over
                WhatsApp. It&apos;s the same for every business — add it and we&apos;ll submit
                it to Meta for review.
              </div>
            </div>
            <AdminV3Button
              variant="secondary"
              className="ml-auto h-[34px] px-3"
              onClick={handleAddOtp}
              disabled={addingOtp}
            >
              {addingOtp ? (
                <>
                  <Loader2 size={15} className="flex-none animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Plus size={15} strokeWidth={2} className="flex-none" /> Add &amp; submit
                </>
              )}
            </AdminV3Button>
          </V3Card>
        )}

        {/* overflow-hidden so the grey note bar is clipped by the card's
            bottom corners from lg up, where the card is rounded. */}
        <V3Card className="min-w-0 overflow-hidden">
          {/* --------------------------------------------------- card head */}
          <div className="flex flex-wrap items-center gap-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className="shrink-0 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              Your templates
            </span>
            {!loading && templates.length > 0 && summary && (
              <MetaPill>{summary}</MetaPill>
            )}
            <div className="ml-auto flex h-[34px] min-w-0 max-w-[260px] flex-[1_1_180px] items-center gap-2.5 rounded-md border border-zinc-200 bg-white px-[11px] focus-within:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:focus-within:border-zinc-500">
              <Search
                size={15}
                strokeWidth={1.8}
                className="flex-none text-zinc-400 dark:text-zinc-500"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates"
                aria-label="Search templates"
                className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal leading-none text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* -------------------------------------------------------- rows */}
          {loading ? (
            <div className="flex justify-center px-4 py-12">
              <Loader2 size={22} className="animate-spin text-zinc-400 dark:text-zinc-500" />
            </div>
          ) : templates.length === 0 ? (
            <div className="px-4 py-12 text-center text-[13px] font-normal leading-[1.5] text-zinc-500 dark:text-zinc-400">
              {connected === false
                ? "Connect your WhatsApp Business account to create templates."
                : "No templates yet. Use New template to write your first one."}
            </div>
          ) : visible.length === 0 ? (
            <div className="px-4 py-12 text-center text-[13px] font-normal leading-[1.5] text-zinc-500 dark:text-zinc-400">
              No template matches &ldquo;{query.trim()}&rdquo;.
            </div>
          ) : (
            visible.map((t) => {
              const rejection =
                t.rejection_reason && t.rejection_reason.trim().toUpperCase() !== "NONE"
                  ? t.rejection_reason
                  : null;
              return (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                >
                  <div className="min-w-0 flex-[1_1_240px]">
                    <div className="flex flex-wrap items-center gap-2 gap-y-1.5">
                      <span
                        translate="no"
                        className="notranslate break-all font-mono text-[13px] font-semibold leading-none text-zinc-950 dark:text-zinc-50"
                      >
                        {t.name}
                      </span>
                      <MetaPill>{categoryLabel(t.category)}</MetaPill>
                      <MetaPill>{t.language}</MetaPill>
                    </div>
                    {rejection && (
                      <div className="mt-[5px] text-[12px] font-normal leading-[1.45] text-zinc-500 dark:text-zinc-400">
                        {rejection}
                      </div>
                    )}
                  </div>

                  <StatusChip status={t.status} />

                  <div className="flex shrink-0 items-center gap-1.5">
                    {(t.status === "APPROVED" || t.status === "REJECTED") && (
                      <RowIconButton
                        title="Edit"
                        onClick={() => setEditor({ mode: "edit", template: t })}
                      >
                        <Pencil size={15} strokeWidth={1.7} />
                      </RowIconButton>
                    )}
                    <RowIconButton
                      title="Delete"
                      tone="danger"
                      onClick={() => void handleDelete(t)}
                      disabled={deletingId === t.id}
                    >
                      {deletingId === t.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} strokeWidth={1.7} />
                      )}
                    </RowIconButton>
                  </div>
                </div>
              );
            })
          )}

          {/* -------------------------------------------------------- note */}
          <div className="flex gap-2 bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
            <Info
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 flex-none text-zinc-400 dark:text-zinc-500"
            />
            <span className="text-[12px] font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
              Only approved templates can be sent from flows or broadcasts. Meta usually
              reviews a new template within 24 hours — hit Sync from Meta to refresh statuses.
            </span>
          </div>
        </V3Card>
      </div>
    </div>
  );
}
