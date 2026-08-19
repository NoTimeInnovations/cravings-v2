"use client";

import * as React from "react";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  Search,
  ShoppingBag,
  Star,
  X,
} from "lucide-react";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerReviewsQuery } from "@/api/reviews";
import { useAuthStore, type Partner } from "@/store/authStore";
import { safeTz } from "@/lib/partnerTime";
import { cn } from "@/lib/utils";
import { AdminV3Button, StatusPill, V3Card } from "./ui/primitives";

/**
 * admin-v3 Reviews.
 *
 * Same data path as admin-v2: one `getPartnerReviewsQuery` fetch keyed on the
 * partner id, which already nests the user and the whole order (items, charges,
 * address). Nothing else is queried, so the detail view is a pure client-side
 * drill-down into a row we already hold — no second round-trip, and back/forward
 * between list and detail is instant.
 *
 * Reviews are read-only for the partner: there is no reply/moderation table in
 * Hasura, so this screen never pretends one exists.
 */

/* ------------------------------------------------------------------- types */

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  photo_urls: string[] | null;
  created_at: string;
  order_id: string | null;
  user: {
    full_name: string | null;
    phone: string | null;
    email?: string | null;
  } | null;
  order: {
    id: string;
    display_id: string | null;
    type: string | null;
    status: string | null;
    is_paid: boolean | null;
    total_price: number | null;
    created_at: string;
    delivery_address: string | null;
    notes: string | null;
    table_number: number | null;
    phone: string | null;
    gst_included: number | null;
    extra_charges:
      | { name?: string; amount?: number; charge_type?: string }[]
      | null;
    discounts:
      | { code?: string; value?: number; type?: string; savings?: number }[]
      | null;
    order_items: { id: string; quantity: number; item: any }[] | null;
  } | null;
}

type Filter = "all" | "five" | "low" | "comment";

/* ------------------------------------------------------------------ helpers */

function initialsOf(name: string | null | undefined): string {
  const clean = (name || "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function orderLabel(order: ReviewRow["order"]): string {
  if (!order) return "—";
  return `#${order.display_id || order.id.slice(0, 8)}`;
}

function orderTypeLabel(type: string | null | undefined): string {
  if (type === "delivery") return "Delivery / Takeaway";
  if (type === "table_order") return "Dine-in";
  return type || "—";
}

function waPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const p = raw.replace(/\s+/g, "");
  if (/^\+/.test(p)) return p.replace("+", "");
  if (/^\d{10}$/.test(p)) return `91${p}`;
  const digits = p.replace(/[^\d]/g, "");
  return digits || null;
}

/** Format an instant in the PARTNER's timezone, never the browser's. */
function fmt(iso: string, tz: string, withTime = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  if (!withTime) return date;
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${date} · ${time}`;
}

function money(currency: string, n: number): string {
  return `${currency}${n.toFixed(2)}`;
}

/* -------------------------------------------------------------------- stars */

function Stars({
  value,
  size = 15,
}: {
  value: number;
  size?: number;
}) {
  return (
    <span className="inline-flex flex-none items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          strokeWidth={0}
          className={cn(
            "flex-none",
            n <= value
              ? "fill-amber-500 text-amber-500"
              : "fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700",
          )}
        />
      ))}
    </span>
  );
}

/* ---------------------------------------------------------------- filter tab */

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-[34px] flex-none items-center justify-center whitespace-nowrap rounded-md border px-3 text-[13px] font-medium leading-none transition-colors",
        active
          ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
      )}
    >
      {children}
    </button>
  );
}

/* ==================================================================== screen */

export function AdminV3Reviews() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | null;
  const currency = partner?.currency || "₹";
  const tz = safeTz((partner as any)?.timezone);

  const [reviews, setReviews] = React.useState<ReviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!partner?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFromHasura(getPartnerReviewsQuery, { partner_id: partner.id })
      .then((res: any) => {
        if (cancelled) return;
        setReviews((res?.reviews ?? []) as ReviewRow[]);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load reviews", err);
        setError("Couldn't load reviews. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partner?.id]);

  /* ---- summary: average, per-star histogram, comment share, last 30 days --- */
  const summary = React.useMemo(() => {
    const count = reviews.length;
    const sum = reviews.reduce((a, r) => a + (r.rating || 0), 0);
    const buckets = [5, 4, 3, 2, 1].map((star) => ({
      star,
      n: reviews.filter((r) => Math.round(r.rating) === star).length,
    }));
    const withComment = reviews.filter((r) => (r.comment || "").trim()).length;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const last30 = reviews.filter(
      (r) => new Date(r.created_at).getTime() >= cutoff,
    ).length;
    return {
      count,
      avg: count ? sum / count : 0,
      buckets,
      withComment,
      last30,
      max: Math.max(1, ...buckets.map((b) => b.n)),
    };
  }, [reviews]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filter === "five" && Math.round(r.rating) !== 5) return false;
      if (filter === "low" && Math.round(r.rating) > 4) return false;
      if (filter === "comment" && !(r.comment || "").trim()) return false;
      if (!q) return true;
      const hay = [
        r.user?.full_name,
        r.user?.phone,
        r.user?.email,
        r.order?.display_id,
        r.order?.id,
        r.comment,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [reviews, filter, query]);

  const selected = React.useMemo(
    () => reviews.find((r) => r.id === selectedId) ?? null,
    [reviews, selectedId],
  );

  if (selected) {
    return (
      <ReviewDetailView
        review={selected}
        all={reviews}
        currency={currency}
        tz={tz}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const heading =
    filter === "five"
      ? "5-star reviews"
      : filter === "low"
        ? "4 stars & below"
        : filter === "comment"
          ? "Reviews with a comment"
          : "All reviews";

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* ------------------------------------------------------ summary card */}
      <V3Card className="flex flex-wrap items-center gap-x-5 gap-y-4 p-4">
        <div className="flex min-w-[118px] flex-none flex-col gap-[5px]">
          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
              {summary.count ? summary.avg.toFixed(1) : "—"}
            </span>
            <span className="text-[13px] text-zinc-400 dark:text-zinc-500">
              / 5
            </span>
          </div>
          <Stars value={Math.round(summary.avg)} />
          <div className="text-[12.5px] leading-normal text-zinc-500 dark:text-zinc-400">
            {summary.count === 1
              ? "1 review all time"
              : `${summary.count} reviews all time`}
          </div>
        </div>

        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
          {summary.buckets.map((b) => (
            <div key={b.star} className="flex items-center gap-[9px]">
              <span className="inline-flex min-w-[26px] flex-none items-center gap-[3px] text-xs font-medium leading-none text-zinc-600 dark:text-zinc-300">
                {b.star}
                <Star
                  width={11}
                  height={11}
                  strokeWidth={0}
                  className="flex-none fill-amber-500 text-amber-500"
                />
              </span>
              <span className="h-1.5 min-w-[40px] flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <span
                  className="block h-full rounded-full bg-amber-500 transition-[width] duration-300"
                  style={{
                    width: `${summary.count ? (b.n / summary.max) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="min-w-[14px] flex-none text-right text-xs font-medium leading-none tabular-nums text-zinc-500 dark:text-zinc-400">
                {b.n}
              </span>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-[1_1_190px] flex-wrap gap-2.5">
          <MiniStat
            label="With comment"
            value={summary.withComment}
            sub={`of ${summary.count}`}
          />
          <MiniStat
            label="Last 30 days"
            value={summary.last30}
            sub={summary.last30 === 1 ? "review" : "reviews"}
          />
        </div>
      </V3Card>

      {/* ---------------------------------------------------- filters + search */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5 px-3.5 lg:px-0">
        <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterTab>
        <FilterTab active={filter === "five"} onClick={() => setFilter("five")}>
          5 stars
        </FilterTab>
        <FilterTab active={filter === "low"} onClick={() => setFilter("low")}>
          4 stars &amp; below
        </FilterTab>
        <FilterTab
          active={filter === "comment"}
          onClick={() => setFilter("comment")}
        >
          With comment
        </FilterTab>

        <div className="ml-auto flex h-[34px] min-w-0 max-w-[280px] flex-[1_1_190px] items-center gap-[9px] rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
          <Search
            size={15}
            strokeWidth={1.8}
            className="flex-none text-zinc-400 dark:text-zinc-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or order…"
            aria-label="Search reviews"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] leading-none text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- list */}
      <V3Card>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
          <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            {heading}
          </span>
          <StatusPill tone="outline">Newest first</StatusPill>
        </div>

        {loading ? (
          <div className="flex justify-center px-5 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400 dark:text-zinc-500" />
          </div>
        ) : error ? (
          <div className="px-5 py-12 text-center text-[13.5px] text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-[7px] px-5 py-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <Star
                size={20}
                strokeWidth={1.6}
                className="text-zinc-300 dark:text-zinc-600"
              />
            </div>
            <div className="text-[13.5px] font-medium leading-normal text-zinc-700 dark:text-zinc-300">
              {reviews.length === 0
                ? "No reviews yet"
                : "No reviews match this filter"}
            </div>
            <div className="text-[12.5px] leading-normal text-zinc-400 dark:text-zinc-500">
              {reviews.length === 0
                ? "Reviews appear once customers rate a completed order."
                : "Try All to see every review."}
            </div>
          </div>
        ) : (
          visible.map((r) => (
            <ReviewRowItem
              key={r.id}
              review={r}
              tz={tz}
              onOpen={() => setSelectedId(r.id)}
            />
          ))
        )}

        <div className="flex flex-wrap items-center gap-2.5 rounded-b-none bg-zinc-50 px-4 py-3 dark:bg-zinc-950/40 lg:rounded-b-xl">
          <span className="text-[12.5px] leading-normal text-zinc-500 dark:text-zinc-400">
            {loading
              ? "Loading…"
              : `Showing ${visible.length} of ${reviews.length} ${
                  reviews.length === 1 ? "review" : "reviews"
                }`}
          </span>
          <span className="ml-auto text-xs leading-normal text-zinc-400 dark:text-zinc-500">
            Reviews arrive after an order is completed.
          </span>
        </div>
      </V3Card>
    </div>
  );
}

/* ------------------------------------------------------------------ mini stat */

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="flex-[1_1_84px] rounded-lg border border-zinc-200 px-3 py-[11px] dark:border-zinc-800">
      <div className="text-[11px] font-semibold uppercase leading-normal tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-[19px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
        {value}
        {sub ? (
          <span className="ml-[3px] text-[12.5px] font-normal text-zinc-400 dark:text-zinc-500">
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ list row */

function ReviewRowItem({
  review,
  tz,
  onOpen,
}: {
  review: ReviewRow;
  tz: string;
  onOpen: () => void;
}) {
  const name = review.user?.full_name || "Customer";
  const comment = (review.comment || "").trim();
  const photos = Array.isArray(review.photo_urls) ? review.photo_urls : [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer flex-wrap items-start gap-x-3 gap-y-2.5 border-b border-zinc-100 px-4 py-3.5 transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:border-zinc-800 dark:hover:bg-zinc-800/50 dark:focus-visible:bg-zinc-800/50"
    >
      <div
        className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-xs font-semibold leading-none text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        translate="no"
      >
        {initialsOf(name)}
      </div>

      <div className="min-w-0 flex-[1_1_240px]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
            translate="no"
          >
            {name}
          </span>
          <span className="inline-flex flex-none items-center gap-[5px]">
            <Stars value={Math.round(review.rating)} size={13} />
            <span className="text-xs font-medium leading-none text-zinc-500 dark:text-zinc-400">
              {review.rating}
            </span>
          </span>
        </div>

        <div
          className={cn(
            "mt-[5px] text-[13px] leading-normal",
            comment
              ? "text-zinc-700 dark:text-zinc-300"
              : "italic text-zinc-400 dark:text-zinc-500",
          )}
          translate={comment ? "no" : undefined}
        >
          {comment || "No comment left"}
        </div>

        {photos.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            {photos.slice(0, 3).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                className="h-9 w-9 rounded-md border border-zinc-200 object-cover dark:border-zinc-700"
              />
            ))}
            {photos.length > 3 && (
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                +{photos.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <StatusPill tone="outline">
            <span translate="no">Order {orderLabel(review.order)}</span>
          </StatusPill>
          <span className="text-xs leading-normal text-zinc-400 dark:text-zinc-500">
            {fmt(review.created_at, tz)}
          </span>
          {review.user?.phone && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600">·</span>
              <span
                className="text-xs leading-normal tabular-nums text-zinc-400 dark:text-zinc-500"
                translate="no"
              >
                {review.user.phone}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="ml-auto flex flex-none items-center gap-2">
        <AdminV3Button
          variant="small"
          className="h-[34px] px-3 text-[13px]"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          View
        </AdminV3Button>
        <ChevronRight
          size={16}
          strokeWidth={2}
          className="flex-none text-zinc-300 dark:text-zinc-600"
        />
      </div>
    </div>
  );
}

/* =================================================================== detail */

function ReviewDetailView({
  review,
  all,
  currency,
  tz,
  onBack,
}: {
  review: ReviewRow;
  all: ReviewRow[];
  currency: string;
  tz: string;
  onBack: () => void;
}) {
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  const name = review.user?.full_name || "Customer";
  const order = review.order;
  const items = order?.order_items ?? [];
  const photos = Array.isArray(review.photo_urls) ? review.photo_urls : [];
  const comment = (review.comment || "").trim();

  const phone = review.user?.phone || order?.phone || null;
  const email = review.user?.email || null;
  const wa = waPhone(phone);

  const subtotal = items.reduce(
    (sum, oi) => sum + (oi.item?.price ?? 0) * (oi.quantity ?? 0),
    0,
  );
  const gst = order?.gst_included ?? 0;
  const extraCharges = order?.extra_charges ?? [];
  const discounts = order?.discounts ?? [];
  const discountSavings = discounts.reduce((s, d) => s + (d?.savings ?? 0), 0);
  const total = order?.total_price ?? 0;

  /* "This customer" is computed from the reviews we already hold — the only
     honest source. There is no per-customer aggregate in Hasura for this. */
  const sameCustomer = React.useMemo(() => {
    const key = review.user?.phone || review.user?.email;
    if (!key) return [review];
    return all.filter(
      (r) => (r.user?.phone || r.user?.email) === key,
    );
  }, [all, review]);
  const custAvg = sameCustomer.length
    ? sameCustomer.reduce((s, r) => s + (r.rating || 0), 0) / sameCustomer.length
    : 0;

  const statusTone: "green" | "outline" =
    order?.status === "completed" ? "green" : "outline";
  const isCancelled = order?.status === "cancelled";

  return (
    <div className="flex flex-col">
      {/* -------------------------------------------------------- sticky bar */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
        <AdminV3Button
          variant="icon"
          onClick={onBack}
          aria-label="Back to reviews"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </AdminV3Button>

        <div className="min-w-0 flex-[1_1_200px]">
          <div
            className="text-[16px] font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50"
            translate="no"
          >
            Review from {name}
          </div>
          <div className="mt-0.5 text-[12.5px] leading-normal text-zinc-500 dark:text-zinc-400">
            {fmt(review.created_at, tz, true)}
            {order ? ` · order ${orderLabel(order)}` : ""}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-flex h-[34px] flex-none items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <Phone size={15} strokeWidth={1.7} className="text-zinc-400" />
              Call
            </a>
          )}
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[34px] flex-none items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-green-200 bg-white px-3 text-[13px] font-medium leading-none text-green-700 transition-colors hover:bg-green-50 dark:border-green-900 dark:bg-zinc-800 dark:text-green-400 dark:hover:bg-green-950"
            >
              <MessageCircle size={15} strokeWidth={1.8} />
              WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {/* ------------------------------------------------- left: the review */}
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5">
          <V3Card className="p-[18px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
              <div
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-zinc-900 text-[13px] font-semibold leading-none text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                translate="no"
              >
                {initialsOf(name)}
              </div>
              <div className="min-w-0 flex-[1_1_150px]">
                <div
                  className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                  translate="no"
                >
                  {name}
                </div>
                <div
                  className="mt-0.5 text-[12.5px] leading-normal tabular-nums text-zinc-500 dark:text-zinc-400"
                  translate="no"
                >
                  {phone || "No phone on file"}
                </div>
              </div>
              <div className="flex flex-none items-center gap-2">
                <Stars value={Math.round(review.rating)} size={16} />
                <span className="text-[15px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                  {review.rating}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-[11px] border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <Quote
                size={20}
                strokeWidth={1.6}
                className="flex-none text-zinc-300 dark:text-zinc-600"
              />
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "whitespace-pre-wrap text-[15.5px] leading-relaxed",
                    comment
                      ? "text-zinc-800 dark:text-zinc-200"
                      : "italic text-zinc-400 dark:text-zinc-500",
                  )}
                  translate={comment ? "no" : undefined}
                >
                  {comment || "This customer rated without leaving a comment."}
                </div>
                <div className="mt-2 text-xs leading-normal text-zinc-400 dark:text-zinc-500">
                  Left {fmt(review.created_at, tz, true)}
                </div>
              </div>
            </div>
          </V3Card>

          {photos.length > 0 && (
            <V3Card>
              <div className="border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
                <span className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                  Photos
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-5">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="aspect-square overflow-hidden rounded-lg border border-zinc-200 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </V3Card>
          )}
        </div>

        {/* ------------------------------------------------ right: the order */}
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          {order ? (
            <V3Card>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
                <span
                  className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
                  translate="no"
                >
                  Order {orderLabel(order)}
                </span>
                {isCancelled ? (
                  <span className="inline-flex items-center whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-[9px] py-[2.5px] text-[11px] font-bold capitalize leading-none text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                    Cancelled
                  </span>
                ) : order.status ? (
                  <StatusPill tone={statusTone} className="capitalize">
                    {order.status}
                  </StatusPill>
                ) : null}
                {order.is_paid && <StatusPill tone="green">Paid</StatusPill>}
              </div>

              <div className="flex flex-col gap-3 px-4 py-3.5">
                <div className="flex flex-wrap gap-3">
                  <Field label="Type" value={orderTypeLabel(order.type)} />
                  <Field
                    label="Placed"
                    value={fmt(order.created_at, tz, true)}
                  />
                  {!!order.table_number && (
                    <Field label="Table" value={String(order.table_number)} />
                  )}
                </div>

                {order.delivery_address && (
                  <div>
                    <FieldLabel>Address</FieldLabel>
                    <div className="mt-[5px] flex gap-[7px]">
                      <MapPin
                        size={14}
                        strokeWidth={1.8}
                        className="mt-[3px] flex-none text-zinc-400 dark:text-zinc-500"
                      />
                      <div
                        className="text-[12.5px] leading-relaxed text-zinc-700 dark:text-zinc-300"
                        translate="no"
                      >
                        {order.delivery_address}
                      </div>
                    </div>
                  </div>
                )}

                {order.notes && (
                  <div>
                    <FieldLabel>Notes</FieldLabel>
                    <div
                      className="mt-[5px] text-[12.5px] leading-relaxed text-zinc-700 dark:text-zinc-300"
                      translate="no"
                    >
                      {order.notes}
                    </div>
                  </div>
                )}

                {items.length > 0 && (
                  <div>
                    <FieldLabel>Items</FieldLabel>
                    <div className="mt-0.5">
                      {items.map((oi) => (
                        <div
                          key={oi.id}
                          className="flex items-baseline gap-2.5 border-b border-zinc-100 py-2.5 last:border-b-0 dark:border-zinc-800"
                        >
                          <span className="flex-none text-[12.5px] font-semibold leading-none text-zinc-400 dark:text-zinc-500">
                            {oi.quantity}×
                          </span>
                          <span
                            className="min-w-0 flex-1 text-[13px] leading-snug text-zinc-950 dark:text-zinc-50"
                            translate="no"
                          >
                            {oi.item?.name ?? "Item"}
                          </span>
                          <span className="flex-none text-[13px] font-medium leading-none tabular-nums text-zinc-950 dark:text-zinc-50">
                            {money(
                              currency,
                              (oi.item?.price ?? 0) * (oi.quantity ?? 0),
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {subtotal > 0 && (
                    <TotalRow
                      label="Subtotal"
                      value={money(currency, subtotal)}
                    />
                  )}
                  {extraCharges.map((c, i) =>
                    c?.amount ? (
                      <TotalRow
                        key={i}
                        label={c.name || "Charge"}
                        value={money(currency, Number(c.amount))}
                      />
                    ) : null,
                  )}
                  {gst > 0 && (
                    <TotalRow label="GST" value={money(currency, gst)} />
                  )}
                  {discountSavings > 0 && (
                    <TotalRow
                      label={`Discount${discounts[0]?.code ? ` (${discounts[0].code})` : ""}`}
                      value={`- ${money(currency, discountSavings)}`}
                      tone="green"
                    />
                  )}
                  <div className="mt-[3px] flex items-baseline justify-between gap-3 border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
                    <span className="text-[13.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                      Total
                    </span>
                    <span className="text-[18px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50">
                      {money(currency, total)}
                    </span>
                  </div>
                </div>
              </div>
            </V3Card>
          ) : (
            <V3Card className="flex flex-col items-center gap-[7px] px-5 py-10">
              <ShoppingBag
                size={20}
                strokeWidth={1.6}
                className="text-zinc-300 dark:text-zinc-600"
              />
              <div className="text-[13.5px] font-medium leading-normal text-zinc-700 dark:text-zinc-300">
                Order no longer available
              </div>
              <div className="text-[12.5px] leading-normal text-zinc-400 dark:text-zinc-500">
                This review isn&apos;t linked to an order we can still read.
              </div>
            </V3Card>
          )}

          <V3Card>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
              <span className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                This customer
              </span>
            </div>
            <div className="px-4 pb-3 pt-1.5">
              <KvRow label="Reviews left" value={String(sameCustomer.length)} />
              <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
              <KvRow
                label="Average given"
                value={`${custAvg.toFixed(1)} / 5`}
              />
              <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
              <KvRow label="Email" value={email || "—"} truncate />
            </div>
          </V3Card>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-6"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ detail atoms */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase leading-normal tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-[1_1_120px]">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1 text-[13px] font-medium leading-snug capitalize text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={cn(
          "text-[12.5px] leading-none",
          tone === "green"
            ? "text-green-700 dark:text-green-400"
            : "text-zinc-500 dark:text-zinc-400",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-[12.5px] font-medium leading-none tabular-nums",
          tone === "green"
            ? "text-green-700 dark:text-green-400"
            : "text-zinc-950 dark:text-zinc-50",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function KvRow({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[9px]">
      <span className="flex-none text-[12.5px] leading-none text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span
        className={cn(
          "text-right text-[12.5px] font-medium leading-normal text-zinc-950 dark:text-zinc-50",
          truncate && "[overflow-wrap:anywhere]",
        )}
        translate={truncate ? "no" : undefined}
      >
        {value}
      </span>
    </div>
  );
}

export default AdminV3Reviews;
