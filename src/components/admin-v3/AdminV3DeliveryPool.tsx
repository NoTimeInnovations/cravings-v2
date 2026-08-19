"use client";

import * as React from "react";
import {
  Bike,
  Check,
  FileText,
  Loader2,
  MapPin,
  Package,
  Trash2,
  Settings as SettingsIcon,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  poolApprove,
  poolDisableRider,
  poolGetConfig,
  poolInvite,
  poolLinkRequests,
  poolOrders,
  poolRemoveRider,
  poolReject,
  poolRiderDocs,
  poolRiders,
  poolSyncConfig,
} from "@/app/actions/deliveryPoolPartner";
import RiderAvailabilityMap from "@/components/deliveryPool/RiderAvailabilityMap";
import { SubViewHeader } from "./menu/formKit";
import RiderAvatar from "@/components/deliveryPool/RiderAvatar";
import RiderDocsModal from "@/components/deliveryPool/RiderDocsModal";
import { confirmDialog, promptDialog } from "@/components/ui/confirm-dialog";
import { getPoolStatsOrdersQuery } from "@/api/deliveryBoys";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  rangeFor,
  type Period,
  type PoolOrder,
  type Scope,
} from "@/lib/deliveryPoolStats";
import { useAuthStore } from "@/store/authStore";
import { AdminV3Button, StatusPill, V3Card } from "./ui/primitives";
import { ToggleRow, V3Input } from "./menu/formKit";
import { DotPill, type StatusTone } from "./orders/shared";
import {
  CardHead,
  EmptyBlock,
  GridHead,
  RowIconButton,
  Segmented,
  TabCount,
  str,
} from "./deliveryPool/shared";
import { PoolPerformance } from "./deliveryPool/PoolPerformance";
import { PoolAppDownloads } from "./deliveryPool/PoolAppDownloads";

/**
 * admin-v3 Delivery Pool.
 *
 * Same data layer as admin-v2's DeliveryPoolPanel, deliberately unchanged: every
 * read and write goes through the server actions in
 * `src/app/actions/deliveryPoolPartner` (a proxy to the pool service, so the
 * internal key never reaches the browser), and the whole panel re-polls every
 * 6 s because rider availability and live jobs move without us.
 *
 * TWO SOURCES, ON PURPOSE. "Live orders" is the pool's own /orders endpoint,
 * which only returns jobs currently in flight. "Rider performance" is historical
 * and comes from OUR orders table via `getPoolStatsOrdersQuery`, aggregated by
 * `src/lib/deliveryPoolStats` — the pool cannot answer "how did last month go".
 *
 * The partner is auto-registered in the pool on open (poolSyncConfig with the
 * store's name, pickup point, banner and address). There is no manual "register"
 * step in v2 and there is none here.
 */

type Row = Record<string, any>;
type Res = { ok: boolean; data?: any; error?: string };
type Tab = "riders" | "availability" | "orders" | "performance";

/** Online / idle is the only "working right now" state the pool reports. */
const availTone = (s: unknown): StatusTone =>
  s === "online" || s === "idle" ? "green" : "neutral";

/** Rider · phone · status · completed · actions. */
const RIDER_GRID =
  "grid grid-cols-[minmax(200px,1.7fr)_150px_140px_80px_minmax(170px,auto)] items-center";

/** Order · status · rider · drop · fee. */
const ORDER_GRID =
  "grid grid-cols-[160px_150px_minmax(140px,1fr)_minmax(200px,1.6fr)_110px] items-center";

/** Pool strings arrive as `picked_up`; shown as "Picked up". */
const pretty = (v: unknown) => str(v).replace(/_/g, " ");

/**
 * RUPEES, NOT `partner.currency` — same as admin-v2.
 *
 * Every figure on this screen originates from the Menuthere delivery pool (an
 * India-only service): the live-order `delivery_fee`, the `poolFeeOf` column in
 * the breakdown, and the order values it is reconciled against. Stamping a
 * non-₹ partner's symbol on an INR pool figure would mislabel a cost someone
 * settles payouts against, so the unit stays fixed.
 */
const RUPEE = "₹";

export function AdminV3DeliveryPool() {
  const { userData } = useAuthStore();
  const rid = (userData as any)?.id as string | undefined;

  const [config, setConfig] = React.useState<Row | null>(null);
  const [requests, setRequests] = React.useState<Row[]>([]);
  const [riders, setRiders] = React.useState<Row[]>([]);
  const [orders, setOrders] = React.useState<Row[]>([]);
  const [loadedOnce, setLoadedOnce] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("riders");
  // Invite + visibility are set-once jobs; they open as sub-views so the
  // rider list keeps the fold. null = the pool overview.
  const [subView, setSubView] = React.useState<null | "invite" | "settings">(null);
  // Historical pool orders for the performance tab. Read from OUR orders table
  // rather than the pool API, whose /orders endpoint only returns live jobs.
  const [statsOrders, setStatsOrders] = React.useState<PoolOrder[]>([]);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<Period>("day");
  const [scope, setScope] = React.useState<Scope>("completed");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  // How far back the cached rows reach; a custom range starting earlier forces
  // a re-read rather than silently showing an empty period.
  const [fetchedFrom, setFetchedFrom] = React.useState<Date | null>(null);
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [docRider, setDocRider] = React.useState<{
    id: string;
    name?: string;
  } | null>(null);

  const load = React.useCallback(async () => {
    if (!rid) return;
    try {
      const [c, lr, rd, od] = await Promise.all([
        poolGetConfig(rid),
        poolLinkRequests(rid),
        poolRiders(rid),
        poolOrders(rid),
      ]);
      // Each result is checked on its own: a pool endpoint being down should
      // blank only its own list, not wipe the three that answered.
      if (c.ok) setConfig(c.data);
      if (lr.ok) setRequests(lr.data?.data ?? []);
      if (rd.ok) setRiders(rd.data?.data ?? []);
      if (od.ok) setOrders(od.data?.data ?? []);
    } catch (e) {
      // The actions already swallow HTTP errors into { ok:false }; this only
      // catches the action call itself failing. Silent, because it runs on a
      // 6s timer and a toast every six seconds would be worse than the outage.
      console.error("Error loading delivery pool:", e);
    } finally {
      // Flips the first-load spinner regardless, so a pool outage shows the
      // honest empty state instead of spinning forever.
      setLoadedOnce(true);
    }
  }, [rid]);

  const range = React.useMemo(
    () => rangeFor(period, { from: customFrom, to: customTo }),
    [period, customFrom, customTo],
  );
  const rangeFromMs = range.from.getTime();

  // ONE READ PER WIDENING. The cache already covers any window starting later
  // than what was fetched, so flipping Today / 7 days / 30 days costs nothing;
  // only a custom range reaching further back triggers another read.
  React.useEffect(() => {
    if (!rid) {
      setStatsLoading(false);
      return;
    }
    const wanted = new Date(rangeFromMs);
    if (fetchedFrom && wanted >= fetchedFrom) return;
    const readFrom = fetchedFrom && fetchedFrom < wanted ? fetchedFrom : wanted;
    let cancelled = false;
    setStatsLoading(true);
    (async () => {
      try {
        const res = await fetchFromHasura(getPoolStatsOrdersQuery, {
          partner_id: rid,
          from: readFrom.toISOString(),
        });
        if (!cancelled) setFetchedFrom(readFrom);
        if (!cancelled) setStatsOrders(res?.orders ?? []);
      } catch (e) {
        // Non-fatal: the rest of the panel still works, performance just stays
        // empty rather than taking the whole screen down.
        console.error("Error loading pool stats:", e);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rid, rangeFromMs, fetchedFrom]);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  // Auto-register this partner in the pool on open — no manual "register" step.
  React.useEffect(() => {
    if (!rid) return;
    const coords = (userData as any)?.geo_location?.coordinates;
    const pickup =
      Array.isArray(coords) && coords.length === 2
        ? { lat: coords[1], lng: coords[0] }
        : undefined;
    poolSyncConfig(rid, {
      name: (userData as any)?.store_name,
      pool_enabled: true,
      pickup,
      banner_url: (userData as any)?.store_banner,
      address: (userData as any)?.address,
    }).then(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  const money = React.useCallback(
    (n: number) =>
      `${RUPEE}${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
    [],
  );

  /** Every mutation goes through here: one busy flag, one toast, one reload. */
  const act = async (p: Promise<Res>, okMsg: string) => {
    setBusy(true);
    const r = await p;
    setBusy(false);
    if (r.ok) {
      toast.success(okMsg);
      load();
    } else {
      toast.error(r.error || "Failed");
    }
  };

  if (!rid) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-zinc-400 dark:text-zinc-500" />
      </div>
    );
  }

  const pickup = config?.pickup;
  const onlineCount = riders.filter(
    (r) => !r.disabled && (r.availability === "online" || r.availability === "idle"),
  ).length;

  /* ------------------------------------------------------------ row pieces */

  const statusPill = (r: Row) =>
    r.disabled ? (
      <DotPill tone="red">Disabled</DotPill>
    ) : (
      <DotPill tone={availTone(r.availability)} className="capitalize">
        {pretty(r.availability ?? "offline")}
      </DotPill>
    );

  /** Both a linked rider and a pending request carry `rider_id`. */
  const docsButton = (r: Row) => (
    <AdminV3Button
      variant="small"
      onClick={() =>
        setDocRider({
          id: str(r.rider_id),
          name: r.full_name ? String(r.full_name) : undefined,
        })
      }
    >
      <FileText size={14} strokeWidth={1.8} />
      Docs
    </AdminV3Button>
  );

  const toggleRiderButton = (r: Row) => (
    <AdminV3Button
      variant="small"
      disabled={busy}
      onClick={() =>
        act(
          poolDisableRider(rid, str(r.rider_id), !r.disabled),
          r.disabled ? "Enabled" : "Disabled",
        )
      }
    >
      {r.disabled ? "Enable" : "Disable"}
    </AdminV3Button>
  );

  const removeRider = async (r: Row) => {
    const ok = await confirmDialog({
      title: "Remove this rider?",
      description:
        "They will be unlinked from your pool and will stop receiving your orders.",
      confirmText: "Remove",
      destructive: true,
    });
    if (ok) act(poolRemoveRider(rid, str(r.rider_id)), "Removed");
  };

  const rejectRequest = async (q: Row) => {
    const reason =
      (await promptDialog({
        title: "Reject this rider request?",
        description: "Add a reason for rejecting this rider.",
        placeholder: "Reason for rejecting",
      })) || "";
    if (reason) act(poolReject(rid, str(q.id), reason), "Rejected");
  };

  const invite = () => {
    if (!phone.trim()) return;
    act(
      poolInvite(rid, phone.trim()).then((r) => {
        if (r.ok) setPhone("");
        return r;
      }),
      "Invite sent",
    );
  };

  // Inviting a rider and the pool-visibility switches are both occasional,
  // set-once jobs. As permanent cards they took two thirds of the fold from the
  // rider list, which is what this screen is actually watched for — so they move
  // behind buttons and open as sub-views, the same pattern Menu and Discounts use.
  if (subView === "invite") {
    return (
      <div className="flex flex-col pb-10">
        <SubViewHeader
          title="Add a rider"
          subtitle="Invite by phone — they accept in the rider app"
          backLabel="Back to delivery pool"
          onBack={() => setSubView(null)}
        />
        <div className="flex flex-col gap-3.5 px-0 pt-5 lg:px-[clamp(14px,3vw,28px)]">
          <V3Card className="min-w-0">
            <CardHead title="Add a rider" />
            <div className="flex flex-col gap-3 px-4 py-3.5">
              <p className="text-[12.5px] font-normal leading-[1.5] text-zinc-500 dark:text-zinc-400">
                Enter a rider&apos;s phone to invite them — they accept in the rider
                app and become linked.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <V3Input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !busy) invite();
                  }}
                  placeholder="+91XXXXXXXXXX"
                  aria-label="Rider phone number"
                  className="h-[38px] min-w-0 flex-[1_1_170px] text-[13px] tabular-nums"
                />
                <AdminV3Button
                  variant="primary"
                  onClick={invite}
                  disabled={busy || !phone.trim()}
                >
                  <UserPlus size={15} strokeWidth={1.9} />
                  Invite
                </AdminV3Button>
              </div>
            </div>
          </V3Card>
        </div>
      </div>
    );
  }

  if (subView === "settings") {
    return (
      <div className="flex flex-col pb-10">
        <SubViewHeader
          title="Delivery pool settings"
          subtitle="What the pool sees for your orders"
          backLabel="Back to delivery pool"
          onBack={() => setSubView(null)}
        />
        <div className="flex flex-col gap-3.5 px-0 pt-5 lg:px-[clamp(14px,3vw,28px)]">
          {/* Status, pickup and the rider-app links used to sit in a card on the
              overview. They are reference material you check when something is
              wrong, not while watching the queue, so they live here now. */}
          <V3Card className="min-w-0">
            <CardHead title="Delivery pool">
              {pickup ? (
                <StatusPill tone="green">In the pool</StatusPill>
              ) : (
                <StatusPill tone="amber">Location missing</StatusPill>
              )}
            </CardHead>
            <div className="flex flex-col gap-3 px-4 py-3.5">
              <p className="text-[12.5px] font-normal leading-[1.5] text-zinc-500 dark:text-zinc-400">
                Menuthere rider network. Orders auto-dispatch to your linked riders
                when you accept them.
              </p>
              {pickup ? (
                <div className="flex items-center gap-2 text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                  <MapPin
                    size={14}
                    strokeWidth={1.8}
                    className="shrink-0 text-zinc-400 dark:text-zinc-500"
                  />
                  <span translate="no" className="notranslate tabular-nums">
                    Pickup {pickup.lat?.toFixed?.(4)}, {pickup.lng?.toFixed?.(4)}
                  </span>
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] font-medium leading-[1.5] text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                  Set your store location (Settings → Store) so riders can find you.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <PoolAppDownloads />
              </div>
            </div>
          </V3Card>

          <V3Card className="min-w-0">
            <CardHead title="Delivery pool visibility" />
            <p className="px-4 pb-0.5 pt-3.5 text-[12.5px] font-normal leading-[1.5] text-zinc-500 dark:text-zinc-400">
              Control what the delivery pool sees for your orders.
            </p>
            {/* Written straight through to the pool on toggle — there is no Save
                button here in v2 and adding one would silently change the
                contract with the pool service. */}
            <ToggleRow
              title="Hide order value"
              description="Don't show the food order total to the delivery pool."
              checked={config?.hide_order_value ?? true}
              disabled={busy}
              onChange={(v) =>
                act(poolSyncConfig(rid, { hide_order_value: v }), "Saved")
              }
            />
            <ToggleRow
              title="Show delivery charge"
              description="Show the delivery charge (from your delivery settings) to riders."
              checked={config?.show_delivery_charge ?? true}
              disabled={busy}
              onChange={(v) =>
                act(poolSyncConfig(rid, { show_delivery_charge: v }), "Saved")
              }
              last
            />
          </V3Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* ------------------------------------------------------------ setup */}
      {/* The pool overview card is gone — its status, pickup and app links moved
          into Settings, which is where you go to change them. The ONE thing that
          stays on the overview is a missing pickup: riders cannot be dispatched
          to you at all until it is set, so burying it behind a button would hide
          the reason the pool looks dead. */}
      {!pickup && (
        <div className="mx-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] font-medium leading-[1.5] text-amber-700 lg:mx-0 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
          Set your store location (Settings → Store) so riders can find you.
        </div>
      )}

      {/* -------------------------------------------------- link requests */}
      {requests.length > 0 && (
        <V3Card>
          <CardHead
            title="Rider link requests"
            meta={`${requests.length} waiting`}
          />
          <div className="flex flex-col">
            {requests.map((q) => (
              <div
                key={str(q.id)}
                className="flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-100 px-4 py-3 last:border-b-0 dark:border-zinc-800"
              >
                <RiderAvatar
                  url={q.photo_url}
                  name={q.full_name}
                  size={36}
                  className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                />
                <div className="min-w-0 flex-[1_1_180px]">
                  <div
                    translate="no"
                    className="notranslate truncate text-[13.5px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                  >
                    {str(q.full_name)}
                  </div>
                  <div
                    translate="no"
                    className="notranslate mt-1 truncate text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500"
                  >
                    {str(q.phone)} · {str(q.district)} · {str(q.vehicle_type)} ·{" "}
                    {str(q.completed_orders ?? 0)} done
                  </div>
                </div>
                <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5">
                  {docsButton(q)}
                  <AdminV3Button
                    variant="primary"
                    className="h-8 px-3 text-[12.5px]"
                    disabled={busy}
                    onClick={() => act(poolApprove(rid, str(q.id)), "Approved")}
                  >
                    <Check size={14} strokeWidth={2.2} />
                    Approve
                  </AdminV3Button>
                  <AdminV3Button
                    variant="small"
                    disabled={busy}
                    onClick={() => rejectRequest(q)}
                  >
                    <X size={14} strokeWidth={2.2} />
                    Reject
                  </AdminV3Button>
                </div>
              </div>
            ))}
          </div>
        </V3Card>
      )}

      {/* --------------------------------------------------------- tab bar */}
      <div className="flex flex-wrap items-center gap-2.5 px-3 lg:px-0">
        <Segmented<Tab>
          ariaLabel="Delivery pool section"
          value={tab}
          onChange={setTab}
          options={[
            {
              value: "riders",
              label: (
                <>
                  Linked riders
                  <TabCount>{riders.length}</TabCount>
                </>
              ),
            },
            { value: "availability", label: "Availability" },
            {
              value: "orders",
              label: (
                <>
                  Live orders
                  <TabCount>{orders.length}</TabCount>
                </>
              ),
            },
            { value: "performance", label: "Rider performance" },
          ]}
        />
        <span className="ml-auto hidden text-[12.5px] font-normal leading-none text-zinc-400 lg:inline dark:text-zinc-500">
          Auto-refreshes every 6s
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-3">
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3 text-[12.5px]"
            onClick={() => setSubView("invite")}
          >
            <UserPlus size={14} strokeWidth={1.9} />
            Add rider
          </AdminV3Button>
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3 text-[12.5px]"
            onClick={() => setSubView("settings")}
          >
            <SettingsIcon size={14} strokeWidth={1.9} />
            Settings
          </AdminV3Button>
        </div>
      </div>

      {/* --------------------------------------------------- linked riders */}
      {tab === "riders" && (
        <V3Card>
          <CardHead
            title="Linked riders"
            meta={
              riders.length > 0
                ? `${onlineCount} of ${riders.length} online`
                : undefined
            }
          />
          {!loadedOnce ? (
            <div className="flex items-center justify-center py-16">
              <Loader2
                size={22}
                className="animate-spin text-zinc-400 dark:text-zinc-500"
              />
            </div>
          ) : !riders.length ? (
            <EmptyBlock
              icon={<Bike size={19} strokeWidth={1.7} />}
              title="No linked riders yet"
              body="Invite one by phone above, or approve an incoming request when a rider asks to join you."
            />
          ) : (
            <>
              {/* Table — md and up. Scrolls inside itself, never the page. */}
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[880px]">
                  <GridHead
                    grid={RIDER_GRID}
                    cols={[
                      { label: "Rider" },
                      { label: "Phone" },
                      { label: "Status" },
                      { label: "Done" },
                      { label: "" },
                    ]}
                  />
                  {riders.map((r) => (
                    <div
                      key={str(r.rider_id)}
                      className={`${RIDER_GRID} border-t border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50`}
                    >
                      <div className="flex min-w-0 items-center gap-[11px] px-4 py-3">
                        <RiderAvatar
                          url={r.photo_url}
                          name={r.full_name}
                          size={32}
                          className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        />
                        <div
                          translate="no"
                          className="notranslate min-w-0 truncate text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                        >
                          {str(r.full_name)}
                        </div>
                      </div>
                      <div
                        translate="no"
                        className="notranslate whitespace-nowrap px-4 py-3 text-[12.5px] font-normal leading-none text-zinc-700 tabular-nums dark:text-zinc-300"
                      >
                        {str(r.phone)}
                      </div>
                      <div className="px-4 py-3">{statusPill(r)}</div>
                      <div className="px-4 py-3 text-[13px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                        {str(r.completed_orders ?? 0)}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 px-4 py-3">
                        {docsButton(r)}
                        {toggleRiderButton(r)}
                        <RowIconButton
                          title="Remove rider"
                          tone="danger"
                          disabled={busy}
                          onClick={() => removeRider(r)}
                        >
                          <Trash2 size={15} strokeWidth={1.7} />
                        </RowIconButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card list — below md. */}
              <div className="flex flex-col gap-2.5 p-3 md:hidden">
                {riders.map((r) => (
                  <div
                    key={str(r.rider_id)}
                    className="flex flex-col gap-2.5 rounded-[10px] border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-[11px]">
                      <RiderAvatar
                        url={r.photo_url}
                        name={r.full_name}
                        size={34}
                        className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          translate="no"
                          className="notranslate truncate text-[13.5px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                        >
                          {str(r.full_name)}
                        </div>
                        <div
                          translate="no"
                          className="notranslate mt-1 truncate text-xs font-normal leading-none text-zinc-400 tabular-nums dark:text-zinc-500"
                        >
                          {str(r.phone)} · {str(r.completed_orders ?? 0)} done
                        </div>
                      </div>
                      {statusPill(r)}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {docsButton(r)}
                      {toggleRiderButton(r)}
                      <div className="ml-auto">
                        <RowIconButton
                          title="Remove rider"
                          tone="danger"
                          disabled={busy}
                          onClick={() => removeRider(r)}
                        >
                          <Trash2 size={15} strokeWidth={1.7} />
                        </RowIconButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </V3Card>
      )}

      {/* ---------------------------------------------------- availability */}
      {tab === "availability" && (
        <V3Card>
          {/* No count in this header on purpose: the map keeps its own online /
              offline lists, and it only plots riders that also report a
              location — two counts that disagree would be worse than one. */}
          <CardHead title="Rider availability" />
          {/* RiderAvailabilityMap is shared with the superadmin panel and is
              reused as-is: it owns its own Mapbox instance, its own online /
              offline split and its own "token not configured" state. */}
          <div className="p-3">
            <RiderAvailabilityMap
              riders={riders}
              center={
                pickup ? [Number(pickup.lng), Number(pickup.lat)] : undefined
              }
              variant="v3"
            />
          </div>
        </V3Card>
      )}

      {/* ----------------------------------------------------- live orders */}
      {tab === "orders" && (
        <V3Card>
          <CardHead
            title="Live orders"
            meta={orders.length > 0 ? `${orders.length} in flight` : undefined}
          />
          {!loadedOnce ? (
            <div className="flex items-center justify-center py-16">
              <Loader2
                size={22}
                className="animate-spin text-zinc-400 dark:text-zinc-500"
              />
            </div>
          ) : !orders.length ? (
            <EmptyBlock
              icon={<Package size={19} strokeWidth={1.7} />}
              title="No active pool orders"
              body="Orders appear here the moment you accept one and it is dispatched to the pool."
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[860px]">
                  <GridHead
                    grid={ORDER_GRID}
                    cols={[
                      { label: "Order" },
                      { label: "Status" },
                      { label: "Rider" },
                      { label: "Drop" },
                      { label: "Fee", right: true },
                    ]}
                  />
                  {orders.map((od) => (
                    <div
                      key={str(od.id)}
                      className={`${ORDER_GRID} border-t border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50`}
                    >
                      <div className="truncate px-4 py-3 font-mono text-[12px] leading-none text-zinc-700 dark:text-zinc-300">
                        {str(od.source_order_id ?? od.id).slice(0, 12)}
                      </div>
                      <div className="px-4 py-3">
                        <DotPill tone="green" className="capitalize">
                          {pretty(od.status)}
                        </DotPill>
                      </div>
                      <div
                        translate="no"
                        className="notranslate truncate px-4 py-3 text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                      >
                        {str(od.rider_name)}
                      </div>
                      <div
                        translate="no"
                        className="notranslate truncate px-4 py-3 text-[12.5px] font-normal leading-none text-zinc-500 dark:text-zinc-400"
                      >
                        {str(od.drop_address)}
                      </div>
                      <div className="px-4 py-3 text-right text-[13px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                        {od.delivery_fee != null
                          ? `${RUPEE}${str(od.delivery_fee)}`
                          : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 p-3 md:hidden">
                {orders.map((od) => (
                  <div
                    key={str(od.id)}
                    className="flex flex-col gap-2 rounded-[10px] border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[12px] leading-none text-zinc-500 dark:text-zinc-400">
                        {str(od.source_order_id ?? od.id).slice(0, 12)}
                      </span>
                      <DotPill tone="green" className="capitalize">
                        {pretty(od.status)}
                      </DotPill>
                    </div>
                    <div
                      translate="no"
                      className="notranslate text-[12.5px] font-normal leading-[1.45] text-zinc-500 dark:text-zinc-400"
                    >
                      {str(od.drop_address)}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        translate="no"
                        className="notranslate truncate text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                      >
                        {str(od.rider_name)}
                      </span>
                      <span className="text-[13px] font-semibold leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                        {od.delivery_fee != null
                          ? `${RUPEE}${str(od.delivery_fee)}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </V3Card>
      )}

      {/* ----------------------------------------------------- performance */}
      {tab === "performance" && (
        <PoolPerformance
          statsOrders={statsOrders}
          statsLoading={statsLoading}
          period={period}
          onPeriodChange={setPeriod}
          scope={scope}
          onScopeChange={setScope}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          customTo={customTo}
          onCustomToChange={setCustomTo}
          range={range}
          money={money}
        />
      )}

      {/* Documents viewer — shared with the superadmin rider screen, reused
          as-is. The docs are presigned by the pool service, so they are fetched
          on open rather than held in this component's state. */}
      <RiderDocsModal
        open={!!docRider}
        onClose={() => setDocRider(null)}
        riderId={docRider?.id ?? null}
        riderName={docRider?.name}
        fetchDocs={async (id) => {
          const r = await poolRiderDocs(rid, id);
          const j = r.ok ? r.data : null;
          return {
            docs: j?.data ?? [],
            fullName: j?.full_name,
            kyc: j?.kyc_status,
          };
        }}
      />
    </div>
  );
}
