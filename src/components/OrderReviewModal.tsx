"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { ImagePlus, Loader2, Star, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { useAuthStore } from "@/store/authStore";
import { Order } from "@/store/orderStore";
import { insertOrderReviewMutation } from "@/api/reviews";
import { Notification } from "@/app/actions/notification";
import { uploadFileToS3 } from "@/app/actions/aws-s3";

interface OrderReviewModalProps {
  order: Order;
  onSubmitted: (review: {
    id: string;
    rating: number;
    comment: string | null;
    photo_urls: string[] | null;
    created_at: string;
  }) => void;
  onClose?: () => void;
}

const COMMENT_MIN = 5;
const COMMENT_MAX = 250;
const MAX_PHOTOS = 5;

const RATING_COPY: { title: (store: string) => string; subtitle: (store: string) => string }[] = [
  // 0 stars
  { title: () => "How was your order?", subtitle: (s) => s },
  // 1 star
  { title: () => "We're sorry about the experience", subtitle: (s) => s },
  // 2 stars
  { title: () => "We're sorry about the experience", subtitle: (s) => s },
  // 3 stars
  { title: () => "We're sorry it didn't meet expectations", subtitle: (s) => s },
  // 4 stars
  { title: () => "We're glad you liked it", subtitle: (s) => s },
  // 5 stars
  { title: () => "We're glad you loved it", subtitle: (s) => s },
];

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
                "h-9 w-9 transition-colors duration-200",
                filled ? "fill-orange-500 text-orange-500" : "text-gray-300",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

type LocalPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  url?: string;
};

export function OrderReviewModal({ order, onSubmitted, onClose }: OrderReviewModalProps) {
  const { userData } = useAuthStore();
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [photos, setPhotos] = React.useState<LocalPhoto[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const storeName = order.partner?.store_name || "this restaurant";
  const trimmedComment = comment.trim();
  const commentLen = trimmedComment.length;
  const commentValid = commentLen === 0 || commentLen >= COMMENT_MIN;
  const photosUploading = photos.some((p) => p.status === "uploading");
  const canSubmit = rating > 0 && commentValid && !submitting && !photosUploading;

  const copy = RATING_COPY[Math.max(0, Math.min(5, rating))];
  const isFiveStar = rating === 5;

  // Cleanup object URLs on unmount or when photo is removed.
  React.useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !userData?.id) return;
    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      toast.error(`You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const list = Array.from(files).slice(0, remainingSlots);
    const newPhotos: LocalPhoto[] = list.map((file) => ({
      id: uuidv4(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);

    await Promise.all(
      newPhotos.map(async (p) => {
        try {
          const safeName = p.file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9.\-_]/g, "");
          const key = `${userData.id}/reviews/${order.id}/${Date.now()}-${safeName}`;
          const url = await uploadFileToS3(p.file, key);
          setPhotos((prev) =>
            prev.map((x) => (x.id === p.id ? { ...x, status: "done", url } : x)),
          );
        } catch (err) {
          console.error("photo upload failed", err);
          setPhotos((prev) =>
            prev.map((x) => (x.id === p.id ? { ...x, status: "error" } : x)),
          );
          toast.error(`Couldn't upload ${p.file.name}`);
        }
      }),
    );
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!userData?.id) {
      toast.error("Please log in to submit a review");
      return;
    }

    setSubmitting(true);
    try {
      const reviewId = uuidv4();
      const photoUrls = photos.filter((p) => p.status === "done" && p.url).map((p) => p.url!);
      const res: any = await fetchFromHasura(insertOrderReviewMutation, {
        id: reviewId,
        order_id: order.id,
        partner_id: order.partnerId,
        user_id: userData.id,
        rating,
        comment: trimmedComment.length > 0 ? trimmedComment : null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
      });

      const inserted = res?.insert_reviews_one;
      if (!inserted) throw new Error("Failed to save review");

      onSubmitted({
        id: inserted.id,
        rating: inserted.rating,
        comment: inserted.comment ?? null,
        photo_urls: inserted.photo_urls ?? null,
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
            "sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[92vh] sm:w-[440px] sm:max-w-[92vw] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=open]:slide-in-from-bottom-[100%]",
            "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          )}
        >
          {/* Inline keyframes — avoids touching tailwind config */}
          <style>{`
            @keyframes orm-text-in {
              from { opacity: 0; transform: translateY(6px); }
              to   { opacity: 1; transform: translateY(0);   }
            }
            @keyframes orm-confetti {
              0%   { transform: translate(0, 0) scale(0.6) rotate(0deg);   opacity: 0; }
              20%  { opacity: 1; }
              100% { transform: translate(var(--tx), var(--ty)) scale(1) rotate(var(--rot)); opacity: 0; }
            }
            @keyframes orm-pulse-ring {
              0%   { transform: scale(0.6); opacity: 0.5; }
              100% { transform: scale(2.6); opacity: 0;   }
            }
            .orm-text-anim { animation: orm-text-in 240ms cubic-bezier(0.2,0.8,0.2,1); }
            .orm-confetti { position: absolute; width: 8px; height: 8px; border-radius: 2px; pointer-events: none; animation: orm-confetti 900ms ease-out forwards; }
            .orm-pulse-ring { position: absolute; inset: 0; border-radius: 9999px; border: 2px solid rgb(249 115 22); pointer-events: none; animation: orm-pulse-ring 700ms ease-out forwards; }
          `}</style>

          {/* Sticky header */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200/80 px-4">
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
              {/* Animated copy — re-keys on rating change so animation re-runs */}
              <h2
                key={`title-${rating}`}
                className="orm-text-anim mt-2 text-xl font-extrabold tracking-tight text-gray-900"
              >
                {copy.title(storeName)}
              </h2>
              <p
                key={`sub-${rating}`}
                className="orm-text-anim mt-1 text-sm text-gray-500"
              >
                {copy.subtitle(storeName)}
              </p>
            </div>

            <div className="relative mt-7">
              {isFiveStar && (
                <>
                  <div className="orm-pulse-ring" />
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * Math.PI * 2;
                    const radius = 90;
                    const tx = Math.cos(angle) * radius;
                    const ty = Math.sin(angle) * radius;
                    const rot = (i % 2 === 0 ? 1 : -1) * 320;
                    const colors = ["#f97316", "#fbbf24", "#ef4444", "#22c55e", "#3b82f6"];
                    return (
                      <span
                        key={`c-${i}-${rating}`}
                        className="orm-confetti"
                        style={
                          {
                            left: "50%",
                            top: "50%",
                            background: colors[i % colors.length],
                            "--tx": `${tx}px`,
                            "--ty": `${ty}px`,
                            "--rot": `${rot}deg`,
                          } as React.CSSProperties
                        }
                      />
                    );
                  })}
                </>
              )}
              <StarRow value={rating} onChange={setRating} disabled={submitting} />
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
                  {!commentValid ? `Add at least ${COMMENT_MIN} characters or leave it blank` : ` `}
                </span>
                <span className="text-gray-400">{commentLen}/{COMMENT_MAX}</span>
              </div>
            </div>

            {/* Photo picker */}
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Add photos (optional, up to {MAX_PHOTOS})
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                  >
                    <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                    {p.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      </div>
                    )}
                    {p.status === "error" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500/70 text-[10px] font-bold uppercase tracking-wider text-white">
                        Failed
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      aria-label="Remove photo"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                    className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-500 transition disabled:opacity-60"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  handleFiles(e.target.files);
                  // reset so the same file can be re-picked if removed
                  if (e.target) e.target.value = "";
                }}
              />
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
              ) : photosUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading photos…
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
