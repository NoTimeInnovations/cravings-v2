"use client";

/**
 * Porter & Rapido — what third-party dispatch is costing, and whether the
 * Porter wallet is about to run dry.
 *
 * The data layer is admin-v2's Settings → Ordering → "3rd Party Delivery
 * Charges", unchanged: one getThirdPartyChargeData call returns the live Porter
 * wallet (balance + real transactions straight from Porter's API), per-provider
 * summaries, and every third-party order with its fare. Only the presentation
 * is new — and the split, because a partner watching a prepaid balance should
 * not have to go digging in Settings for it.
 *
 * The asymmetry between the two providers is the whole point of the layout:
 * Porter is PREPAID, so it has a balance that can hit zero mid-service and
 * stop dispatch. Rapido has no wallet API at all — the rider takes cash — so
 * there is nothing to run out of and nothing to recharge. Showing them as two
 * matching cards, as v2 does, implies a symmetry that does not exist.
 */

import * as React from "react";
import {
  ArrowLeft,
  Bike,
  ChevronRight,
  CreditCard,
  Download,
  Info,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  getThirdPartyChargeData,
  saveLowBalanceThreshold,
} from "@/app/actions/deliveryCharges";
import type {
  OrderCharge,
  PorterWalletTxn,
  ThirdPartyChargeData,
} from "@/lib/deliveryBridgeTypes";
import { cn } from "@/lib/utils";
import { Partner, useAuthStore } from "@/store/authStore";

import { AdminV3Button, StatusPill, V3Card } from "./ui/primitives";
import { useV3Navigate } from "./useV3Navigate";

/* ------------------------------------------------------------------ tokens */

const CARD_TITLE =
  "text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50";
const STAT_LABEL =
  "text-[10.5px] font-bold uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500";
const MUTED = "text-[12.5px] leading-[1.5] text-zinc-500 dark:text-zinc-400";
const ROW =
  "flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-zinc-100 px-4 py-3 last:border-b-0 dark:border-zinc-800";

/* -------------------------------------------------------------- txn shapes */

/**
 * Porter labels every wallet movement in free text. Three kinds matter and they
 * are only distinguishable by that text: a redeemed-coins CREDIT is not a
 * recharge, and counting it as one would overstate what the partner actually
 * paid in.
 */
type TxnKind = "recharge" | "coins" | "trip";

function kindOf(t: PorterWalletTxn): TxnKind {
  const title = (t.title || "").toLowerCase();
  if (t.type === "credit") return title.includes("coin") ? "coins" : "recharge";
  return "trip";
}

const KIND_LABEL: Record<TxnKind, string> = {
  recharge: "Recharge",
  coins: "Coins",
  trip: "Trip",
};

/** Porter sends the amount as a string ("500"). Anything unparseable is 0 so a
 *  single odd row cannot poison a total. */
const amountOf = (t: PorterWalletTxn): number => {
  const n = Number(String(t.amount ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
};

/** Porter's `date` is a display string ("Jul 25, 2026"), not an ISO stamp. */
const parsePorterDate = (s: string): Date | null => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const sameMonth = (d: Date | null, ref: Date): boolean =>
  !!d && d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();

const fmtDate = (d: Date | null, raw: string): string =>
  d
    ? d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    : raw;

/** A neutral placeholder the exact height of the text it stands in for, so the
 *  card does not resize when the real value arrives. */
function Bar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        // block, not inline-block: an inline placeholder sits in a line box and
        // inherits its leading, which made the card a few px taller while
        // loading than it is once filled — a visible settle on arrival.
        "block animate-pulse rounded bg-zinc-100 dark:bg-zinc-800",
        className,
      )}
    />
  );
}

/* ---------------------------------------------------------------- helpers */

function relativeTime(from: number): string {
  const secs = Math.round((Date.now() - from) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
}

/** "Delivery to Palathully Rd" — the address trimmed to its first, most
 *  recognisable component. The full string is a geocoded line that would wrap
 *  to three rows and bury the amount. */
function tripLabel(o: OrderCharge): string {
  const addr = (o.deliveryAddress || "").split(",")[0]?.trim();
  return addr ? `Delivery to ${addr}` : "Delivery";
}

function money(currency: string, n: number, dp = 2): string {
  return `${currency}${n.toFixed(dp)}`;
}

/** Settings › Ordering › Porter & Rapido, opened straight on Accounts — the
 *  page that actually connects a login. Landing on the tab instead would leave
 *  the partner to find the row themselves. */
const ACCOUNTS_LINK = "sg=ordering&ss=bridge&bridge=accounts";

/* ==========================================================================
   Screen
   ========================================================================== */

export function AdminV3PorterRapido() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const partnerId = partner?.id;
  const currency = partner?.currency || "₹";
  const navigate = useV3Navigate();

  const [data, setData] = React.useState<ThirdPartyChargeData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [syncedAt, setSyncedAt] = React.useState<number>(0);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getThirdPartyChargeData({ partnerId });
      if (!res.ok) setError(res.message);
      else {
        setData(res);
        setSyncedAt(Date.now());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Re-render the "synced N minutes ago" line without re-fetching. A stamp that
  // says "just now" ten minutes later is worse than no stamp.
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  /* ------------------------------------------------------------- derived -- */

  const wallet = data?.porterWallet ?? null;
  const porter = data?.summaries.porter;
  const rapido = data?.summaries.rapido;
  const history = React.useMemo(() => wallet?.history ?? [], [wallet]);

  const month = React.useMemo(() => {
    const now = new Date();
    let recharged = 0;
    let coins = 0;
    let spent = 0;
    let trips = 0;
    for (const t of history) {
      if (!sameMonth(parsePorterDate(t.date), now)) continue;
      const amt = amountOf(t);
      const k = kindOf(t);
      if (k === "recharge") recharged += amt;
      else if (k === "coins") coins += amt;
      else {
        spent += amt;
        trips += 1;
      }
    }
    // Rapido never touches the wallet — the rider is paid in cash — so its
    // spend is read off the orders, not off Porter's ledger.
    const cashTrips = (data?.orders ?? [])
      .filter((o) => {
        if (o.provider !== "rapido" || o.paymentMode === "wallet") return false;
        const d = new Date(o.createdAt);
        return sameMonth(Number.isNaN(d.getTime()) ? null : d, now);
      })
      .reduce((sum, o) => sum + (o.fare ?? 0), 0);

    return { recharged, coins, spent, trips, cashTrips };
  }, [history, data]);

  /**
   * THIS MONTH's average, so the three figures on the card agree: someone will
   * divide "spent this month" by "trips billed" and expect to land on it.
   * Falls back to all-time on the 1st of a month, when there is nothing to
   * average yet but the balance still has to be turned into "how many trips".
   */
  const avgPerTrip = React.useMemo(() => {
    if (month.trips > 0) return month.spent / month.trips;
    const trips = history.filter((t) => kindOf(t) === "trip");
    if (trips.length === 0) return 0;
    return trips.reduce((s, t) => s + amountOf(t), 0) / trips.length;
  }, [history, month]);

  const balance = wallet?.balance ?? null;
  const threshold = data?.lowBalanceThreshold ?? 0;
  // The partner's own threshold decides "low" when they've set one. Without it
  // there is no meaningful line to draw, so nothing is flagged — better than
  // inventing a number and crying wolf on a partner who tops up in small amounts.
  const low = balance != null && threshold > 0 && balance < threshold;
  const tripsLeft =
    balance != null && avgPerTrip > 0 ? Math.floor(balance / avgPerTrip) : null;

  const latestTxnDate = history.length
    ? fmtDate(parsePorterDate(history[0].date), history[0].date)
    : null;

  /* --------------------------------------------------------------- states -- */

  // No full-page spinner: the page's SHAPE is known before its numbers are, and
  // blanking the whole screen for one fetch made a two-card layout feel like a
  // page load. Each card carries its own placeholder instead.
  const pending = loading && !data;

  if (error && !data) {
    return (
      <Shell>
        <V3Card className="px-4 py-16 text-center">
          <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>
          <AdminV3Button variant="secondary" className="mt-4" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </AdminV3Button>
        </V3Card>
      </Shell>
    );
  }

  if (historyOpen) {
    return (
      <WalletHistory
        currency={currency}
        balance={balance}
        syncedAt={syncedAt}
        history={history}
        orders={data?.orders ?? []}
        pooled={!!wallet?.pooled}
        onBack={() => setHistoryOpen(false)}
      />
    );
  }

  /* ----------------------------------------------------------------- view -- */

  return (
    <Shell>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {pending ? (
          <Bar className="h-[19px] w-[210px] rounded-full" />
        ) : (
          <StatusPill tone="outline" className="font-medium">
            {wallet ? "Porter connected" : "Porter not connected"}
            {" · "}
            {rapido?.connectedMobile ? "Rapido cash only" : "Rapido not connected"}
          </StatusPill>
        )}
        <AdminV3Button
          variant="secondary"
          className="ml-auto"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </AdminV3Button>
        <AdminV3Button
          variant="primary"
          onClick={() => navigate("Settings", ACCOUNTS_LINK)}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Porter &amp; Rapido settings
        </AdminV3Button>
      </div>

      <div className="flex flex-wrap items-start gap-3.5">
        {/* ------------------------------------------------------ left column */}
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-3.5">
          <V3Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <CreditCard size={17} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-[1_1_180px]">
                <div className={CARD_TITLE}>Porter wallet</div>
                <div className={cn(MUTED, "mt-1")}>
                  Live prepaid balance and transactions, straight from Porter.
                </div>
              </div>
              {pending ? (
                <Bar className="h-[19px] w-[86px] shrink-0 rounded-full" />
              ) : wallet ? (
                <StatusPill tone="green" className="shrink-0">
                  ● Live
                  {wallet.pooled
                    ? ` · ${wallet.accounts.length} accounts`
                    : porter?.connectedMobile
                      ? ` ··${porter.connectedMobile.slice(-4)}`
                      : ""}
                </StatusPill>
              ) : (
                <StatusPill tone="amber" className="shrink-0">
                  Not connected
                </StatusPill>
              )}
            </div>

            {pending ? (
              /* Mirrors the loaded card's shape — balance, the two figures
                 beside it, the average and the footer — so nothing jumps when
                 the real numbers land. */
              <>
                <div className="flex flex-wrap gap-x-8 gap-y-5 px-4 py-4">
                  <div className="min-w-0 flex-[1_1_240px]">
                    <div className={STAT_LABEL}>Balance</div>
                    <Bar className="mt-1.5 h-[30px] w-[150px]" />
                    <div className="mt-4">
                      <div className={STAT_LABEL}>Average per trip</div>
                      <Bar className="mt-1.5 h-[19px] w-[64px]" />
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-5">
                    <div className="flex flex-wrap gap-x-8 gap-y-5">
                      <div className="min-w-0">
                        <div className={STAT_LABEL}>Spent this month</div>
                        <Bar className="mt-1.5 h-[19px] w-[76px]" />
                      </div>
                      <div className="min-w-0">
                        <div className={STAT_LABEL}>Trips billed</div>
                        <Bar className="mt-1.5 h-[19px] w-[34px]" />
                      </div>
                    </div>
                    <Bar className="h-[38px] w-[160px] self-start rounded-md" />
                  </div>
                </div>
                <div className="flex items-center border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  {/* The row it stands in for is 12.5px text at leading-1.5,
                      so the box is 19px tall with a 15px bar centred in it. */}
                  <span className="flex h-[19px] items-center">
                    <Bar className="h-[15px] w-[220px]" />
                  </span>
                </div>
              </>
            ) : wallet ? (
              <>
                <div className="flex flex-wrap gap-x-8 gap-y-5 px-4 py-4">
                  <div className="min-w-0 flex-[1_1_240px]">
                    <div className={STAT_LABEL}>Balance</div>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                      <span
                        className={cn(
                          "text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums",
                          balance != null && balance < 0
                            ? "text-red-600 dark:text-red-400"
                            : low
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-zinc-950 dark:text-zinc-50",
                        )}
                      >
                        {money(currency, balance ?? 0)}
                      </span>
                      <span className={MUTED}>on Porter</span>
                    </div>
                    {low && (
                      <div className="mt-2 text-[12.5px] font-medium leading-[1.5] text-amber-600 dark:text-amber-400">
                        Running low
                        {tripsLeft != null
                          ? ` — about ${tripsLeft} more trip${tripsLeft === 1 ? "" : "s"} at your average.`
                          : " — recharge soon."}
                      </div>
                    )}
                    <div className="mt-4">
                      <div className={STAT_LABEL}>Average per trip</div>
                      <div className="mt-1.5 text-[19px] font-bold leading-none tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50">
                        {avgPerTrip > 0 ? money(currency, avgPerTrip, 0) : "—"}
                      </div>
                    </div>
                  </div>

                  {/* No sm:border-l here. These two blocks wrap on the CARD's
                      width (flex-basis 240px), but a `sm:` prefix keys off the
                      VIEWPORT — so between roughly 640 and 900px the columns
                      stacked while the divider stayed on, leaving a stray
                      vertical rule and a 32px indent under the balance. The
                      gap does the separating instead. */}
                  <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-5">
                    <div className="flex flex-wrap gap-x-8 gap-y-5">
                      <div className="min-w-0">
                        <div className={STAT_LABEL}>Spent this month</div>
                        <div className="mt-1.5 text-[19px] font-bold leading-none tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50">
                          {money(currency, month.spent, 0)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className={STAT_LABEL}>Trips billed</div>
                        <div className="mt-1.5 text-[19px] font-bold leading-none tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50">
                          {month.trips}
                        </div>
                      </div>
                    </div>
                    {wallet.rechargeLink && (
                      <a
                        href={wallet.rechargeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-[38px] items-center justify-center gap-1.5 self-start rounded-md border border-zinc-900 bg-zinc-900 px-4 text-[13px] font-bold leading-none text-white shadow-[0_1px_2px_0_rgba(9,9,11,.08)] transition-colors hover:bg-zinc-700 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        <Plus size={15} strokeWidth={2} />
                        Recharge wallet
                      </a>
                    )}
                  </div>
                </div>

                {/* Pooled partners dispatch across several Porter logins; one
                    total hides the fact that a single account can be empty
                    while the pool still looks healthy. */}
                {wallet.pooled && (
                  <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                    <div className={cn(STAT_LABEL, "mb-2")}>
                      {wallet.accounts.length} accounts in your pool
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {wallet.accounts.map((a) => (
                        <div key={a.accountId} className="flex items-center gap-3">
                          <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-600 dark:text-zinc-300">
                            {a.label}
                          </span>
                          <span
                            className={cn(
                              "text-[12.5px] font-semibold tabular-nums",
                              threshold > 0 && a.balance < threshold
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-zinc-950 dark:text-zinc-50",
                            )}
                          >
                            {money(currency, a.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="flex w-full flex-wrap items-center gap-2 border-t border-zinc-100 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
                >
                  <span className={MUTED}>
                    {history.length} transaction{history.length === 1 ? "" : "s"}
                    {latestTxnDate ? ` · latest ${latestTxnDate}` : ""}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-[12.5px] font-semibold text-zinc-900 dark:text-zinc-100">
                    View history
                    <ChevronRight size={14} strokeWidth={2.2} />
                  </span>
                </button>
              </>
            ) : (
              <div className="px-4 py-14 text-center">
                <Wallet className="mx-auto h-7 w-7 text-zinc-300 dark:text-zinc-600" />
                <div className="mt-3 text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                  Porter is not connected
                </div>
                <p className={cn(MUTED, "mx-auto mt-2 max-w-[380px]")}>
                  Connect a Porter account to see the live prepaid balance, what
                  each trip cost, and a warning before it runs dry.
                </p>
                <AdminV3Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => navigate("Settings", ACCOUNTS_LINK)}
                >
                  Connect an account
                </AdminV3Button>
              </div>
            )}
          </V3Card>

          {/* Directly under the wallet, because that is the balance it watches.
              Across the layout in its own column it read as a general setting
              rather than as this card's threshold. */}
          {wallet && (
            <LowBalanceAlert
              currency={currency}
              partnerId={partnerId}
              initial={threshold}
              onSaved={load}
            />
          )}
        </div>

        {/* ----------------------------------------------------- right column */}
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          {/* Dispatch */}
          <V3Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
              <span className={CARD_TITLE}>Dispatch</span>
              <StatusPill tone="outline" className="ml-auto font-medium">
                Bridge on
              </StatusPill>
            </div>

            <ProviderRow
              name="Porter"
              note="Prepaid wallet · deducted per trip"
              pill={
                pending ? (
                  <Bar className="h-[19px] w-[92px] rounded-full" />
                ) : wallet ? (
                  <StatusPill tone="green">Connected</StatusPill>
                ) : (
                  <StatusPill tone="outline">Not connected</StatusPill>
                )
              }
              onConnect={
                !pending && !wallet
                  ? () => navigate("Settings", ACCOUNTS_LINK)
                  : undefined
              }
            />
            <ProviderRow
              name="Rapido"
              note="Rider collects the fare in cash"
              // "Cash only" describes how Rapido settles, not whether it is
              // linked — so the connected state is read separately, from
              // whether a Rapido login is on file.
              pill={<StatusPill tone="outline">Cash only</StatusPill>}
              onConnect={
                !pending && !rapido?.connectedMobile
                  ? () => navigate("Settings", ACCOUNTS_LINK)
                  : undefined
              }
            />

            <div className="flex items-start gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <Info size={13} strokeWidth={1.9} className="mt-[2px] shrink-0 text-zinc-400 dark:text-zinc-500" />
              <p className="text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
                Rapido has no prepaid wallet — those trips settle as cash with
                the rider.
              </p>
            </div>
          </V3Card>

          {/* This month */}
          <V3Card className="overflow-hidden">
            <div className="border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
              <span className={CARD_TITLE}>This month</span>
            </div>
            <MoneyRow
              label="Recharged"
              value={pending ? null : money(currency, month.recharged, 0)}
            />
            <MoneyRow
              label="Spent on trips"
              value={pending ? null : money(currency, month.spent, 0)}
            />
            <MoneyRow
              label="Porter coins redeemed"
              value={pending ? null : money(currency, month.coins, 0)}
            />
            <MoneyRow
              label="Cash trips (Rapido)"
              value={pending ? null : money(currency, month.cashTrips, 0)}
            />
          </V3Card>
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------- small parts */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {children}
    </div>
  );
}

function ProviderRow({
  name,
  note,
  pill,
  onConnect,
}: {
  name: string;
  note: string;
  pill: React.ReactNode;
  /** Present only while this provider has no account linked. */
  onConnect?: () => void;
}) {
  return (
    <div className={ROW}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        <Bike size={15} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-[1_1_120px]">
        <div className="text-[13px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
          {name}
        </div>
        <div className="mt-1.5 text-[12px] leading-[1.4] text-zinc-400 dark:text-zinc-500">
          {note}
        </div>
      </div>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {pill}
        {/* Only when there is nothing linked. A row that already dispatches
            needs no call to action, and the status pill is the whole message. */}
        {onConnect && (
          <AdminV3Button
            variant="small"
            onClick={onConnect}
            aria-label={`Connect ${name}`}
          >
            <Link2 className="h-3.5 w-3.5" />
            Connect
          </AdminV3Button>
        )}
      </span>
    </div>
  );
}

/** `value` null = not fetched yet. A placeholder rather than a zero: every
 *  figure here comes from the same call as the wallet, and a ₹0 that turns into
 *  ₹1,500 a moment later is a wrong number, not a loading state. */
function MoneyRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={ROW}>
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      {value === null ? (
        <Bar className="h-[15px] w-[54px] shrink-0" />
      ) : (
        <span className="shrink-0 text-[13px] font-semibold tabular-nums tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
          {value}
        </span>
      )}
    </div>
  );
}

/**
 * The partner's own low-balance line.
 *
 * Same server action admin-v2 saves through, and the same meaning: 0 turns the
 * alert off. The toggle exists so turning it off does not require clearing the
 * field and remembering that empty means disabled — the number stays visible
 * either way, ready to switch back on.
 */
function LowBalanceAlert({
  currency,
  partnerId,
  initial,
  onSaved,
}: {
  currency: string;
  partnerId?: string;
  initial: number;
  onSaved: () => Promise<void> | void;
}) {
  const [on, setOn] = React.useState(initial > 0);
  const [value, setValue] = React.useState(initial > 0 ? String(initial) : "200");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setOn(initial > 0);
    if (initial > 0) setValue(String(initial));
  }, [initial]);

  const commit = async (nextOn: boolean, nextValue: string) => {
    if (!partnerId) return;
    const threshold = nextOn ? Number(nextValue) || 0 : 0;
    if (threshold === initial) return;
    setSaving(true);
    try {
      const res = await saveLowBalanceThreshold({ partnerId, threshold });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        res.threshold > 0
          ? `You'll be alerted below ${currency}${res.threshold}`
          : "Low-balance alert turned off",
      );
      await onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <V3Card className="px-4 py-3.5">
      <div className={CARD_TITLE}>Low balance alert</div>
      <p className={cn(MUTED, "mt-1.5")}>
        We message you on WhatsApp when the balance drops below this.
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <span className="text-[12.5px] text-zinc-500 dark:text-zinc-400">Warn me under</span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={value}
          disabled={!on || saving}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void commit(on, value)}
          aria-label={`Low balance threshold in ${currency}`}
          className="h-[34px] w-[92px] rounded-md border border-zinc-200 bg-white px-2.5 text-[13px] tabular-nums text-zinc-950 outline-none transition-colors focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-500"
        />
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Low balance alert"
          disabled={saving}
          onClick={() => {
            const next = !on;
            setOn(next);
            void commit(next, value);
          }}
          className={cn(
            "relative ml-auto h-[24px] w-[42px] shrink-0 rounded-full transition-colors disabled:opacity-50",
            on ? "bg-zinc-900 dark:bg-zinc-50" : "bg-zinc-200 dark:bg-zinc-700",
          )}
        >
          <span
            className={cn(
              "absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all dark:bg-zinc-900",
              on ? "left-[21px]" : "left-[3px]",
            )}
          />
        </button>
      </div>
    </V3Card>
  );
}

/* ==========================================================================
   Wallet history
   ========================================================================== */

type HistoryFilter = "all" | "recharges" | "trips";

function WalletHistory({
  currency,
  balance,
  syncedAt,
  history,
  orders,
  pooled,
  onBack,
}: {
  currency: string;
  balance: number | null;
  syncedAt: number;
  history: PorterWalletTxn[];
  orders: OrderCharge[];
  pooled: boolean;
  onBack: () => void;
}) {
  const [filter, setFilter] = React.useState<HistoryFilter>("all");

  /**
   * Porter's ledger says a trip cost ₹68; it does not say which delivery that
   * was. The order rows do — including the distance now recorded at checkout —
   * so trips are matched to orders by FARE AND DAY, in order, each order used
   * at most once.
   *
   * Deliberately conservative: two trips on the same day for the same fare are
   * genuinely ambiguous, and a wrong order number is worse than none. Anything
   * that does not match cleanly keeps Porter's own wording and simply carries
   * no order line.
   */
  const orderFor = React.useMemo(() => {
    const byTxn = new Map<PorterWalletTxn, OrderCharge>();
    const used = new Set<string>();
    const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    const candidates = orders.filter(
      (o) => o.provider === "porter" && o.fare != null && o.paymentMode !== "cash",
    );

    for (const t of history) {
      if (kindOf(t) !== "trip") continue;
      const td = parsePorterDate(t.date);
      if (!td) continue;
      const amt = amountOf(t);
      const hit = candidates.find((o) => {
        if (used.has(o.orderId)) return false;
        const od = new Date(o.createdAt);
        if (Number.isNaN(od.getTime()) || dayKey(od) !== dayKey(td)) return false;
        return Math.abs((o.fare as number) - amt) < 0.5;
      });
      if (hit) {
        used.add(hit.orderId);
        byTxn.set(t, hit);
      }
    }
    return byTxn;
  }, [history, orders]);

  const rows = React.useMemo(
    () =>
      history.filter((t) => {
        if (filter === "all") return true;
        const k = kindOf(t);
        // "Recharges" means money in — a coin redemption tops the wallet up
        // just as a card payment does, and hiding it under Trips would be a lie.
        return filter === "trips" ? k === "trip" : k !== "trip";
      }),
    [history, filter],
  );

  const exportCsv = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const head = ["Date", "Type", "Description", "Order", "Distance (km)", "Amount"];
    const lines = rows.map((t) => {
      const o = orderFor.get(t);
      const k = kindOf(t);
      return [
        fmtDate(parsePorterDate(t.date), t.date),
        KIND_LABEL[k],
        o ? tripLabel(o) : t.title,
        o?.displayId != null ? `#${o.displayId}` : "",
        o?.distanceKm ?? "",
        `${k === "trip" ? "-" : "+"}${amountOf(t).toFixed(2)}`,
      ]
        .map(esc)
        .join(",");
    });
    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "porter-wallet-history.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Porter & Rapido"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="truncate text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Porter wallet history
          </div>
          <div className={cn(MUTED, "mt-0.5 truncate")}>
            Balance {money(currency, balance ?? 0)}
            {syncedAt ? ` · synced ${relativeTime(syncedAt)}` : ""}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        <V3Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className={CARD_TITLE}>Transactions</span>
            <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              {(["all", "recharges", "trips"] as HistoryFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[12.5px] capitalize leading-none transition-colors",
                    filter === f
                      ? "bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_0_rgba(9,9,11,.08)] dark:bg-zinc-950 dark:text-zinc-50"
                      : "font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <AdminV3Button
              variant="secondary"
              className="ml-auto h-[34px]"
              disabled={rows.length === 0}
              onClick={exportCsv}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </AdminV3Button>
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <Wallet className="mx-auto h-7 w-7 text-zinc-300 dark:text-zinc-600" />
              <div className="mt-3 text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                {history.length === 0
                  ? "No wallet transactions yet"
                  : `No ${filter} to show`}
              </div>
            </div>
          ) : (
            rows.map((t, i) => {
              const k = kindOf(t);
              const o = orderFor.get(t);
              const amt = amountOf(t);
              return (
                <div
                  key={`${t.date}-${t.title}-${i}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-100 px-4 py-3.5 last:border-b-0 dark:border-zinc-800"
                >
                  <span className="w-[74px] shrink-0">
                    <StatusPill
                      tone={k === "trip" ? "outline" : "green"}
                      className="font-semibold"
                    >
                      {KIND_LABEL[k]}
                    </StatusPill>
                  </span>
                  <div className="min-w-0 flex-[1_1_220px]">
                    <div className="truncate text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                      {o ? tripLabel(o) : t.title}
                    </div>
                    {(o || (pooled && t.account)) && (
                      <div className="mt-1.5 truncate text-[12px] leading-none text-zinc-400 dark:text-zinc-500">
                        {[
                          o?.displayId != null ? `Order #${o.displayId}` : null,
                          o?.distanceKm != null ? `${o.distanceKm} km` : null,
                          pooled && t.account ? t.account : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-[12.5px] tabular-nums text-zinc-400 dark:text-zinc-500">
                    {fmtDate(parsePorterDate(t.date), t.date)}
                  </span>
                  <span
                    className={cn(
                      "w-[86px] shrink-0 text-right text-[13.5px] font-bold tabular-nums tracking-[-0.01em]",
                      k === "trip"
                        ? "text-zinc-950 dark:text-zinc-50"
                        : "text-green-700 dark:text-green-400",
                    )}
                  >
                    {k === "trip" ? "−" : "+"}
                    {money(currency, amt, 0)}
                  </span>
                </div>
              );
            })
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/40">
            <span className="text-[12px] text-zinc-400 dark:text-zinc-500">
              {rows.length} of {history.length} transactions
            </span>
            {syncedAt ? (
              <span className="ml-auto text-[12px] text-zinc-400 dark:text-zinc-500">
                Synced {relativeTime(syncedAt)}
              </span>
            ) : null}
          </div>
        </V3Card>
      </div>
    </div>
  );
}
