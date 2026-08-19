"use client";

import * as React from "react";
import { ArrowLeft, Loader2, MessageCircle, Phone } from "lucide-react";

import { getCustomerLoyaltyForPartner } from "@/app/actions/loyalty";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  loyaltyTxnLabel,
  type LoyaltyMemberView,
  type LoyaltyTxnView,
} from "@/lib/loyalty/config";
import { cn } from "@/lib/utils";

import { StatusPill, V3Card } from "../ui/primitives";

/**
 * Everything the restaurant knows about one customer.
 *
 * The list screen already holds the aggregates, but not the per-order detail —
 * items, status, order number — so those are fetched here for the ONE customer
 * rather than loaded for every customer up front.
 *
 * Matched on the last 9 digits of the phone, the same key the list groups by:
 * an order taken at the counter and a WhatsApp message from the same person
 * differ by a country code, and matching in full would split them in two.
 */

const ORDERS_BY_PHONE = `
  query CustomerOrders($partner_id: uuid!, $phones: [String!]!) {
    orders(
      where: {
        partner_id: { _eq: $partner_id }
        status: { _neq: "cancelled" }
        phone: { _in: $phones }
      }
      order_by: { created_at: desc }
      limit: 100
    ) {
      id
      display_id
      created_at
      total_price
      type
      status
      order_channel
      payment_method
      delivery_address
      discounts
      order_items {
        quantity
        item
      }
    }
  }
`;

interface DetailOrder {
  id: string;
  display_id: string | null;
  created_at: string;
  total_price: number;
  type: string | null;
  status: string | null;
  order_channel: string | null;
  payment_method: string | null;
  delivery_address: string | null;
  discounts: unknown;
  order_items: { quantity: number; item: any }[];
}

const LABEL =
  "text-[11px] font-medium uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500";
const STAT =
  "mt-1.5 text-[19px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50";
const CARD_TITLE =
  "text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50";
const ROW_LABEL = "text-[12.5px] leading-none text-zinc-400 dark:text-zinc-500";
const ROW_VALUE =
  "text-[12.5px] font-medium leading-snug text-zinc-950 dark:text-zinc-50";

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TYPE_LABEL: Record<string, string> = {
  delivery: "Delivery",
  takeaway: "Takeaway",
  dine_in: "Dine-in",
  pos: "POS",
};

/** "8:12 PM" style, in the partner's timezone. */
const fmtTime = (iso: string, tz: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: tz });
};

const fmtDate = (iso: string, tz: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: tz,
      });
};

export function CustomerDetail({
  customer,
  partnerId,
  currency,
  tz,
  onBack,
}: {
  customer: {
    phone: string;
    name: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderAt: number;
    discountedOrders: number;
    segment: string;
    /** Absent for WhatsApp-only leads, who have no loyalty account. */
    userId?: string;
  };
  partnerId: string;
  currency: string;
  tz: string;
  onBack: () => void;
}) {
  const [orders, setOrders] = React.useState<DetailOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loyalty, setLoyalty] = React.useState<{
    member: LoyaltyMemberView | null;
    history: LoyaltyTxnView[];
  } | null>(null);

  const money = (n: number) =>
    `${currency}${Math.round(n).toLocaleString("en-IN")}`;

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      // The stored phone may or may not carry a country code, so ask for both
      // shapes rather than assuming which one this partner's orders use.
      const digits = customer.phone.replace(/\D/g, "");
      const tail = digits.slice(-10);
      const phones = Array.from(
        new Set([customer.phone, digits, tail, `+91${tail}`, `91${tail}`].filter(Boolean)),
      );
      try {
        const res = await fetchFromHasura(ORDERS_BY_PHONE, {
          partner_id: partnerId,
          phones,
        });
        if (alive) setOrders(res?.orders ?? []);
      } catch (e) {
        console.error("[v3 customer] orders failed:", e);
        if (alive) setOrders([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [customer.phone, partnerId]);

  // Loyalty hangs off the user id, which only exists once an order was placed
  // while signed in — so it is fetched separately and simply absent otherwise.
  React.useEffect(() => {
    let alive = true;
    const userId = customer.userId;
    if (!userId) return;
    getCustomerLoyaltyForPartner(userId, partnerId)
      .then((r) => alive && setLoyalty(r))
      .catch(() => alive && setLoyalty(null));
    return () => {
      alive = false;
    };
  }, [customer.userId, partnerId]);

  /** Item name → times ordered, most frequent first. */
  const favourites = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders) {
      for (const oi of o.order_items ?? []) {
        const name = oi?.item?.name;
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + (oi.quantity || 1));
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [orders]);

  const maxFav = favourites[0]?.[1] ?? 1;

  /** The mode of a field across their orders — "usually delivery", etc. */
  const commonest = (pick: (o: DetailOrder) => string | null | undefined) => {
    const counts = new Map<string, number>();
    for (const o of orders) {
      const v = pick(o);
      if (!v) continue;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };

  const usualType = commonest((o) => o.type);
  const usualChannel = commonest((o) => o.order_channel);
  const usualPayment = commonest((o) => o.payment_method);
  const lastAddress = orders.find((o) => o.delivery_address)?.delivery_address ?? null;

  /** Evening / afternoon band they tend to order in. */
  const usualHours = React.useMemo(() => {
    if (orders.length === 0) return null;
    const hours = orders
      .map((o) => {
        const d = new Date(o.created_at);
        if (isNaN(d.getTime())) return null;
        return Number(
          new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz })
            .format(d),
        );
      })
      .filter((h): h is number => h != null && !isNaN(h));
    if (hours.length === 0) return null;
    const lo = Math.min(...hours);
    const hi = Math.max(...hours);
    const band = lo < 12 ? "Mornings" : lo < 16 ? "Afternoons" : lo < 21 ? "Evenings" : "Late night";
    const f = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? " AM" : " PM"}`;
    return lo === hi ? `${band}, around ${f(lo)}` : `${band}, ${f(lo)}–${f(hi + 1)}`;
  }, [orders, tz]);

  /**
   * Totals come from the orders THIS page loaded, not from the list row.
   *
   * The list keys customers on `user_id || phone`, so one person split across a
   * guest checkout and a signed-in one becomes several rows, each counting only
   * its own orders. This page matches on the phone, which finds all of them —
   * so trusting the row's count printed "Orders 1" above a list of four.
   *
   * The row is still used until the fetch lands, so the strip is never blank.
   */
  const totals = React.useMemo(() => {
    if (loading || orders.length === 0) {
      return {
        count: customer.totalOrders,
        spend: customer.totalSpent,
        avg: customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0,
      };
    }
    const spend = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    return { count: orders.length, spend, avg: spend / orders.length };
  }, [loading, orders, customer.totalOrders, customer.totalSpent]);

  /**
   * Orders per month — only once there is enough history to mean anything.
   *
   * Four orders in nine days is not "4.0 a month"; dividing by a clamped
   * minimum of one month turns a busy week into a confident-looking rate. Below
   * a month of history the honest answer is that we do not know yet.
   */
  const perMonth = React.useMemo(() => {
    if (orders.length === 0) return null;
    const first = new Date(orders[orders.length - 1].created_at).getTime();
    const days = (Date.now() - first) / 86400000;
    if (days < 30) return null;
    return (orders.length / (days / 30.44)).toFixed(1);
  }, [orders]);

  const firstOrder = orders[orders.length - 1]?.created_at;
  const lastOrder = orders[0]?.created_at;

  const lastRelative = React.useMemo(() => {
    if (!lastOrder) return "—";
    const days = Math.floor((Date.now() - new Date(lastOrder).getTime()) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days} days ago`;
    return fmtDate(lastOrder, tz);
  }, [lastOrder, tz]);

  const telHref = `tel:${customer.phone}`;
  const waHref = `https://wa.me/${customer.phone.replace(/\D/g, "")}`;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to customers"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>
        <div
          translate="no"
          className="notranslate flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[12px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {initials(customer.name)}
        </div>
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              translate="no"
              className="notranslate truncate text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50"
            >
              {customer.name || "Guest"}
            </span>
            <StatusPill tone={totals.count > 1 ? "blue" : "outline"}>
              {totals.count > 1 ? "Repeat" : "First order"}
            </StatusPill>
          </div>
          <div
            translate="no"
            className="notranslate mt-0.5 truncate text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400"
          >
            {customer.phone}
            {firstOrder
              ? ` · first ordered ${new Date(firstOrder).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                  timeZone: tz,
                })}`
              : ""}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <a
            href={telHref}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-md border border-green-200 bg-white px-3 text-[13px] font-medium text-green-700 transition-colors hover:bg-green-50 dark:border-green-900 dark:bg-zinc-800 dark:text-green-400 dark:hover:bg-green-950"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Message
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {/* Summary strip */}
        <V3Card className="flex flex-wrap items-start gap-x-[38px] gap-y-4 px-4 py-4">
          <div>
            <div className={LABEL}>Orders</div>
            <div className={cn(STAT, "flex items-baseline gap-1.5")}>
              {totals.count}
              {totals.count > 1 ? (
                <span className="text-[12px] font-normal text-zinc-400 dark:text-zinc-500">
                  came back {totals.count - 1}×
                </span>
              ) : null}
            </div>
          </div>
          <div className="hidden w-px self-stretch bg-zinc-100 sm:block dark:bg-zinc-800" />
          <div>
            <div className={LABEL}>Lifetime spend</div>
            <div className={STAT}>{money(totals.spend)}</div>
          </div>
          <div>
            <div className={LABEL}>Average order</div>
            <div className={STAT}>{money(totals.avg)}</div>
          </div>
          <div>
            <div className={LABEL}>Orders a month</div>
            <div className={cn(STAT, "flex items-baseline gap-1.5")}>
              {perMonth ?? "—"}
              {!perMonth && !loading && orders.length > 0 ? (
                <span className="text-[12px] font-normal text-zinc-400 dark:text-zinc-500">
                  under a month of history
                </span>
              ) : null}
            </div>
          </div>
          <div>
            <div className={LABEL}>Last order</div>
            <div className={cn(STAT, "flex items-baseline gap-1.5")}>
              {lastRelative}
              {lastOrder ? (
                <span className="text-[12px] font-normal text-zinc-400 dark:text-zinc-500">
                  {fmtDate(lastOrder, tz)}
                </span>
              ) : null}
            </div>
          </div>
        </V3Card>

        <div className="flex flex-wrap items-start gap-3.5">
          {/* Left column */}
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5">
            <V3Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
                <span className={CARD_TITLE}>Order history</span>
                <StatusPill tone="neutral" className="ml-auto">
                  {orders.length} order{orders.length === 1 ? "" : "s"}
                </StatusPill>
              </div>

              {loading ? (
                <div className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-[18px] w-[18px] animate-spin text-zinc-400 dark:text-zinc-500" />
                </div>
              ) : orders.length === 0 ? (
                <div className="px-4 py-12 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
                  No orders on record for this number.
                </div>
              ) : (
                orders.map((o) => (
                  <div
                    key={o.id}
                    className="border-b border-zinc-100 px-4 py-3 last:border-b-0 dark:border-zinc-800"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                        #{o.display_id || o.id.slice(0, 6)}
                      </span>
                      <StatusPill tone="outline">
                        {TYPE_LABEL[o.type || ""] || o.type || "Order"}
                      </StatusPill>
                      {o.status ? (
                        <StatusPill tone={o.status === "completed" ? "green" : "amber"}>
                          {o.status.replace(/_/g, " ")}
                        </StatusPill>
                      ) : null}
                      <span className="ml-auto text-[13px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                        {money(o.total_price)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span
                        translate="no"
                        className="notranslate min-w-0 flex-1 truncate text-[12.5px] text-zinc-500 dark:text-zinc-400"
                      >
                        {(o.order_items ?? [])
                          .map((oi) => oi?.item?.name)
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-zinc-400 dark:text-zinc-500">
                        {fmtDate(o.created_at, tz)} · {fmtTime(o.created_at, tz)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </V3Card>

            {loyalty?.member ? (
              <V3Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
                  <span className={CARD_TITLE}>Loyalty</span>
                </div>
                <div className="flex flex-wrap items-start gap-x-[38px] gap-y-4 px-4 py-4">
                  <div>
                    <div className={LABEL}>Balance</div>
                    <div className={cn(STAT, "flex items-baseline gap-1.5")}>
                      {loyalty.member.balance}
                      <span className="text-[12px] font-normal text-zinc-400 dark:text-zinc-500">
                        points
                      </span>
                    </div>
                  </div>
                  <div className="hidden w-px self-stretch bg-zinc-100 sm:block dark:bg-zinc-800" />
                  <div>
                    <div className={LABEL}>Earned</div>
                    <div className={STAT}>{loyalty.member.lifetimeEarned}</div>
                  </div>
                  <div>
                    <div className={LABEL}>Redeemed</div>
                    <div className={STAT}>{loyalty.member.lifetimeRedeemed}</div>
                  </div>
                </div>
                {loyalty.history.length > 0 ? (
                  <div className="border-t border-zinc-100 dark:border-zinc-800">
                    {loyalty.history.slice(0, 6).map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-2.5 last:border-b-0 dark:border-zinc-800"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
                            {loyaltyTxnLabel(t.type)}
                          </div>
                          <div className="mt-1 text-[12px] leading-none text-zinc-400 dark:text-zinc-500">
                            {fmtDate(t.createdAt, tz)}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-[12.5px] font-semibold tabular-nums",
                            t.delta >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-zinc-500 dark:text-zinc-400",
                          )}
                        >
                          {t.delta >= 0 ? "+" : ""}
                          {t.delta} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </V3Card>
            ) : null}
          </div>

          {/* Right column */}
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
            <V3Card className="overflow-hidden">
              <div className="border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
                <span className={CARD_TITLE}>What they order</span>
              </div>
              {favourites.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
                  {loading ? "…" : "Nothing on record yet."}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 px-4 py-3.5">
                    {favourites.map(([name, count]) => (
                      <div key={name}>
                        <div className="flex items-baseline gap-2">
                          <span
                            translate="no"
                            className="notranslate min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-950 dark:text-zinc-50"
                          >
                            {name}
                          </span>
                          <span className="shrink-0 text-[12px] tabular-nums text-zinc-400 dark:text-zinc-500">
                            {count}×
                          </span>
                        </div>
                        <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                            style={{ width: `${Math.max(6, (count / maxFav) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {favourites[0] ? (
                    <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3 text-[12px] leading-[1.5] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                      {perMonth ? `Orders about ${perMonth}× a month, usually ` : "Usually orders "}
                      <span translate="no" className="notranslate">
                        {favourites[0][0]}
                      </span>
                      .
                    </div>
                  ) : null}
                </>
              )}
            </V3Card>

            <V3Card className="overflow-hidden">
              <div className="border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
                <span className={CARD_TITLE}>Details</span>
              </div>
              <div className="px-4 py-1.5">
                {[
                  ["Usual order type", usualType ? TYPE_LABEL[usualType] || usualType : "—"],
                  ["Usual time", usualHours ?? "—"],
                  ["Pays with", usualPayment ? usualPayment.replace(/_/g, " ") : "—"],
                  ["Ordered through", usualChannel ? usualChannel.replace(/_/g, " ") : "—"],
                  ["Address", lastAddress ?? "—"],
                  [
                    "Discounts used",
                    customer.discountedOrders > 0
                      ? `${customer.discountedOrders} of ${totals.count} orders`
                      : "None yet",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-zinc-100 py-2.5 last:border-b-0 dark:border-zinc-800"
                  >
                    <span className={ROW_LABEL}>{label}</span>
                    <span
                      translate="no"
                      className={cn(ROW_VALUE, "notranslate min-w-0 max-w-[62%] text-right capitalize")}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </V3Card>
          </div>
        </div>
      </div>
    </div>
  );
}
