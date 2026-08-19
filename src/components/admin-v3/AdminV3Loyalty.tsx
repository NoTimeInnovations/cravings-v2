"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Gift,
  Loader2,
  MessageCircle,
  Search,
  Settings as SettingsIcon,
  TriangleAlert,
} from "lucide-react";

import { Partner, useAuthStore } from "@/store/authStore";
import { getFeatures } from "@/lib/getFeatures";
import {
  adminAdjustLoyalty,
  getCustomerLoyaltyForPartner,
  getPartnerLoyaltyMembers,
  getPartnerLoyaltySummary,
} from "@/app/actions/loyalty";
import {
  loyaltyTxnLabel,
  type LoyaltyMemberView,
  type LoyaltyPartnerSummary,
  type LoyaltyTxnView,
} from "@/lib/loyalty/config";
import { AdminV3Button, StatusPill, V3Card } from "./ui/primitives";
import { LoyaltySection } from "./settings/LoyaltySection";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";

/**
 * admin-v3 Loyalty.
 *
 * Two views in one screen, exactly as the design has them: the members list,
 * and — pushed over it, not in a drawer — one member's ledger with the manual
 * adjust panel. Data comes entirely from admin-v2's server actions
 * (`src/app/actions/loyalty.ts`); nothing here talks to Hasura directly.
 *
 * Honest gaps vs. the design (see the report): the design's "member since" and
 * per-row "last earn" are not stored — `loyalty_accounts` only carries
 * `updated_at` — so both render as LAST ACTIVITY rather than an invented
 * join/earn date.
 */

/* ------------------------------------------------------------------ helpers */

const LIST_LIMIT = 100;

const fmtInt = (n: number) => Math.round(n).toLocaleString();

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact "3d ago" style stamp for the list rows. */
function fmtAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function initialsOf(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Same normalisation admin-v2's OrderDetails uses for customer WhatsApp links. */
function waHref(phone: string) {
  const p = (phone || "").replace(/\s+/g, "");
  if (!p) return null;
  const num = /^\+/.test(p) ? p : /^\d{10}$/.test(p) ? `+91${p}` : p;
  return `https://wa.me/${num.replace(/[^\d]/g, "")}`;
}

const LABEL =
  "text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500";
const STAT =
  "mt-1 text-[19px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50";
const SUB = "text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500";
const CARD_TITLE =
  "text-[14.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50";
const FIELD =
  "mt-1.5 h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal leading-none text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

function Divider() {
  return <div className="hidden w-px self-stretch bg-zinc-100 sm:block dark:bg-zinc-800" />;
}

/* -------------------------------------------------------------------- screen */

export function AdminV3Loyalty() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const currency = partner?.currency || "₹";
  const enabled = !!getFeatures(partner?.feature_flags || null).loyalty_points?.access;

  const [summary, setSummary] = React.useState<LoyaltyPartnerSummary | null>(null);
  const [members, setMembers] = React.useState<LoyaltyMemberView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  // Selected member → the detail sub-view.
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [member, setMember] = React.useState<LoyaltyMemberView | null>(null);
  const [history, setHistory] = React.useState<LoyaltyTxnView[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const loadList = React.useCallback(async (term: string) => {
    setLoading(true);
    try {
      const [s, m] = await Promise.all([
        getPartnerLoyaltySummary(),
        getPartnerLoyaltyMembers({ search: term, limit: LIST_LIMIT }),
      ]);
      setSummary(s);
      setMembers(m);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load loyalty data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + debounced search share one effect, so the first paint isn't
  // two requests deep.
  React.useEffect(() => {
    if (!enabled) return;
    const term = search.trim();
    const t = setTimeout(() => loadList(term), term ? 350 : 0);
    return () => clearTimeout(t);
  }, [search, enabled, loadList]);

  const openMember = React.useCallback(async (m: LoyaltyMemberView) => {
    setSelectedId(m.userId);
    setMember(m);
    setHistory([]);
    setDetailLoading(true);
    try {
      const res = await getCustomerLoyaltyForPartner(m.userId);
      if (res.member) setMember(res.member);
      setHistory(res.history);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load customer history");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshMember = React.useCallback(async (userId: string) => {
    const res = await getCustomerLoyaltyForPartner(userId);
    if (res.member) setMember(res.member);
    setHistory(res.history);
  }, []);

  const exportCsv = React.useCallback(() => {
    if (members.length === 0) return;
    const rows = [
      ["Name", "Phone", "Balance", "Lifetime earned", "Lifetime redeemed", "Last activity"],
      ...members.map((m) => [
        m.name,
        m.phone,
        String(m.balance),
        String(m.lifetimeEarned),
        String(m.lifetimeRedeemed),
        m.updatedAt,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `loyalty-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [members]);

  /* ------------------------------------------------------------- disabled */

  if (!enabled) {
    return (
      <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
        <V3Card className="px-4 py-14 text-center">
          <Gift size={26} strokeWidth={1.6} className="mx-auto text-zinc-300 dark:text-zinc-600" />
          <p className="mt-3 text-[13.5px] font-medium text-zinc-700 dark:text-zinc-300">
            Loyalty points aren&apos;t enabled
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            Ask support to enable the loyalty feature, then turn it on under Settings → Features.
          </p>
        </V3Card>
      </div>
    );
  }

  /* --------------------------------------------------------- member detail */

  if (settingsOpen) {
    return <LoyaltySettingsView onBack={() => setSettingsOpen(false)} />;
  }

  if (selectedId && member) {
    return (
      <MemberDetail
        member={member}
        history={history}
        loading={detailLoading}
        currency={currency}
        onBack={() => {
          setSelectedId(null);
          setMember(null);
          setHistory([]);
          loadList(search.trim());
        }}
        onAdjusted={() => refreshMember(member.userId)}
      />
    );
  }

  /* ------------------------------------------------------------ list view */

  const issued = summary?.lifetimeIssued ?? 0;
  const redeemed = summary?.lifetimeRedeemed ?? 0;
  const redeemedPct = issued > 0 ? Math.round((redeemed / issued) * 100) : 0;

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* Summary strip */}
      <V3Card className="flex flex-wrap items-center gap-x-[22px] gap-y-3.5 px-4 py-3.5">
        <div>
          <div className={LABEL}>Members</div>
          <div className={STAT}>{fmtInt(summary?.members ?? 0)}</div>
        </div>
        <Divider />
        <div>
          <div className={LABEL}>Points outstanding</div>
          <div className={`${STAT} flex items-baseline gap-1.5`}>
            {fmtInt(summary?.outstandingPoints ?? 0)}
            <span className={SUB}>
              {currency}
              {fmtInt(summary?.outstandingValue ?? 0)} owed
            </span>
          </div>
        </div>
        <div>
          <div className={LABEL}>Issued all time</div>
          <div className={STAT}>{fmtInt(issued)}</div>
        </div>
        <div>
          <div className={LABEL}>Redeemed</div>
          <div className={`${STAT} flex items-baseline gap-1.5`}>
            {fmtInt(redeemed)}
            <span className={SUB}>{redeemedPct}% of issued</span>
          </div>
        </div>
      </V3Card>

      {/* Members */}
      <V3Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
          <span className={`${CARD_TITLE} shrink-0`}>Members</span>
          <StatusPill tone="outline" className="font-medium">
            Highest balance first
          </StatusPill>

          <div className="ml-auto flex h-[34px] min-w-0 max-w-[300px] flex-[1_1_200px] items-center gap-[9px] rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
            <Search size={15} strokeWidth={1.8} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal leading-none text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>

          <AdminV3Button
            variant="small"
            className="h-[34px] px-3"
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon size={15} strokeWidth={1.7} className="text-zinc-500 dark:text-zinc-400" />
            Settings
          </AdminV3Button>
          <AdminV3Button
            variant="small"
            className="h-[34px] px-3"
            onClick={exportCsv}
            disabled={members.length === 0}
          >
            <Download size={15} strokeWidth={1.8} className="text-zinc-500 dark:text-zinc-400" />
            Export
          </AdminV3Button>
        </div>

        {loading ? (
          <div className="px-4 py-14 text-center">
            <Loader2 size={18} className="mx-auto animate-spin text-zinc-400 dark:text-zinc-500" />
          </div>
        ) : members.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-[13.5px] font-medium text-zinc-500 dark:text-zinc-400">
              {search.trim() ? "No customers match your search." : "No loyalty members yet."}
            </p>
            <p className="mt-1 text-[12.5px] text-zinc-400 dark:text-zinc-500">
              Members appear here once a customer earns their first point.
            </p>
          </div>
        ) : (
          <>
            {members.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => openMember(m)}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-100 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[11.5px] font-semibold leading-none text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  translate="no"
                >
                  {initialsOf(m.name)}
                </span>
                <div className="min-w-0 flex-[1_1_180px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="truncate text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                      translate="no"
                    >
                      {m.name}
                    </span>
                    {m.flagged && (
                      <TriangleAlert size={13} className="shrink-0 text-amber-500" strokeWidth={2} />
                    )}
                  </div>
                  <div
                    className="mt-1 text-xs font-normal leading-none tabular-nums text-zinc-400 dark:text-zinc-500"
                    translate="no"
                  >
                    {m.phone || "—"}
                  </div>
                </div>
                <div className="shrink-0 text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                  {fmtAgo(m.updatedAt)}
                </div>
                <div className="min-w-[92px] shrink-0 text-right">
                  <div className="text-sm font-semibold leading-none tabular-nums text-zinc-950 dark:text-zinc-50">
                    {fmtInt(m.balance)}
                  </div>
                  <div className="mt-1 text-xs font-normal leading-none tabular-nums text-zinc-400 dark:text-zinc-500">
                    {currency}
                    {fmtInt(m.balance)}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  strokeWidth={2}
                  className="shrink-0 text-zinc-300 dark:text-zinc-600"
                />
              </button>
            ))}
            <div className="bg-zinc-50 px-4 py-3 text-xs font-normal leading-none text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500">
              Showing {members.length} of {fmtInt(summary?.members ?? members.length)} members · one
              point is worth {currency}1
            </div>
          </>
        )}
      </V3Card>
    </div>
  );
}

/* ------------------------------------------------------------ member detail */

const QUICK_POINTS = [50, 100, 250];

/* --------------------------------------------------------- settings view */

/**
 * The loyalty rules, moved off the Settings screen.
 *
 * LoyaltySection is reused unchanged — it registers its save action on
 * useAdminSettingsStore, which the Settings shell normally turns into a Save
 * button in its header. There is no such header here, so this view renders the
 * same affordance itself; without it the form would be unsaveable.
 */
function LoyaltySettingsView({ onBack }: { onBack: () => void }) {
  const hasChanges = useAdminSettingsStore((s) => s.hasChanges);
  const isSaving = useAdminSettingsStore((s) => s.isSaving);
  const saveAction = useAdminSettingsStore((s) => s.saveAction);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to loyalty"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="truncate text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Loyalty settings
          </div>
          <div className="mt-0.5 truncate text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            What customers earn on an order, and what they can redeem.
          </div>
        </div>
        {hasChanges ? (
          <StatusPill tone="outline" className="font-medium">
            Unsaved changes
          </StatusPill>
        ) : null}
        {hasChanges && saveAction ? (
          <AdminV3Button
            variant="primary"
            className="h-[34px] shrink-0 px-3.5 text-[13px] font-medium"
            disabled={isSaving}
            onClick={() => void saveAction()}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            {isSaving ? "Saving…" : "Save changes"}
          </AdminV3Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <LoyaltySection />
      </div>
    </div>
  );
}

function MemberDetail({
  member,
  history,
  loading,
  currency,
  onBack,
  onAdjusted,
}: {
  member: LoyaltyMemberView;
  history: LoyaltyTxnView[];
  loading: boolean;
  currency: string;
  onBack: () => void;
  onAdjusted: () => Promise<void> | void;
}) {
  const [dir, setDir] = React.useState<"credit" | "debit">("credit");
  const [points, setPoints] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const pts = parseInt(points, 10);
  const ready = Number.isFinite(pts) && pts > 0 && !saving;
  const applyLabel = dir === "credit" ? "Add points" : "Remove points";
  const wa = waHref(member.phone);

  const preview = ready
    ? `${dir === "credit" ? "Adds" : "Removes"} ${fmtInt(pts)} points · balance ${fmtInt(
        member.balance,
      )} → ${fmtInt(
        dir === "credit" ? member.balance + pts : Math.max(0, member.balance - pts),
      )} · worth ${currency}${fmtInt(
        dir === "credit" ? member.balance + pts : Math.max(0, member.balance - pts),
      )}`
    : "Enter a positive number of points. The reason is shown to the customer.";

  const apply = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      const res = await adminAdjustLoyalty({
        userId: member.userId,
        points: pts,
        direction: dir,
        note: reason.trim(),
      });
      if (!res.ok) {
        toast.error(res.message || "Could not adjust points");
      } else {
        toast.success(`${dir === "credit" ? "Added" : "Removed"} ${fmtInt(pts)} points`);
        setPoints("");
        setReason("");
        await onAdjusted();
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not adjust points");
    } finally {
      setSaving(false);
    }
  };

  const segBase =
    "h-[30px] flex-1 rounded-md px-3 text-[12.5px] leading-none transition-colors";
  const segOn =
    "border border-zinc-200 bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50";
  const segOff =
    "border border-transparent bg-transparent font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200";

  return (
    <div className="flex flex-col">
      {/* Sticky sub-header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <AdminV3Button variant="icon" onClick={onBack} aria-label="Back to members">
          <ArrowLeft size={17} strokeWidth={1.8} />
        </AdminV3Button>
        <div className="min-w-0 flex-[1_1_200px]">
          <div
            className="truncate text-base font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50"
            translate="no"
          >
            {member.name}
          </div>
          <div
            className="mt-1 text-[12.5px] font-normal leading-none tabular-nums text-zinc-500 dark:text-zinc-400"
            translate="no"
          >
            {member.phone || "No phone"} · last activity {fmtAgo(member.updatedAt)}
          </div>
        </div>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-green-200 bg-white px-3 text-[13px] font-medium leading-none text-green-700 transition-colors hover:bg-green-50 dark:border-green-900 dark:bg-zinc-900 dark:text-green-400 dark:hover:bg-green-950"
          >
            <MessageCircle size={15} strokeWidth={1.8} />
            Message
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {/* Left: balance + history */}
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3.5">
          <V3Card className="flex flex-wrap items-end gap-x-[22px] gap-y-3.5 p-4">
            <div>
              <div className={LABEL}>Balance</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-3xl font-semibold leading-none tracking-[-0.03em] tabular-nums text-zinc-950 dark:text-zinc-50">
                  {fmtInt(member.balance)}
                </span>
                <span className="text-[13px] font-normal leading-none text-zinc-500 dark:text-zinc-400">
                  points · worth {currency}
                  {fmtInt(member.balance)}
                </span>
              </div>
            </div>
            <Divider />
            <div>
              <div className={LABEL}>Earned</div>
              <div className="mt-1.5 text-base font-semibold leading-none tabular-nums text-zinc-950 dark:text-zinc-50">
                {fmtInt(member.lifetimeEarned)}
              </div>
            </div>
            <div>
              <div className={LABEL}>Redeemed</div>
              <div className="mt-1.5 text-base font-semibold leading-none tabular-nums text-zinc-950 dark:text-zinc-50">
                {fmtInt(member.lifetimeRedeemed)}
              </div>
            </div>
          </V3Card>

          {member.flagged && (
            <V3Card className="flex items-start gap-2 border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
              <TriangleAlert size={15} strokeWidth={1.9} className="mt-px shrink-0" />
              This account failed an integrity check and is locked. Contact support.
            </V3Card>
          )}

          <V3Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
              <span className={`${CARD_TITLE} flex-1`}>Points history</span>
              <StatusPill tone="outline" className="font-medium">
                {history.length === 1 ? "1 entry" : `${history.length} entries`}
              </StatusPill>
            </div>

            {loading ? (
              <div className="px-4 py-12 text-center">
                <Loader2 size={18} className="mx-auto animate-spin text-zinc-400 dark:text-zinc-500" />
              </div>
            ) : history.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-[13.5px] font-medium text-zinc-500 dark:text-zinc-400">
                  No transactions yet.
                </p>
              </div>
            ) : (
              history.map((t) => {
                const credit = t.delta > 0;
                return (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-zinc-100 px-4 py-3 last:border-b-0 dark:border-zinc-800"
                  >
                    <div className="min-w-0 flex-[1_1_200px]">
                      <div className="text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
                        {loyaltyTxnLabel(t.type)}
                      </div>
                      <div
                        className="mt-1 truncate text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500"
                        translate="no"
                      >
                        {fmtDateTime(t.createdAt)}
                        {t.orderDisplayId ? ` · #${t.orderDisplayId}` : ""}
                        {t.note ? ` · ${t.note}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={`text-[13px] font-semibold leading-none tabular-nums ${
                          credit
                            ? "text-green-700 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {credit ? "+" : ""}
                        {t.delta}
                      </div>
                      <div className="mt-1 text-xs font-normal leading-none tabular-nums text-zinc-400 dark:text-zinc-500">
                        balance {fmtInt(t.balanceAfter)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </V3Card>
        </div>

        {/* Right: adjust */}
        <V3Card className="min-w-0 flex-[1_1_280px] overflow-hidden">
          <div className="border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className={CARD_TITLE}>Adjust points</span>
          </div>
          <div className="flex flex-col gap-3 px-4 py-3.5">
            <div className="flex gap-[3px] rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setDir("credit")}
                className={`${segBase} ${dir === "credit" ? segOn : segOff}`}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setDir("debit")}
                className={`${segBase} ${dir === "debit" ? segOn : segOff}`}
              >
                Remove
              </button>
            </div>

            <div>
              <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                Points
              </div>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="0"
                className={`${FIELD} tabular-nums`}
              />
              <div className="mt-2 flex flex-wrap gap-[7px]">
                {QUICK_POINTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setPoints(String(q))}
                    className="h-[30px] shrink-0 rounded-full border border-zinc-200 bg-white px-[11px] text-[12.5px] font-medium leading-none text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {dir === "credit" ? "+" : "−"}
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                Reason
              </div>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={280}
                placeholder="Shown to the customer"
                className={FIELD}
              />
            </div>

            <p className="text-xs font-normal leading-relaxed text-zinc-400 dark:text-zinc-500">
              {preview}
            </p>

            <AdminV3Button
              variant="primary"
              className="w-full"
              disabled={!ready}
              onClick={apply}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : applyLabel}
            </AdminV3Button>
          </div>
        </V3Card>
      </div>
    </div>
  );
}
