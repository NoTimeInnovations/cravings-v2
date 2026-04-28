"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  StickyNote,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface ReviewDetail {
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
    extra_charges: { name?: string; amount?: number; charge_type?: string }[] | null;
    discounts: { code?: string; value?: number; type?: string; savings?: number }[] | null;
    order_items: { id: string; quantity: number; item: any }[] | null;
  } | null;
}

interface Props {
  review: ReviewDetail;
  currency?: string;
  onBack: () => void;
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-4 w-4",
            n <= value ? "fill-orange-500 text-orange-500" : "text-gray-300",
          )}
        />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-gray-600">
        {value}/5
      </span>
    </div>
  );
}

function getOrderTypeLabel(type: string | null | undefined): string {
  if (type === "delivery") return "Delivery / Takeaway";
  if (type === "table_order") return "Dine-in";
  return type ?? "—";
}

function formatPhoneForWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const p = raw.replace(/\s+/g, "");
  if (/^\+/.test(p)) return p.replace("+", "");
  if (/^\d{10}$/.test(p)) return `91${p}`;
  return p.replace(/[^\d]/g, "");
}

export function AdminV2ReviewDetail({ review, currency = "₹", onBack }: Props) {
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  const photos = Array.isArray(review.photo_urls) ? review.photo_urls : [];
  const order = review.order;
  const items = order?.order_items ?? [];

  const foodTotal = items.reduce(
    (sum, oi) => sum + (oi.item?.price ?? 0) * (oi.quantity ?? 0),
    0,
  );
  const grandTotal = order?.total_price ?? 0;
  const gst = order?.gst_included ?? 0;
  const extraCharges = order?.extra_charges ?? [];
  const discounts = order?.discounts ?? [];
  const discountSavings = discounts.reduce(
    (sum, d) => sum + (d?.savings ?? 0),
    0,
  );

  const userPhone = review.user?.phone || order?.phone || null;
  const userEmail = review.user?.email || null;
  const waPhone = formatPhoneForWhatsapp(userPhone);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to reviews"
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Review details
          </h2>
          <p className="text-xs text-muted-foreground">
            {format(new Date(review.created_at), "MMM d, yyyy · h:mm a")}
          </p>
        </div>
      </div>

      {/* Customer + rating */}
      <section className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900">
            {review.user?.full_name || "Customer"}
          </p>
          {(userPhone || userEmail) && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {userPhone}
              {userPhone && userEmail ? " · " : ""}
              {userEmail}
            </p>
          )}
        </div>
        <StarRow value={review.rating} />
      </section>

      {/* Contact actions */}
      {(userPhone || waPhone) && (
        <section className="flex flex-wrap gap-2">
          {userPhone && (
            <a
              href={`tel:${userPhone}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-gray-800 transition"
            >
              <Phone className="h-3.5 w-3.5" /> Call
            </a>
          )}
          {waPhone && (
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-600 transition"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
        </section>
      )}

      {/* Comment */}
      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Comment
        </h3>
        <p className="mt-1.5 text-sm text-gray-700 whitespace-pre-wrap">
          {review.comment || (
            <span className="italic text-gray-400">No comment</span>
          )}
        </p>
      </section>

      {/* Photos */}
      {photos.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Photos
          </h3>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {photos.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(url)}
                className="aspect-square overflow-hidden rounded-lg ring-1 ring-black/5 hover:ring-orange-400 transition"
              >
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Order details */}
      {order && (
        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order
              </h3>
              <p className="mt-1 text-sm font-bold text-gray-900">
                #{order.display_id || order.id.slice(0, 8)}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(order.created_at), "MMM d, yyyy · h:mm a")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {order.status && (
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-700">
                  {order.status}
                </span>
              )}
              {order.is_paid && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Paid
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">Type</span>
            <span className="text-gray-800">{getOrderTypeLabel(order.type)}</span>
            {order.table_number && order.table_number !== 0 && (
              <>
                <span className="text-muted-foreground">Table</span>
                <span className="text-gray-800">{order.table_number}</span>
              </>
            )}
            {order.delivery_address && (
              <>
                <span className="text-muted-foreground">
                  <MapPin className="inline h-3.5 w-3.5 -mt-0.5" /> Address
                </span>
                <span className="text-gray-800 break-words">
                  {order.delivery_address}
                </span>
              </>
            )}
            {order.notes && (
              <>
                <span className="text-muted-foreground">
                  <StickyNote className="inline h-3.5 w-3.5 -mt-0.5" /> Notes
                </span>
                <span className="text-gray-800 break-words">{order.notes}</span>
              </>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="mt-4 rounded-lg border bg-background">
              <div className="border-b px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Items
              </div>
              <ul className="divide-y">
                {items.map((oi) => {
                  const name = oi.item?.name ?? "Item";
                  const price = oi.item?.price ?? 0;
                  return (
                    <li
                      key={oi.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        <span className="text-muted-foreground">{oi.quantity} ×</span>{" "}
                        <span className="text-gray-800">{name}</span>
                      </span>
                      <span className="shrink-0 font-medium text-gray-700">
                        {currency}
                        {(price * oi.quantity).toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Totals */}
          <div className="mt-3 space-y-1 text-sm">
            {foodTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>
                  {currency}
                  {foodTotal.toFixed(2)}
                </span>
              </div>
            )}
            {extraCharges.map((c, i) =>
              c?.amount ? (
                <div key={i} className="flex justify-between text-muted-foreground">
                  <span>{c.name || "Charge"}</span>
                  <span>
                    {currency}
                    {Number(c.amount).toFixed(2)}
                  </span>
                </div>
              ) : null,
            )}
            {gst > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>GST</span>
                <span>
                  {currency}
                  {gst.toFixed(2)}
                </span>
              </div>
            )}
            {discountSavings > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>
                  Discount
                  {discounts[0]?.code ? ` (${discounts[0].code})` : ""}
                </span>
                <span>
                  - {currency}
                  {discountSavings.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold text-gray-900">
              <span>Total</span>
              <span>
                {currency}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Lightbox stays a dialog (true overlay for fullscreen images) */}
      {lightbox && (
        <DialogPrimitive.Root
          open={true}
          onOpenChange={(open) => {
            if (!open) setLightbox(null);
          }}
        >
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
              className="fixed inset-0 z-[60] bg-black/90"
              onClick={() => setLightbox(null)}
            />
            <DialogPrimitive.Content className="fixed z-[60] left-1/2 top-1/2 max-h-[92vh] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 outline-none">
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Close"
                className="absolute -top-10 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={lightbox}
                alt=""
                className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain"
              />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </div>
  );
}

export default AdminV2ReviewDetail;
