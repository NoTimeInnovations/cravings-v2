"use client";

import React from "react";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import type { Order } from "@/store/orderStore";

/**
 * Petpooja-style live order card shown on the dashboard. The dark header carries
 * the order number (not an aggregator name), an order-type badge and an eye icon
 * that opens the full order details. The footer shows the workflow action
 * (Accept → Mark Ready → … → Complete) and a Cancel action while still pending.
 */

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "New", className: "bg-yellow-100 text-yellow-800" },
  accepted: { label: "Accepted", className: "bg-blue-100 text-blue-800" },
  food_ready: { label: "Food Ready", className: "bg-orange-100 text-orange-800" },
  dispatched: { label: "Dispatched", className: "bg-purple-100 text-purple-900" },
  in_transit: { label: "On the way", className: "bg-purple-100 text-purple-900" },
};

function nextStep(order: Order): { status: string; label: string } | null {
  switch (order.status) {
    case "pending":
      return { status: "accepted", label: "Accept" };
    case "accepted":
      return { status: "food_ready", label: "Mark Ready" };
    case "food_ready":
      return order.type === "delivery"
        ? { status: "dispatched", label: "Dispatch" }
        : { status: "completed", label: "Complete" };
    case "dispatched":
    case "in_transit":
      return { status: "completed", label: "Complete" };
    default:
      return null;
  }
}

function typeLabel(order: Order): string {
  if (order.type === "delivery") return order.deliveryAddress ? "Delivery" : "Takeaway";
  if (order.type === "table_order") return "Dine-in";
  return order.type || "Order";
}

export function LiveOrderCard({
  order,
  currency,
  cancellable,
  onView,
  onCancel,
  onAdvance,
}: {
  order: Order;
  currency: string;
  cancellable: boolean;
  onView: () => void;
  onCancel: () => void;
  onAdvance: (nextStatus: string) => void;
}) {
  const next = nextStep(order);
  const badge = STATUS_BADGE[order.status];
  const orderNo =
    Number(order.display_id) > 0 ? `#${order.display_id}` : `#${order.id.slice(0, 6)}`;
  const location =
    order.tableName ||
    (order.tableNumber ? `Table ${order.tableNumber}` : null) ||
    order.deliveryAddress ||
    order.user?.full_name ||
    "Online";

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Dark header — order number + type + open-details eye */}
      <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 text-white">
        <span className="text-sm font-bold tracking-tight">{orderNo}</span>
        {badge && (
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">
            {badge.label}
          </span>
        )}
        <span className="ml-auto rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium">
          {typeLabel(order)}
        </span>
        <button
          type="button"
          onClick={onView}
          aria-label="View order details"
          className="-mr-1 flex h-7 w-7 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>

      {/* Meta row — location · time · total */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-muted-foreground">
          {location}
        </span>
        <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
          {format(new Date(order.createdAt), "hh:mm a")}
        </span>
        <span className="text-[15px] font-bold tabular-nums">
          {currency}
          {order.totalPrice}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-0.5 px-3 py-2.5">
        {order.items.slice(0, 4).map((item, i) => (
          <p key={i} className="truncate text-[13px] text-foreground">
            {item.quantity} x {item.name}
          </p>
        ))}
        {order.items.length > 4 && (
          <p className="text-[12px] text-muted-foreground">
            +{order.items.length - 4} more
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        {cancellable && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-red-200 py-2 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            Cancel
          </button>
        )}
        {next && (
          <button
            type="button"
            onClick={() => onAdvance(next.status)}
            className="flex-1 rounded-lg bg-[#c0392b] py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#a83228]"
          >
            {next.label}
          </button>
        )}
      </div>
    </div>
  );
}
