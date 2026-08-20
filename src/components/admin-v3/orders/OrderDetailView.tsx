"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  History,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  Pencil,
  Phone,
  Printer,
  Route,
  Timer,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getOrderLoyaltyInfo } from "@/app/actions/loyalty";
import {
  cancelDispatch,
  dispatchViaDeliveryBridge,
  getDispatchProgress,
} from "@/app/actions/porterBridge";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { dispatchDeliveryPool } from "@/app/actions/deliveryPoolDispatch";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { displayChargeName } from "@/lib/chargeLabel";
import { getDiscountAmount } from "@/lib/discountUtils";
import { getFeatures } from "@/lib/getFeatures";
import { getOrderTypeLabel, getPaymentDisplayLabel } from "@/lib/orderLabels";
import { isRealDeliveryOrder, usesOwnDeliveryBoys } from "@/lib/ownDriverDispatch";
import { useHasOwnDrivers } from "@/hooks/useHasOwnDrivers";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { taxLabel } from "@/lib/taxLabel";
import { toStatusDisplayFormat } from "@/lib/statusHistory";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import type { DispatchHistoryRow } from "@/lib/dispatchHistory";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  elapsedMs,
  formatElapsed,
  formatKm,
  parseStatusTimestamps,
  stampFor,
} from "@/lib/orderMetrics";
import { bxgyOrderLabel } from "@/lib/bxgy";
import { formatPrebookDateLabel, formatPrebookSlotLabel, parsePrebookingSettings } from "@/lib/prebooking";
import type { Order } from "@/store/orderStore";
import { Partner, useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

import { AdminV3Button } from "../ui/primitives";
import { nextStep } from "../dashboard/orderCardShared";
import { BookingHistoryView } from "./BookingHistoryView";
import { LiveRiderMap } from "./LiveRiderMap";
import { RiderPicker } from "./RiderPicker";
import {
  CARD,
  CARD_HEAD,
  CARD_TITLE,
  CONTROL,
  DotPill,
  FIELD_LABEL,
  ICON_BTN,
  MetaPill,
  fmtTz,
  initialsOf,
  money,
  statusMeta,
  toneDotClass,
  useCopyFlag,
  whatsappHref,
} from "./shared";

/**
 * The order DETAIL sub-view of the v3 Orders screen.
 *
 * Presentation only, plus the two reads that belong to this screen alone
 * (loyalty info and the delivery-bridge dispatch state). Every mutation — status
 * change, print, payment method, delete — is handed down from AdminV3Orders, so
 * the completed-order lock, the password gate and the own-driver dispatch rules
 * are enforced in exactly ONE place and cannot diverge between the list and
 * this view, the way they had to be kept in step across admin-v2's three files.
 */

/**
 * One booking attempt the bridge made for this order.
 *
 * A single order can have several: a provider times out and the sequence
 * escalates to the next, a rider cancels and it rebooks, or the partner cancels
 * and books again. Each attempt is its own row with its own reference — which
 * is what makes a booking history worth showing rather than just "the rider".
 *
 * Re-exported from the canonical row rather than restated. A hand-written copy
 * here declared a flat `driverName`, which does not exist: the real row carries
 * a `driver` OBJECT plus `fareAmount`, so every past booking rendered as "Never
 * assigned" with its phone, vehicle and fare silently dropped. Importing the
 * type makes that class of drift impossible.
 */
export type DispatchBooking = DispatchHistoryRow;

/** What getDispatchProgress returns, narrowed to what this screen reads. */
type DispatchProgress = {
  dispatchId: string | null;
  status: string;
  bookingStatus: string | null;
  currentProvider: string | null;
  wonProvider: string | null;
  driver: {
    name?: string | null;
    phone?: string | null;
    vehicleNumber?: string | null;
  } | null;
  driverName: string | null;
  trackUrl: string | null;
  history?: DispatchBooking[];
};

type Rider = {
  name?: string | null;
  phone?: string | null;
  vehicleNumber?: string | null;
  provider?: string | null;
  trackUrl?: string | null;
};

const STEP_INDEX: Record<string, number> = {
  pending: 0,
  accepted: 1,
  preparing: 1,
  food_ready: 2,
  dispatched: 3,
  in_transit: 3,
  completed: 4,
};

export function OrderDetailView({
  order,
  onBack,
  onEdit,
  onDelete,
  onChangeStatus,
  onPrint,
  onSetPaymentMethod,
  canEdit,
  canDelete,
  statusFrozen,
}: {
  order: Order;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: (status: string) => void;
  onPrint: (docs: Array<"kot" | "bill">) => void;
  onSetPaymentMethod: (method: string) => void;
  /** False when the completed-order lock has frozen this order's contents. */
  canEdit: boolean;
  canDelete: boolean;
  /** True when the order is cancelled AND locked — the status can't move at all. */
  statusFrozen: boolean;
}) {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const currency = partner?.currency || "₹";

  // The single-click advance. Deliberately the SAME nextStep() the dashboard's
  // live-order cards use, so the two surfaces can never disagree about what
  // "next" means. Everything that makes advancing non-trivial — the own-driver
  // dispatch picker, the completed-order password gate, the cancel flow — lives
  // in the parent's handleUpdateStatus, which onChangeStatus already routes to.
  const next = nextStep(order);
  // `partners.timezone` is a real column — Settings → General writes it and
  // src/api/partners.ts selects it — but the shared `Partner` type in authStore
  // never declared it, so the type is what's wrong here, not the read. Cast
  // rather than widen a store type this screen doesn't own; admin-v2 does the
  // same (AdminV2Settlements, AdminV2Analytics) and so do the sibling v3
  // screens. `fmtTz` runs it through `safeTz`, so undefined is handled.
  const tz = (partner as any)?.timezone as string | undefined;
  const gstPercentage = partner?.gst_percentage || 0;
  const features = getFeatures(partner?.feature_flags || null);
  const prebookCfg = parsePrebookingSettings((userData as any)?.prebooking_settings);

  const [idCopied, copyId] = useCopyFlag();
  // Separate from the header's flag: one shared flag would tick both at once.
  const [fullIdCopied, copyFullId] = useCopyFlag();
  const [addrCopied, copyAddr] = useCopyFlag();
  const [riderCopied, copyRider] = useCopyFlag();
  const [pickingMethod, setPickingMethod] = React.useState(false);
  const [booking, setBooking] = React.useState(false);
  const [booked, setBooked] = React.useState(false);

  const [loyalty, setLoyalty] = React.useState<{
    pointsRedeemed: number;
    redeemValue: number;
    pointsEarned: number | null;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getOrderLoyaltyInfo(order.id)
      .then((info) => {
        if (!cancelled) setLoyalty(info);
      })
      .catch(() => {
        /* loyalty is additive detail — a failure must not blank the order */
      });
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  /* ----------------------------------------------------------- metrics ---- */

  /**
   * When the order entered each status, and how far the delivery was.
   *
   * Fetched HERE rather than added to the order subscription every screen
   * shares. Both columns are admin-v3-only, and widening the shared query to
   * carry them would push new fields through admin-v2's mappers for no reason.
   * Re-runs on `order.status` so the timeline fills in as the order advances.
   */
  const [metrics, setMetrics] = React.useState<{
    status_timestamps: unknown;
    delivery_distance_km: number | null;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchFromHasura(
      `query OrderMetrics($id: uuid!) {
         orders_by_pk(id: $id) {
           status_timestamps
           delivery_distance_km
         }
       }`,
      { id: order.id },
    )
      .then((res: any) => {
        if (!cancelled && res?.orders_by_pk) setMetrics(res.orders_by_pk);
      })
      .catch(() => {
        /* times and distance are additive detail — a failure must not blank
           the order, it just leaves the steps without a time. */
      });
    return () => {
      cancelled = true;
    };
  }, [order.id, order.status]);

  /* ------------------------------------------------------------- rider ---- */

  const dispatchId = (order.delivery_provider_meta as { dispatchId?: string } | null)?.dispatchId;
  const [progress, setProgress] = React.useState<DispatchProgress | null>(null);
  const [cancellingRider, setCancellingRider] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  /**
   * Keep polling while the dispatch is still moving.
   *
   * The rider's name, phone and vehicle live on the BRIDGE, not on the order
   * row, so a single fetch on mount showed nothing until a reload — by which
   * time a rider had usually been assigned. Same cadence the admin-v2 panel
   * uses: fast while hunting, and a short settle window after a local action so
   * a cancel lands here without one either.
   */
  const settleUntil = React.useRef(0);
  const [pollToken, setPollToken] = React.useState(0);

  React.useEffect(() => {
    if (!dispatchId) {
      setProgress(null);
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const openedAt = Date.now();
    /** A dispatch can report "assigned" a beat before the driver details land.
     *  Bounded, so an order that never produces a rider stops polling instead
     *  of running a request every few seconds for as long as the tab is open. */
    const AWAITING_RIDER_GRACE = 3 * 60_000;

    const tick = async () => {
      try {
        const res: any = await getDispatchProgress(order.id);
        if (!active) return;
        if (res?.ok) {
          const data = res.data as DispatchProgress;
          setProgress(data);
          const moving = data.status === "running" || data.status === "searching";
          const awaitingRider =
            !(data.driver?.name || data.driverName) &&
            Date.now() - openedAt < AWAITING_RIDER_GRACE;
          // Stop once it has settled. A detail screen that polls a finished
          // delivery forever is a background request per open tab, all day.
          if (moving || awaitingRider || Date.now() < settleUntil.current) {
            timer = setTimeout(tick, moving ? 5000 : 2500);
          }
        }
      } catch {
        /* the bridge being unreachable must not blank the order */
      }
    };
    void tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [dispatchId, order.id, pollToken]);

  /** Re-arm the loop and watch closely for a few seconds after a local action. */
  const watchBriefly = React.useCallback(() => {
    settleUntil.current = Date.now() + 15000;
    setPollToken((n) => n + 1);
  }, []);

  const bridgeRider: Rider | null = progress
    ? {
        name: progress.driver?.name ?? progress.driverName ?? null,
        phone: progress.driver?.phone ?? null,
        vehicleNumber: progress.driver?.vehicleNumber ?? null,
        provider: progress.wonProvider ?? null,
        trackUrl: progress.trackUrl ?? null,
      }
    : null;

  const cancelRider = async () => {
    const ok = await confirmDialog({
      title: "Cancel this rider?",
      description:
        "The delivery partner is told to stand down. The order itself stays open — you can book another rider, or deliver it yourself.",
      confirmText: "Cancel rider",
      destructive: true,
    });
    if (!ok) return;
    setCancellingRider(true);
    try {
      const res = await cancelDispatch(order.id, undefined, "partner");
      if (res.ok) toast.success("Rider cancelled");
      else toast.error(res.message || "Couldn't cancel the rider");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCancellingRider(false);
      watchBriefly();
    }
  };

  const meta = (order.delivery_provider_meta || {}) as Record<string, any>;
  const rider: Rider | null = bridgeRider?.name
    ? bridgeRider
    : order.delivery_agent?.name
      ? {
          name: order.delivery_agent.name,
          phone: order.delivery_agent.phone,
          provider: order.delivery_agent.provider || order.delivery_provider,
          vehicleNumber: meta.riderVehicle ?? null,
        }
      : meta.riderName
        ? {
            name: meta.riderName,
            phone: meta.riderPhone ?? null,
            vehicleNumber: meta.riderVehicle ?? null,
            provider: order.delivery_provider,
            trackUrl: meta.trackingUrl ?? null,
          }
        : order.delivery_boy?.name
          ? {
              name: order.delivery_boy.name,
              phone: order.delivery_boy.phone,
              provider: "Own rider",
            }
          : null;

  const bookings = progress?.history ?? [];
  /** The rider on this order is one of the partner's own, not a 3PL's. */
  const isOwnRider = !!order.delivery_boy_id;
  const trackHref = progress?.trackUrl ?? (meta.trackingUrl as string | null) ?? null;
  // Nothing to track once the order is finished, and nothing to stand down
  // either — a cancel then would reach a booking that has already ended.
  const liveDelivery =
    order.status !== "completed" &&
    order.status !== "cancelled" &&
    progress?.bookingStatus !== "ended" &&
    progress?.bookingStatus !== "failed";
  const canTrack = !!trackHref && liveDelivery;
  const canCancelRider = !!progress?.dispatchId && liveDelivery;

  const isDelivery = isRealDeliveryOrder(order);

  /* ------------------------------------------------- own delivery boys ---- */

  const hasOwnDrivers = useHasOwnDrivers();



  /**
   * Assigning one of the partner's OWN riders.
   *
   * Gated on the Delivery Boys switch (absent = on, so nothing changes for a
   * partner who already had riders) AND on actually having an active rider to
   * assign — offering a picker that opens onto an empty list is worse than
   * offering nothing. Not offered once the order is finished or cancelled.
   */
  const canAssignOwnRider =
    isDelivery &&
    hasOwnDrivers &&
    usesOwnDeliveryBoys(partner) &&
    order.status !== "completed" &&
    order.status !== "cancelled";

  const canBookRider =
    isDelivery &&
    (features.porter_bridge.enabled || features.delivery_pool.enabled) &&
    !!order.delivery_location?.coordinates;

  /** Something to show, or something to do. Otherwise the card is a heading
   *  over a sentence restating what the timeline already says. */
  const showDeliveryCard =
    !!rider ||
    !!progress?.dispatchId ||
    bookings.length > 0 ||
    canBookRider ||
    canAssignOwnRider;

  const bookRider = async () => {
    setBooking(true);
    try {
      const res: any = features.porter_bridge.enabled
        ? await dispatchViaDeliveryBridge(order.id)
        : await dispatchDeliveryPool(order.id);
      if (res.ok) {
        setBooked(true);
        toast.success("Rider dispatch requested");
      } else {
        toast.error(res.message || "Couldn't book a rider");
      }
    } catch {
      toast.error("Couldn't book a rider");
    } finally {
      setBooking(false);
    }
  };

  /* ------------------------------------------------------------- totals --- */

  const foodSubtotal = order.items.reduce(
    (sum, item) => sum + ((item as any).is_freebie ? 0 : item.price * item.quantity),
    0,
  );
  const charges = (order.extraCharges || []).map((charge) => ({
    name: displayChargeName(charge.name),
    amount: getExtraCharge(order.items, charge.amount, charge.charge_type as any),
  }));
  const chargesSubtotal = charges.reduce((sum, c) => sum + c.amount, 0);
  const subtotal = foodSubtotal + chargesSubtotal;
  const gstAmount = order.gstIncluded ?? (foodSubtotal * gstPercentage) / 100;
  const discounts = order.discounts || [];

  /* ----------------------------------------------------------- timeline --- */

  // status_timestamps is the real source: the DB trigger stamps every status
  // change, including "food ready", which status_history has no slot for.
  // status_history is kept as the FALLBACK so orders placed before the trigger
  // existed still show the three times they did record.
  const history = toStatusDisplayFormat(order.status_history as any);
  const stamps = parseStatusTimestamps(metrics?.status_timestamps);
  const currentStep = STEP_INDEX[order.status] ?? 0;
  const steps = [
    // created_at, not the "pending" stamp: it is the canonical placement time
    // and is present on every order, including ones inserted already-advanced.
    { label: "Placed", at: order.createdAt as string | null },
    {
      label: "Accepted",
      at: stampFor(stamps, "accepted") ?? history.accepted?.completedAt ?? null,
    },
    { label: "Ready", at: stampFor(stamps, "food_ready") },
    ...(isDelivery
      ? [
          {
            label: "Picked up",
            at:
              stampFor(stamps, "dispatched", "in_transit") ??
              history.dispatched?.completedAt ??
              null,
          },
        ]
      : []),
    {
      label: isDelivery ? "Delivered" : "Completed",
      at:
        stampFor(stamps, "completed") ?? history.completed?.completedAt ?? null,
    },
  ];

  /* How far, and how long from placing to completing. Delivery only — the ask
     was about the delivery trip, and neither figure means much for a dine-in
     ticket. `delivered_at` backs up the completed stamp for older orders. */
  const deliveryKm = isDelivery ? Number(metrics?.delivery_distance_km) : NaN;
  const completedAt =
    stampFor(stamps, "completed") ??
    history.completed?.completedAt ??
    order.delivered_at ??
    null;
  const totalMs = order.status === "completed"
    ? elapsedMs(order.createdAt, completedAt)
    : null;
  // Number(null) is 0 and Number(undefined) is NaN, so "> 0 and finite" covers
  // both "not recorded" cases without a separate null check.
  const hasKm = Number.isFinite(deliveryKm) && deliveryKm > 0;
  const showTrip = isDelivery && (hasKm || totalMs != null);
  // With no dispatch step the completed step moves down one index.
  const stepReached = (i: number) =>
    isDelivery ? currentStep >= i : currentStep >= (i === steps.length - 1 ? 4 : i);

  const status = statusMeta(order.status);
  const scheduledDate = order.scheduled_date;
  const customerName = order.user?.full_name || order.user?.name || null;
  const customerPhone = order.phone || order.user?.phone || null;
  const coords = order.delivery_location?.coordinates;

  const invoiceLabel =
    order.display_id && String(order.display_id).trim()
      ? `#${order.display_id}`
      : `#${order.id.slice(0, 8)}`;

  /**
   * Payment + Order info: the two cards that can sit in either column.
   *
   * Rendered once, from a variable, so there is a single instance no matter
   * which side it lands on — two copies behind a media query would mean two
   * sets of handlers and two "Set payment method" menus.
   */
  /**
   * Which column Payment + Order info sit in.
   *
   * With few items the left column ran out of content while the right rail kept
   * going, leaving a tall empty gutter. Moving the two secondary cards across
   * fills it — but only while the left really is the shorter side, or the same
   * move creates the opposite imbalance on a long order.
   *
   * Measured, not guessed from an item count: descriptions wrap, charges and
   * discounts add rows, and the Delivery card is 494px with a map and absent
   * without one, so no fixed number is right for both. The two heights compared
   * are the ones that NEVER move — the items card on the left, and
   * Delivery + Customer on the right — so the decision cannot feed back into
   * itself and oscillate. Arithmetic: with A = left, B = right-fixed and K the
   * movable group, |A+K-B| < |B+K-A| reduces exactly to A < B.
   */
  const leftRef = React.useRef<HTMLDivElement>(null);
  const rightFixedRef = React.useRef<HTMLDivElement>(null);
  const [leftShorter, setLeftShorter] = React.useState(false);
  // Only when the columns are actually side by side. Stacked, the reading order
  // is items -> delivery -> customer -> payment, and moving cards up through it
  // would scramble that for no gain.
  const twoColumns = useMediaQuery("(min-width: 1024px)");

  React.useEffect(() => {
    if (!twoColumns) {
      setLeftShorter(false);
      return;
    }
    const a = leftRef.current;
    const b = rightFixedRef.current;
    if (!a || !b) return;
    const measure = () => {
      const l = a.getBoundingClientRect().height;
      const r = b.getBoundingClientRect().height;
      if (l > 0 && r > 0) setLeftShorter(l < r);
    };
    measure();
    // Both sides change after first paint — the map loads, a rider arrives, the
    // items list settles — so a single measurement would be taken too early.
    const ro = new ResizeObserver(measure);
    ro.observe(a);
    ro.observe(b);
    return () => ro.disconnect();
  }, [twoColumns]);

  const secondaryCards = (
    <>
                {/* Payment */}
                <div className={CARD}>
                  <div className={CARD_HEAD}>
                    <span className={cn(CARD_TITLE, "flex-[1_1_auto]")}>Payment</span>
                    <DotPill tone={order.is_paid ? "green" : "amber"}>
                      {order.is_paid ? "Paid" : "Pending"}
                    </DotPill>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 px-4 py-3.5">
                    <div>
                      <div className={FIELD_LABEL}>Amount due</div>
                      <div className="mt-1 text-[20px] font-semibold tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50">
                        {money(currency, order.totalPrice, 2)}
                      </div>
                    </div>
                    <MetaPill>{getPaymentDisplayLabel(order)}</MetaPill>
                  </div>
                  <div className="px-4 pb-3.5">
                    <div className={FIELD_LABEL}>Method</div>
                    {order.payment_method && !pickingMethod ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                        <span className="text-[13px] font-medium capitalize text-zinc-950 dark:text-zinc-50">
                          {order.payment_method}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPickingMethod(true)}
                          className="ml-auto inline-flex h-[30px] shrink-0 items-center rounded-md border border-zinc-200 bg-transparent px-[11px] text-[12.5px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Change
                        </button>
                      </div>
                    ) : pickingMethod ? (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {["cash", "upi", "card"].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              onSetPaymentMethod(m);
                              setPickingMethod(false);
                            }}
                            className="h-[34px] flex-[1_1_80px] rounded-md border border-zinc-200 bg-white text-[13px] font-medium capitalize text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            {m === "upi" ? "UPI" : m}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                        <span className="text-[13px] font-normal text-zinc-400 dark:text-zinc-500">
                          Not recorded
                        </span>
                        <AdminV3Button
                          variant="strong"
                          className="ml-auto h-[30px] px-[11px] text-[12.5px] font-medium"
                          onClick={() => setPickingMethod(true)}
                        >
                          Set
                        </AdminV3Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order info */}
                <div className={cn(CARD, "px-4 pb-2.5 pt-1.5")}>
                  <InfoRow label="Order type" value={getOrderTypeLabel(order)} />
                  <InfoRow
                    label="Channel"
                    value={
                      order.order_channel === "app"
                        ? "App"
                        : order.order_channel === "whatsapp"
                          ? "WhatsApp"
                          : order.order_channel === "web"
                            ? "Web"
                            : "—"
                    }
                  />
                  <InfoRow label="Invoice No" value={invoiceLabel} />
                  {/* Growjet had its own column on admin-v2's list. The v3 table has
                      a fixed eight, so the booking number lives here instead of
                      disappearing for the partners who dispatch through it. */}
                  {order.growjet_order_number && (
                    <InfoRow
                      label="Growjet"
                      value={
                        <span className="font-mono text-[12px]">{order.growjet_order_number}</span>
                      }
                    />
                  )}
                  <InfoRow
                    label="Order ID"
                    value={<span className="font-mono text-[12px]">{order.id.slice(0, 8)}</span>}
                  />
                  {/* The short id is what the dashboard shows everywhere, but
                      support tickets, Hasura and the bridge all key on the full
                      uuid — so it needs to be readable AND copyable here rather
                      than dug out of the URL. break-all: 36 characters do not
                      fit this column on one line and must wrap, not overflow. */}
                  <InfoRow
                    label="Full order ID"
                    value={
                      <span className="inline-flex items-start gap-1.5">
                        <span className="min-w-0 break-all font-mono text-[11.5px] leading-[1.45]">
                          {order.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyFullId(order.id)}
                          title="Copy the full order ID"
                          aria-label="Copy the full order ID"
                          className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        >
                          {fullIdCopied ? (
                            <Check size={12} strokeWidth={2.2} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy size={12} strokeWidth={1.9} />
                          )}
                        </button>
                      </span>
                    }
                  />
                  <InfoRow
                    label="Placed"
                    value={fmtTz(order.createdAt, tz, "MMM D, YYYY · hh:mm A")}
                    last={!scheduledDate}
                  />
                  {scheduledDate && (
                    <InfoRow
                      label={order.booking_persons ? "Table booking" : "Prebooked for"}
                      value={`${formatPrebookDateLabel(scheduledDate)}${
                        order.scheduled_time
                          ? ` · ${formatPrebookSlotLabel(prebookCfg, scheduledDate, order.scheduled_time, {
                              dineIn: !!order.booking_persons,
                              to: order.scheduled_time_to,
                            })}`
                          : ""
                      }`}
                      last
                    />
                  )}
                </div>
    </>
  );

  if (historyOpen) {
    return (
      <BookingHistoryView
        bookings={bookings}
        orderLabel={invoiceLabel}
        currency={currency}
        tz={tz}
        onBack={() => setHistoryOpen(false)}
      />
    );
  }

  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------------- header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to orders"
          className={cn(ICON_BTN, "h-[34px] w-[34px]")}
        >
          <ArrowLeft size={16} strokeWidth={1.9} />
        </button>

        <div className="min-w-0 flex-[1_1_220px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[16px] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
              Order {invoiceLabel}
            </span>
            <DotPill tone={status.tone}>{status.label}</DotPill>
          </div>
          <div className="mt-[3px] flex flex-wrap items-center gap-[7px]">
            <span className="text-[12.5px] font-normal text-zinc-500 dark:text-zinc-400">
              {fmtTz(order.createdAt, tz, "MMMM D, YYYY hh:mm A")}
            </span>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span className="font-mono text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
              #{order.id.slice(0, 8)}
            </span>
            {idCopied ? (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-green-700 dark:text-green-400">
                <Check size={12} strokeWidth={2.2} />
                Copied
              </span>
            ) : (
              <button
                type="button"
                title="Copy order ID"
                onClick={() => copyId(order.id)}
                className="flex h-6 w-6 items-center justify-center rounded-[5px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <Copy size={13} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {next && !statusFrozen && (
            <AdminV3Button
              variant="primary"
              // font-medium overrides the primary variant's font-bold so it sits at
              // the same weight as the Pending / Print / Edit controls beside it.
              className="h-[34px] px-3 text-[13px] font-medium"
              title={`Move this order to ${next.label}`}
              onClick={() => onChangeStatus(next.status)}
            >
              Next Status
              <ArrowRight size={14} strokeWidth={2} />
            </AdminV3Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={statusFrozen}>
              <button type="button" className={CONTROL}>
                <span className={cn("h-1.5 w-1.5 rounded-full", toneDotClass(status.tone))} />
                {status.label}
                <ChevronDown size={14} strokeWidth={2} className="text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {statusOptionsFor(order.status, canEdit).map((s) => (
                <DropdownMenuItem key={s.value} onClick={() => onChangeStatus(s.value)}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={CONTROL}>
                <Printer size={15} strokeWidth={1.8} className="text-zinc-500" />
                Print
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPrint(["kot"])}>Print KOT</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrint(["bill"])}>Print Bill</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrint(["kot", "bill"])}>
                Print KOT + Bill
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {canEdit && (
            <button type="button" className={CONTROL} onClick={onEdit}>
              <Pencil size={15} strokeWidth={1.8} className="text-zinc-500" />
              Edit
            </button>
          )}

          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className={cn(ICON_BTN, "h-[34px] w-[34px]")}
                >
                  <MoreVertical size={15} strokeWidth={1.8} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                >
                  <Trash2 size={14} strokeWidth={1.8} className="mr-2" />
                  Delete order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ body */}
      <div className="flex flex-col gap-3.5 px-[clamp(14px,3vw,28px)] pb-10 pt-4">
        {order.status === "cancelled" ? (
          <div className="flex items-start gap-3 rounded-[10px] border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
            <XCircle size={18} strokeWidth={1.9} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0">
              <p className={cn(FIELD_LABEL, "text-red-700 dark:text-red-400")}>
                Cancelled
                {order.cancelled_by ? ` · by ${cancelledByLabel(order.cancelled_by)}` : ""}
              </p>
              <p className="mt-1.5 break-words text-[13px] leading-[1.55] text-red-900 dark:text-red-200">
                {order.cancel_reason || "No reason provided"}
              </p>
            </div>
          </div>
        ) : (
          <div className={cn(CARD, "p-4")}>
            <div className="overflow-x-auto [scrollbar-width:none]">
              <div className="flex min-w-[470px] items-start gap-0">
                {steps.map((step, i) => {
                  const done = stepReached(i);
                  // The last step draws no connector, so giving it flex-1 like
                  // the others made it claim an equal share of the row while
                  // rendering only a 16px dot — the track visibly stopped short
                  // of the right edge with a full column of dead space after it.
                  // It shrinks to its label instead and aligns right, so the
                  // connectors between the earlier steps absorb the width and
                  // the final dot lands on the edge.
                  const isLast = i === steps.length - 1;
                  return (
                    <div
                      key={step.label}
                      className={cn(
                        "flex flex-col gap-2",
                        // The last column is exactly the DOT's width, and its
                        // label is taken out of flow (absolute, right-aligned)
                        // so it cannot claim row width. Sizing this column to
                        // the label instead left a label-wide gap between the
                        // previous connector and the final dot.
                        isLast ? "relative w-4 shrink-0" : "min-w-0 flex-1",
                      )}
                    >
                      <div className="flex items-center">
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                            done
                              ? "bg-green-600 text-white"
                              : "border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500",
                          )}
                        >
                          {done ? <Check size={10} strokeWidth={3} /> : null}
                        </span>
                        {!isLast && (
                          <span
                            className={cn(
                              "h-0.5 flex-1",
                              done ? "bg-green-600" : "bg-zinc-200 dark:bg-zinc-800",
                            )}
                          />
                        )}
                      </div>
                      <div
                        className={
                          isLast ? "absolute right-0 top-6 text-right" : undefined
                        }
                      >
                        <div className="whitespace-nowrap text-[12.5px] font-medium leading-[1.3] text-zinc-950 dark:text-zinc-50">
                          {step.label}
                        </div>
                        <div className="mt-px whitespace-nowrap text-[11.5px] font-normal leading-[1.3] text-zinc-400 dark:text-zinc-500">
                          {step.at ? fmtTz(step.at, tz, "hh:mm A") : done ? "—" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* The delivery trip itself: how far, and how long from placed to
                completed. Distance is the routed figure checkout already
                measured to price the delivery charge, stored on the order at
                placement — not re-routed each time this screen opens. */}
            {showTrip && (
              <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                {hasKm && (
                  <span className="flex items-center gap-1.5">
                    <Route size={13} strokeWidth={1.9} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
                    <span className="text-[12.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                      {formatKm(deliveryKm)}
                    </span>
                    <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
                      distance
                    </span>
                  </span>
                )}
                {totalMs != null && (
                  <span className="flex items-center gap-1.5">
                    <Timer size={13} strokeWidth={1.9} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
                    <span className="text-[12.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                      {formatElapsed(totalMs)}
                    </span>
                    <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
                      placed to delivered
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-start gap-3.5">
          {/* ---------------------------------------------- left column */}
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-3.5">
            {/* Measured against the right column's fixed cards — see leftShorter. */}
            <div ref={leftRef} className="flex flex-col gap-3.5">
            {/* Order items */}
            <div className={CARD}>
              <div className={CARD_HEAD}>
                <span className={cn(CARD_TITLE, "flex-[1_1_auto]")}>Order Items</span>
                <MetaPill>
                  {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </MetaPill>
              </div>

              <div className="flex flex-col gap-3 px-4 py-3.5">
                {order.items.map((item, i) => {
                  const freebie = (item as any).is_freebie;
                  const unit = freebie ? 0 : item.price;
                  return (
                    <div
                      key={`${item.id}-${i}`}
                      className="flex flex-wrap items-start gap-3 gap-y-1.5"
                    >
                      <div className="min-w-0 flex-[1_1_180px]">
                        <div
                          translate="no"
                          className="notranslate text-[13.5px] font-medium leading-[1.35] text-zinc-950 dark:text-zinc-50"
                        >
                          {item.name}
                          {freebie && (
                            <span className="ml-1 text-[11px] font-bold opacity-60">(FREE)</span>
                          )}
                        </div>
                        {/* The category, not the menu description. A dish's
                            description is written for a customer deciding what
                            to eat; on an order that is already placed it is
                            three lines of noise per row. The category is what
                            actually helps here — it groups the ticket the way
                            the kitchen does. */}
                        {categoryOf(item) && (
                          <div
                            translate="no"
                            className="notranslate mt-0.5 text-[12px] font-normal leading-[1.4] text-zinc-500 dark:text-zinc-400"
                          >
                            {categoryOf(item)}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-baseline gap-3">
                        <span className="text-[12.5px] font-normal tabular-nums text-zinc-500 dark:text-zinc-400">
                          {item.quantity} × {money(currency, unit, 2)}
                        </span>
                        <span className="min-w-[64px] text-right text-[13.5px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                          {money(currency, unit * item.quantity, 2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {order.items.length === 0 && (
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                    This order has no items.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                {charges.map((c, i) => (
                  <SummaryRow key={`charge-${i}`} label={c.name} value={money(currency, c.amount, 2)} />
                ))}
                {charges.length > 0 && (
                  <div className="my-0.5 h-px bg-zinc-200 dark:bg-zinc-700" />
                )}
                <SummaryRow label="Subtotal" value={money(currency, subtotal, 2)} strong />
                {discounts.map((discount, i) => {
                  const disc = discount as any;
                  const value = getDiscountAmount(disc, subtotal);
                  const label =
                    disc.type === "bxgy"
                      ? bxgyOrderLabel(disc)
                      : disc.type === "freebie"
                        ? `Freebie discount${disc.freebie_item_names ? ` (${disc.freebie_item_names})` : ""}`
                        : disc.type === "percentage"
                          ? `${disc.value}% off`
                          : "Flat discount";
                  return (
                    <SummaryRow
                      key={`discount-${i}`}
                      label={label}
                      value={`- ${money(currency, value, 2)}`}
                      tone="green"
                    />
                  );
                })}
                {gstAmount > 0 && (
                  <SummaryRow
                    label={`${taxLabel(partner?.country, (userData as any)?.delivery_rules)} (${gstPercentage}%)`}
                    value={money(currency, gstAmount, 2)}
                    strong
                  />
                )}
                {loyalty && loyalty.pointsRedeemed > 0 && (
                  <SummaryRow
                    label={`Loyalty points redeemed (${loyalty.pointsRedeemed} pts)`}
                    value={`- ${money(currency, loyalty.redeemValue, 2)}`}
                    tone="amber"
                  />
                )}
                <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-zinc-200 pt-2.5 dark:border-zinc-700">
                  <span className="text-[13.5px] font-semibold text-zinc-950 dark:text-zinc-50">
                    {loyalty && loyalty.pointsRedeemed > 0 ? "Balance payable" : "Total Amount"}
                  </span>
                  <span className="text-[18px] font-semibold tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50">
                    {money(currency, order.totalPrice, 2)}
                  </span>
                </div>
                {loyalty && (loyalty.pointsEarned ?? 0) > 0 && (
                  <p className="text-right text-[11.5px] text-green-700 dark:text-green-400">
                    Customer earned {loyalty.pointsEarned} loyalty points on this order
                  </p>
                )}
              </div>
            </div>

            </div>
            {leftShorter && secondaryCards}
          </div>

          {/* --------------------------------------------- right column */}
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
            {/* Delivery + Customer never move, so their combined height is a
                stable thing to measure the left column against. */}
            <div ref={rightFixedRef} className="flex flex-col gap-3.5">
            {/* Delivery — first in this column: while an order is out, the
                rider is what the partner is actually watching.

                Hidden entirely when there is neither a rider, a dispatch in
                flight, nor an assignment to make. A card whose whole content
                was "No rider assigned yet" occupied a slot and said nothing;
                the timeline above already shows the order has not been picked
                up. It comes back the moment there is something to show or do. */}
            {isDelivery && showDeliveryCard && (
              <div className={CARD}>
                <div className={CARD_HEAD}>
                  <span className={CARD_TITLE}>Delivery</span>
                  {(order.delivery_provider || features.porter_bridge.enabled) && (
                    <MetaPill className="capitalize">
                      {order.delivery_provider === "menuthere_pool"
                        ? "Delivery Pool"
                        : order.delivery_provider || "Porter & Rapido"}
                    </MetaPill>
                  )}
                  {order.delivery_provider_state && (
                    <DotPill
                      tone={
                        order.delivery_provider_state === "delivered"
                          ? "green"
                          : order.delivery_provider_state === "cancelled"
                            ? "red"
                            : "amber"
                      }
                      className="ml-auto capitalize"
                    >
                      {String(order.delivery_provider_state).replace(/_/g, " ")}
                    </DotPill>
                  )}
                </div>

                {rider ? (
                  <>
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                      <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        <Bike size={18} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-[1_1_160px]">
                        <div
                          translate="no"
                          className="notranslate text-[14px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                        >
                          {rider.name}
                        </div>
                        <div className="mt-0.5 text-[12.5px] font-normal capitalize text-zinc-500 dark:text-zinc-400">
                          {[rider.provider, rider.vehicleNumber].filter(Boolean).join(" · ") ||
                            "Delivery partner"}
                        </div>
                      </div>
                      {rider.phone && (
                        <div className="flex shrink-0 items-center gap-2">
                          <a href={`tel:${rider.phone}`} className={cn(CONTROL, "text-zinc-950 dark:text-zinc-50")}>
                            <Phone size={14} strokeWidth={1.8} />
                            <span className="tabular-nums">{rider.phone}</span>
                          </a>
                          {riderCopied ? (
                            <DotPill tone="green">Copied</DotPill>
                          ) : (
                            <button
                              type="button"
                              title="Copy rider number"
                              onClick={() => copyRider(rider.phone || "")}
                              className={cn(ICON_BTN, "h-8 w-8")}
                            >
                              <Copy size={13} strokeWidth={1.8} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 px-4 pb-3.5">
                      <MetaField label="Partner" value={rider.provider || "—"} mono={false} />
                      <MetaField label="Vehicle" value={rider.vehicleNumber || "—"} mono={false} />
                      <MetaField
                        label="Reference"
                        value={order.delivery_provider_order_id || meta.dispatchId || "—"}
                        mono
                      />
                      <MetaField
                        label={order.status === "completed" ? "Delivered at" : "Dispatched at"}
                        value={
                          fmtTz(
                            order.status === "completed"
                              ? (history.completed?.completedAt ?? null)
                              : (history.dispatched?.completedAt ?? null),
                            tz,
                            "hh:mm A",
                          ) || "—"
                        }
                        mono={false}
                      />
                    </div>
                  </>
                ) : (
                  <p className="px-4 py-3.5 text-[13px] text-zinc-500 dark:text-zinc-400">
                    No rider assigned yet. Rider details appear here once a delivery partner
                    accepts this order.
                  </p>
                )}

                {/* Own riders report to our heartbeat hub, so where they are
                    can be shown directly. A Porter/Rapido rider is tracked
                    through that provider's link instead — see Track rider. */}
                {isOwnRider && <LiveRiderMap order={order} partner={partner} />}

                {/* Live controls for the booking. Track and Cancel appear only
                    while there is something live to track or stand down; the
                    history is there whenever anything has ever been booked. */}
                {(canTrack || canCancelRider || canAssignOwnRider || bookings.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                    {canAssignOwnRider && (
                      <RiderPicker
                        order={order}
                        partner={partner}
                        trigger={
                          <AdminV3Button variant="small">
                            <UserPlus className="h-3.5 w-3.5" />
                            {rider ? "Change rider" : "Assign rider"}
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </AdminV3Button>
                        }
                      />
                    )}
                    {canTrack && (
                      <a
                        href={trackHref || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <MapPin size={13} strokeWidth={1.9} />
                        Track rider
                        <ExternalLink size={12} strokeWidth={1.9} />
                      </a>
                    )}
                    {bookings.length > 0 && (
                      <AdminV3Button
                        variant="small"
                        onClick={() => setHistoryOpen(true)}
                      >
                        <History className="h-3.5 w-3.5" />
                        View booking history
                        <span className="text-zinc-400 dark:text-zinc-500">
                          ({bookings.length})
                        </span>
                      </AdminV3Button>
                    )}
                    {canCancelRider && (
                      <button
                        type="button"
                        onClick={() => void cancelRider()}
                        disabled={cancellingRider}
                        className="ml-auto inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] font-medium leading-none text-zinc-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
                      >
                        <XCircle size={13} strokeWidth={1.9} />
                        {cancellingRider ? "Cancelling…" : "Cancel rider"}
                      </button>
                    )}
                  </div>
                )}

                {(meta.pickupPin || meta.dropPin || meta.pickupOtp) &&
                  order.status !== "completed" &&
                  order.status !== "cancelled" && (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 px-4 pb-3.5">
                      {(meta.pickupPin || meta.pickupOtp) && (
                        <MetaField
                          label="Pickup OTP"
                          value={String(meta.pickupPin || meta.pickupOtp)}
                          mono
                        />
                      )}
                      {meta.dropPin && <MetaField label="Drop OTP" value={String(meta.dropPin)} mono />}
                    </div>
                  )}

                {canBookRider && (
                  <div className="flex flex-wrap items-center gap-3 gap-y-2.5 rounded-b-[10px] border-t border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="min-w-0 flex-[1_1_200px]">
                      <div className="text-[12.5px] font-medium text-zinc-950 dark:text-zinc-50">
                        {rider ? "Book another rider" : "Book a rider"}
                      </div>
                      <div className="mt-0.5 text-[12px] font-normal leading-[1.5] text-zinc-500 dark:text-zinc-400">
                        Dispatch again through the bridge — use if the rider cancelled or none
                        was found.
                      </div>
                    </div>
                    {booked ? (
                      <DotPill tone="amber">Dispatch requested</DotPill>
                    ) : (
                      <button
                        type="button"
                        className={CONTROL}
                        disabled={booking}
                        onClick={bookRider}
                      >
                        <Bike size={14} strokeWidth={1.8} />
                        {booking ? "Booking…" : "Book again"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Customer */}
            <div className={CARD}>
              <div className={CARD_HEAD}>
                <span className={cn(CARD_TITLE, "flex-[1_1_auto]")}>Customer</span>
                <MetaPill>{getOrderTypeLabel(order)}</MetaPill>
                {order.order_channel && (
                  <MetaPill
                    className={
                      order.order_channel === "whatsapp" || order.order_channel === "app"
                        ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                        : undefined
                    }
                  >
                    {order.order_channel === "app"
                      ? "App"
                      : order.order_channel === "whatsapp"
                        ? "WhatsApp"
                        : "Web"}
                  </MetaPill>
                )}
              </div>

              <div className="flex items-center gap-[11px] px-4 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[12.5px] font-semibold text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
                  {initialsOf(customerName || customerPhone)}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    translate="no"
                    className="notranslate truncate text-[14px] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                  >
                    {customerName || "Walk-in customer"}
                  </div>
                  <div className="mt-px text-[12.5px] font-normal tabular-nums text-zinc-500 dark:text-zinc-400">
                    {customerPhone || "No phone recorded"}
                  </div>
                </div>
              </div>

              {customerPhone && (
                <div className="flex flex-wrap gap-2 px-4 pb-3.5">
                  <a
                    href={`tel:${customerPhone}`}
                    className={cn(CONTROL, "flex-[1_1_120px] px-0")}
                  >
                    <Phone size={14} strokeWidth={1.8} />
                    Call
                  </a>
                  <a
                    href={whatsappHref(customerPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[34px] flex-[1_1_120px] items-center justify-center gap-[7px] rounded-md border border-green-200 bg-white text-[13px] font-medium leading-none text-green-700 transition-colors hover:bg-green-50 dark:border-green-900 dark:bg-zinc-800 dark:text-green-400 dark:hover:bg-green-950"
                  >
                    <MessageCircle size={14} strokeWidth={1.8} />
                    WhatsApp
                  </a>
                </div>
              )}

              {(order.deliveryAddress || coords) && (
                <div className="border-t border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
                  <div className={FIELD_LABEL}>Delivery address</div>
                  <div
                    translate="no"
                    className="notranslate mt-1.5 text-[13px] font-normal leading-[1.55] text-zinc-700 dark:text-zinc-300"
                  >
                    {order.deliveryAddress || "No address text — map pin only"}
                  </div>
                  <div className="mt-[11px] flex flex-wrap items-center gap-2">
                    {coords && (
                      <a
                        href={`https://www.google.com/maps?q=${coords[1]},${coords[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
                      >
                        <MapPin size={14} strokeWidth={1.8} />
                        View on Google Maps
                        <ExternalLink size={12} strokeWidth={1.8} className="text-zinc-400" />
                      </a>
                    )}
                    {addrCopied ? (
                      <DotPill tone="green" className="ml-auto">
                        Copied
                      </DotPill>
                    ) : (
                      <button
                        type="button"
                        onClick={() => copyAddr(order.deliveryAddress || "")}
                        className="ml-auto inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-transparent px-2.5 text-[12.5px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <Copy size={12} strokeWidth={1.8} />
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              )}

              {order.notes && (
                <div className="border-t border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
                  <div className={FIELD_LABEL}>Order note</div>
                  <p
                    translate="no"
                    className="notranslate mt-1.5 text-[13px] leading-[1.55] text-zinc-700 dark:text-zinc-300"
                  >
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
            </div>
            {!leftShorter && secondaryCards}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * An order item's category, however it arrived.
 *
 * The mappers are not consistent: one carries `menu.category` as the whole
 * object, another flattens it to `category.name`, and older rows can hold a
 * bare string. Read all three rather than picking one and having the label
 * silently vanish for orders that came through a different path.
 *
 * Names are stored lowercase_underscore, so they get the same formatting the
 * menu screens use.
 */
function categoryOf(item: unknown): string {
  const c = (item as { category?: unknown })?.category;
  const raw =
    typeof c === "string"
      ? c
      : typeof (c as { name?: unknown })?.name === "string"
        ? ((c as { name: string }).name)
        : "";
  return raw ? formatDisplayName(raw) : "";
}

/* ------------------------------------------------------------------ bits */

function SummaryRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "green" | "amber";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={cn(
          "text-[12.5px]",
          strong
            ? "font-medium text-zinc-700 dark:text-zinc-300"
            : "font-normal text-zinc-500 dark:text-zinc-400",
          tone === "green" && "text-green-700 dark:text-green-400",
          tone === "amber" && "text-amber-700 dark:text-amber-400",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-[12.5px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50",
          tone === "green" && "text-green-700 dark:text-green-400",
          tone === "amber" && "text-amber-700 dark:text-amber-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function MetaField({ label, value, mono }: { label: string; value: string; mono: boolean }) {
  return (
    <div className="min-w-0">
      <div className={FIELD_LABEL}>{label}</div>
      <div
        translate="no"
        className={cn(
          "notranslate mt-1 text-zinc-950 dark:text-zinc-50",
          mono
            ? "break-all font-mono text-[12.5px] font-medium text-zinc-700 dark:text-zinc-300"
            : "text-[13px] font-medium",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3 py-[9px]">
        <span className="shrink-0 text-[12.5px] font-normal text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <span className="min-w-0 text-right text-[12.5px] font-medium text-zinc-950 dark:text-zinc-50">
          {value}
        </span>
      </div>
      {!last && <div className="h-px bg-zinc-100 dark:bg-zinc-800" />}
    </>
  );
}

/**
 * Which transitions the dropdown offers. Mirrors admin-v2: a completed order
 * under the lock can only be cancelled. The parent re-checks before mutating —
 * this only decides what is worth showing.
 */
function statusOptionsFor(current: string, canEdit: boolean) {
  if (!canEdit && current === "completed") {
    return [
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ];
  }
  return [
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "food_ready", label: "Food Ready" },
    { value: "dispatched", label: "Dispatched" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];
}

/** Human label for who cancelled — same mapping admin-v2's OrderDetails uses. */
function cancelledByLabel(by?: string | null): string {
  switch (by) {
    case "customer":
    case "user":
      return "Customer";
    case "partner-cravings":
    case "partner":
      return "Admin";
    case "partner-petpooja":
      return "Petpooja";
    default:
      return by || "Unknown";
  }
}
