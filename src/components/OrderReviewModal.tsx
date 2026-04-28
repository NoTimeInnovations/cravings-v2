"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Loader2, Star, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { useAuthStore } from "@/store/authStore";
import { Order } from "@/store/orderStore";
import { insertOrderReviewMutation } from "@/api/reviews";
import { Notification } from "@/app/actions/notification";

interface OrderReviewModalProps {
  order: Order;
  onSubmitted: (review: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
  }) => void;
  onClose?: () => void;
}

const COMMENT_MIN = 5;
const COMMENT_MAX = 250;

function StarRow({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = React.useState(0);
  const display = hover || value;
  return (
    <div className="flex items-center justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="rounded-full p-1 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Star
              className={cn(
                "h-9 w-9 transition-colors",
                filled ? "fill-orange-500 text-orange-500" : "text-gray-300",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function OrderReviewModal({ order, onSubmitted, onClose }: OrderReviewModalProps) {
  const { userData } = useAuthStore();
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const storeName = order.partner?.store_name || "this restaurant";
  const trimmedComment = comment.trim();
  const commentLen = trimmedComment.length;
  // Comment is optional. If provided, it must be at least COMMENT_MIN chars.
  const commentValid = commentLen === 0 || commentLen >= COMMENT_MIN;
  const canSubmit = rating > 0 && commentValid && !submitting;

  const ratingLabels = ["Tap a star", "Bad", "Poor", "Okay", "Good", "Great"];

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!userData?.id) {
      toast.error("Please log in to submit a review");
      return;
    }

    setSubmitting(true);
    try {
      const reviewId = uuidv4();
      const res: any = await fetchFromHasura(insertOrderReviewMutation, {
        id: reviewId,
        order_id: order.id,
        partner_id: order.partnerId,
        user_id: userData.id,
        rating,
        comment: trimmedComment.length > 0 ? trimmedComment : null,
      });

      const inserted = res?.insert_reviews_one;
      if (!inserted) throw new Error("Failed to save review");

      onSubmitted({
        id: inserted.id,
        rating: inserted.rating,
        comment: inserted.comment ?? null,
        created_at: inserted.created_at,
      });
      toast.success("Thanks for your review!");
      const displayId = (order as any).display_id || order.id.slice(0, 8);
      Notification.partner
        .sendReviewNotification(
          order.partnerId,
          displayId,
          rating,
          trimmedComment.length > 0 ? trimmedComment : null,
        )
        .catch(() => {});
    } catch (err) {
      console.error(err);
      toast.error("Couldn't submit review. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={true} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"
          onClick={() => onClose?.()}
        />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => { if (!onClose) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (!onClose) e.preventDefault(); }}
          onInteractOutside={(e) => { if (!onClose) e.preventDefault(); }}
          style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          className={cn(
            "fixed z-50 flex flex-col bg-white antialiased shadow-2xl duration-200",
            "inset-0 h-full w-full",
            "sm:left-1/2 sm:top-1/2 sm:h-auto sm:w-[440px] sm:max-w-[92vw] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=open]:slide-in-from-bottom-[100%]",
            "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          )}
        >
          {/* Sticky header */}
          <header className="flex h-14 items-center justify-between border-b border-gray-200/80 px-4">
            <DialogPrimitive.Title className="text-base font-extrabold tracking-tight text-gray-900">
              Rate your order
            </DialogPrimitive.Title>
            <button
              type="button"
              onClick={() => onClose?.()}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                Order #{(order as any).display_id || order.id.slice(0, 8)}
              </p>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight text-gray-900">
                How was {storeName}?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Your feedback helps the restaurant improve.
              </p>
            </div>

            <div className="mt-7">
              <StarRow value={rating} onChange={setRating} disabled={submitting} />
              <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                {ratingLabels[rating]}
              </p>
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
                className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-60"
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className={cn("text-gray-400", !commentValid && "text-red-500")}>
                  {!commentValid ? `Add at least ${COMMENT_MIN} characters or leave it blank` : ` `}
                </span>
                <span className="text-gray-400">{commentLen}/{COMMENT_MAX}</span>
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <footer className="border-t border-gray-200/80 bg-white p-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold tracking-tight transition",
                canSubmit
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-[0.99]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default OrderReviewModal;
