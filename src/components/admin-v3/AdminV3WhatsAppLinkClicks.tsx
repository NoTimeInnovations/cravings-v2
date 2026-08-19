"use client";

import * as React from "react";
import { ArrowLeft, Loader2, MousePointerClick, RefreshCw, User } from "lucide-react";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { useAuthStore } from "@/store/authStore";
import { localDateInTz, safeTz, todayLocalDate } from "@/lib/partnerTime";
import { V3Card } from "./ui/primitives";

/**
 * "Order link taps" — who opened the menu from a WhatsApp message.
 *
 * Same data path as admin-v2's AdminV2WhatsAppLinkClicks: `order_link_claims`
 * for the partner (most recent 200 + a total count), then one users lookup to
 * resolve the names/phones behind the claims. Nothing new was invented; only
 * the presentation changed.
 *
 * The design shows three figures — total taps, unique customers, taps today.
 * Total is the real aggregate count; the other two are computed over the 200
 * rows actually fetched, so they are labelled as such once the window is
 * smaller than the total rather than silently under-reporting.
 */

type ClaimRow = { token_hash: string; claimed_at: string; user_id: string | null };

type ClickRow = {
  id: string;
  claimedAt: string;
  name: string | null;
  phone: string | null;
  resolved: boolean;
};

const CLAIMS_QUERY = `
  query OrderLinkClicks($p: uuid!, $limit: Int!) {
    order_link_claims(
      where: { partner_id: { _eq: $p } }
      order_by: { claimed_at: desc }
      limit: $limit
    ) {
      token_hash
      claimed_at
      user_id
    }
    order_link_claims_aggregate(where: { partner_id: { _eq: $p } }) {
      aggregate { count }
    }
  }
`;

const USERS_QUERY = `
  query OrderLinkClickUsers($ids: [uuid!]!) {
    users(where: { id: { _in: $ids } }) {
      id
      full_name
      phone
    }
  }
`;

const PAGE_LIMIT = 200;

/** "4 Aug 2026" in the PARTNER's timezone, never the browser's. */
function tapDate(iso: string, tz: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "11:01" in the partner's timezone, 24h so the column stays one width. */
function tapTime(iso: string, tz: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/* ------------------------------------------------------------------ pieces */

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-[19px] font-semibold leading-tight tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50">
        {value.toLocaleString()}
      </div>
      {sub ? (
        <div className="mt-[2px] text-[11px] font-normal leading-tight text-zinc-400 dark:text-zinc-500">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function TapRow({ row, tz }: { row: ClickRow; tz: string }) {
  const primary = row.name || row.phone || (row.resolved ? "Customer" : "Deleted customer");
  const secondary = row.name && row.phone ? row.phone : null;

  return (
    <div className="flex flex-wrap items-center gap-x-[11px] gap-y-2 border-b border-zinc-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {row.resolved ? (
          <MousePointerClick size={15} strokeWidth={1.7} />
        ) : (
          <User size={15} strokeWidth={1.7} />
        )}
      </span>

      <div className="min-w-0 flex-[1_1_180px]">
        <div
          translate="no"
          className="notranslate truncate text-[13px] font-medium leading-tight text-zinc-950 dark:text-zinc-50"
        >
          {primary}
        </div>
        {secondary ? (
          <div
            translate="no"
            className="notranslate mt-[2px] truncate text-[12px] font-normal leading-tight tabular-nums text-zinc-400 dark:text-zinc-500"
          >
            {secondary}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[12.5px] font-medium leading-tight text-zinc-700 dark:text-zinc-300">
          {tapDate(row.claimedAt, tz)}
        </div>
        <div className="mt-[2px] text-[12px] font-normal leading-tight tabular-nums text-zinc-400 dark:text-zinc-500">
          {tapTime(row.claimedAt, tz)}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ screen */

export function AdminV3WhatsAppLinkClicks({ onBack }: { onBack?: () => void } = {}) {
  const { userData } = useAuthStore();
  const partner = userData as { id?: string; timezone?: string | null } | undefined;
  const partnerId = partner?.id;
  const tz = safeTz(partner?.timezone);

  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<ClickRow[]>([]);
  const [total, setTotal] = React.useState(0);

  const load = React.useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const res = await fetchFromHasura(CLAIMS_QUERY, { p: partnerId, limit: PAGE_LIMIT });
      const claims: ClaimRow[] = res?.order_link_claims ?? [];
      const count: number =
        res?.order_link_claims_aggregate?.aggregate?.count ?? claims.length;

      // Resolve the customer accounts for these taps in one round-trip. A tap by
      // a NEW customer still resolves — the auto-login find-or-creates the
      // account from the link's phone before the claim is written. Only taps
      // whose account was later deleted come back unresolved.
      const ids = Array.from(
        new Set(claims.map((c) => c.user_id).filter(Boolean)),
      ) as string[];
      const usersById = new Map<string, { full_name: string | null; phone: string | null }>();
      if (ids.length > 0) {
        const ures = await fetchFromHasura(USERS_QUERY, { ids });
        (ures?.users ?? []).forEach((u: { id: string; full_name: string | null; phone: string | null }) =>
          usersById.set(u.id, { full_name: u.full_name, phone: u.phone }),
        );
      }

      setRows(
        claims.map((c) => {
          const u = c.user_id ? usersById.get(c.user_id) : undefined;
          return {
            id: c.token_hash,
            claimedAt: c.claimed_at,
            name: u?.full_name?.trim() || null,
            phone: u?.phone?.trim() || null,
            resolved: !!u,
          };
        }),
      );
      setTotal(count);
    } catch (e) {
      console.error("Failed to load order link clicks:", e);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const windowed = rows.length < total;

  const uniqueCustomers = React.useMemo(
    () => new Set(rows.filter((r) => r.resolved && r.phone).map((r) => r.phone)).size,
    [rows],
  );

  const tapsToday = React.useMemo(() => {
    const today = todayLocalDate(tz);
    return rows.filter((r) => localDateInTz(r.claimedAt, tz) === today).length;
  }, [rows, tz]);

  return (
    <div className="flex flex-col">
      {/* ------------------------------------------------- sticky sub-header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to WhatsApp"
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <ArrowLeft size={17} strokeWidth={1.8} />
          </button>
        ) : null}

        <div className="min-w-0 flex-[1_1_200px]">
          <div className="text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Order link taps
          </div>
          <div className="mt-0.5 text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            Who opened your menu from a WhatsApp message
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex h-[34px] shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {loading ? (
              <Loader2 size={15} strokeWidth={1.7} className="animate-spin text-zinc-500 dark:text-zinc-400" />
            ) : (
              <RefreshCw size={15} strokeWidth={1.7} className="text-zinc-500 dark:text-zinc-400" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------- body */}
      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {/* summary strip */}
        <V3Card className="flex flex-wrap items-center gap-x-[22px] gap-y-3.5 px-4 py-3.5">
          <Stat label="Total taps" value={total} />
          <div className="hidden w-px self-stretch bg-zinc-100 dark:bg-zinc-800 sm:block" />
          <Stat
            label="Unique customers"
            value={uniqueCustomers}
            sub={windowed ? "in the recent taps below" : undefined}
          />
          <Stat
            label="Taps today"
            value={tapsToday}
            sub={windowed ? "in the recent taps below" : undefined}
          />
          <div className="min-w-0 flex-[1_1_200px] text-[12px] font-normal leading-normal text-zinc-400 dark:text-zinc-500">
            A tap means they opened your menu from a WhatsApp message.
          </div>
        </V3Card>

        {/* recent taps */}
        <V3Card>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className="flex-[1_1_auto] text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              Recent taps
            </span>
            {rows.length > 0 ? (
              <span className="whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {rows.length} most recent
              </span>
            ) : null}
          </div>

          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-zinc-500 dark:text-zinc-400">
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                <MousePointerClick size={18} strokeWidth={1.7} />
              </div>
              <div className="mt-3 text-[13.5px] font-medium leading-tight text-zinc-950 dark:text-zinc-50">
                No order-link taps yet
              </div>
              <div className="mx-auto mt-1 max-w-[340px] text-[12.5px] font-normal leading-normal text-zinc-500 dark:text-zinc-400">
                They&rsquo;ll appear here when customers tap an &ldquo;order now&rdquo; link
                from your WhatsApp flows.
              </div>
            </div>
          ) : (
            <>
              {rows.map((r) => (
                <TapRow key={r.id} row={r} tz={tz} />
              ))}
              <div className="rounded-b-none bg-zinc-50 px-4 py-3 text-[12px] font-normal leading-normal text-zinc-400 dark:bg-zinc-800/40 dark:text-zinc-500 lg:rounded-b-xl">
                {windowed
                  ? `Showing ${rows.length} of ${total.toLocaleString()} taps.`
                  : `Showing all ${total.toLocaleString()} tap${total === 1 ? "" : "s"}.`}
              </div>
            </>
          )}
        </V3Card>
      </div>
    </div>
  );
}
