"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { insertOrderReviewMutation } from "@/api/reviews";
import { Notification } from "@/app/actions/notification";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// One-shot fetch keyed by order id. No auth: the customer arrives from a
// WhatsApp deep link and is usually NOT logged in, so we take user_id from the
// order itself (reviews.user_id is required) rather than the auth store.
const GET_ORDER_FOR_REVIEW = `
query GetOrderForReview($id: uuid!) {
  orders_by_pk(id: $id) {
    id
    display_id
    status
    user_id
    partner_id
    partner {
      store_name
      store_banner
    }
    reviews(limit: 1) {
      id
      rating
    }
  }
}`;

const COMMENT_MAX = 250;

const RATING_TITLE = [
  "How was your order?",
  "We're sorry about the experience",
  "We're sorry about the experience",
  "We're sorry it didn't meet expectations",
  "We're glad you liked it",
  "We're glad you loved it",
];

function StarRow({
  value,
  onChange,
  size = 40,
  readOnly,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="flex items-center justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="rounded-full p-1 transition-transform active:scale-95 disabled:cursor-default"
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              "transition-colors duration-200",
              n <= display ? "fill-orange-500 text-orange-500" : "text-gray-300",
            )}
          />
        </button>
      ))}
    </div>
  );
}

type ReviewOrder = {
  id: string;
  display_id: string | number | null;
  status: string | null;
  user_id: string | null;
  partner_id: string | null;
  partner: { store_name: string | null; store_banner: string | null } | null;
  reviews: { id: string; rating: number }[];
};

// Module-level so it keeps a STABLE component identity across renders. Defining
// it inside ReviewPage made React remount the whole subtree (incl. the comment
// textarea) on every keystroke, which stole focus after each character.
function ReviewShell({
  banner,
  storeName,
  children,
}: {
  banner?: string | null;
  storeName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        {banner ? (
          <img
            src={banner}
            alt={storeName}
            className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover shadow-sm"
          />
        ) : null}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.04]">{children}</div>
        <p className="mt-4 text-center text-[11px] text-gray-400">Powered by Menuthere</p>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const params = useParams();
  const orderId = Array.isArray(params?.orderId) ? params.orderId[0] : (params?.orderId as string);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<ReviewOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!orderId) return;
      try {
        const res: any = await fetchFromHasura(GET_ORDER_FOR_REVIEW, { id: orderId });
        const o = res?.orders_by_pk;
        if (cancelled) return;
        if (!o) setNotFound(true);
        else setOrder(o);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const storeName = order?.partner?.store_name || "this restaurant";
  const existingReview = order?.reviews?.[0] || null;
  const displayId = useMemo(
    () => order?.display_id || order?.id?.slice(0, 8) || "",
    [order],
  );

  const handleSubmit = async () => {
    if (!order || rating < 1 || submitting) return;
    if (!order.user_id) {
      toast.error("This order can't be reviewed.");
      return;
    }
    setSubmitting(true);
    try {
      const trimmed = comment.trim();
      const res: any = await fetchFromHasura(insertOrderReviewMutation, {
        id: uuidv4(),
        order_id: order.id,
        partner_id: order.partner_id,
        user_id: order.user_id,
        rating,
        comment: trimmed.length > 0 ? trimmed : null,
        photo_urls: null,
      });
      if (!res?.insert_reviews_one) throw new Error("insert failed");
      // Fire-and-forget partner notification (best-effort).
      if (order.partner_id) {
        Notification.partner
          .sendReviewNotification(order.partner_id, String(displayId), rating, trimmed.length > 0 ? trimmed : null)
          .catch(() => {});
      }
      setDone(true);
    } catch (err) {
      console.error("review submit failed", err);
      toast.error("Couldn't submit your review. Please try again.");
      setSubmitting(false);
    }
  };

  // ── Render states ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <ReviewShell banner={order?.partner?.store_banner ?? null} storeName={storeName}>
        <p className="text-center text-lg font-bold text-gray-900">Order not found</p>
        <p className="mt-1 text-center text-sm text-gray-500">
          This review link is invalid or has expired.
        </p>
      </ReviewShell>
    );
  }

  // The review link is only meant for a completed order. If it's opened for an
  // order that isn't completed (opened early / shared / later cancelled), don't
  // accept a review — but still show an already-submitted/just-submitted result.
  if (!done && !existingReview && order.status !== "completed") {
    return (
      <ReviewShell banner={order?.partner?.store_banner ?? null} storeName={storeName}>
        <p className="text-center text-lg font-bold text-gray-900">Not ready for a review yet</p>
        <p className="mt-1 text-center text-sm text-gray-500">
          You can rate your order once it&apos;s completed.
        </p>
      </ReviewShell>
    );
  }

  if (done || existingReview) {
    const shownRating = done ? rating : existingReview!.rating;
    return (
      <ReviewShell banner={order?.partner?.store_banner ?? null} storeName={storeName}>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <h1 className="mt-3 text-xl font-extrabold tracking-tight text-gray-900">
            {done ? "Thanks for your review!" : "You've already reviewed this order"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{storeName}</p>
          <div className="mt-4">
            <StarRow value={shownRating} readOnly size={28} />
          </div>
        </div>
      </ReviewShell>
    );
  }

  return (
    <ReviewShell banner={order?.partner?.store_banner ?? null} storeName={storeName}>
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
          Order #{displayId}
        </p>
        <h1
          key={`t-${rating}`}
          className="mt-2 text-xl font-extrabold tracking-tight text-gray-900"
          style={{ animation: "fadeIn 240ms ease" }}
        >
          {RATING_TITLE[Math.max(0, Math.min(5, rating))]}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{storeName}</p>
      </div>

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div className="mt-7">
        <StarRow value={rating} onChange={setRating} />
      </div>

      <div className="mt-7">
        <label htmlFor="review-comment" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Tell us more (optional)
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
          placeholder="What stood out — good or bad?"
          rows={4}
          disabled={submitting}
          className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
        />
        <div className="mt-1 text-right text-[11px] text-gray-400">
          {comment.length}/{COMMENT_MAX}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={rating < 1 || submitting}
        className={cn(
          "mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold tracking-tight transition",
          rating >= 1 && !submitting
            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-[0.99]"
            : "cursor-not-allowed bg-gray-100 text-gray-400",
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          "Submit Review"
        )}
      </button>
    </ReviewShell>
  );
}
