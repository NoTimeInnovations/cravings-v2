"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import useOrderStore, { Order } from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";

/**
 * "Draft" orders = online orders whose payment is still processing
 * (status "pending_payment"). They are deliberately kept OUT of the normal
 * order list and the new-order notification/sound (the main subscriptions
 * filter them out). They live here until payment confirms (then they move to
 * the normal list as a real order) or they expire/are abandoned.
 *
 * Read-only: a draft isn't a real order yet, so there are no actions.
 */
export function DraftOrdersSection() {
  const { userData } = useAuthStore();
  const { subscribeDraftOrders } = useOrderStore();
  const [drafts, setDrafts] = useState<Order[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userData?.id) return;
    const unsubscribe = subscribeDraftOrders((orders) => setDrafts(orders));
    return () => unsubscribe();
  }, [userData?.id, subscribeDraftOrders]);

  if (drafts.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-amber-700" />
          ) : (
            <ChevronRight className="h-4 w-4 text-amber-700" />
          )}
          <span className="font-medium text-amber-900">Draft orders</span>
          <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200">
            {drafts.length}
          </Badge>
        </div>
        <span className="text-xs text-amber-700">Payment processing — not confirmed yet</span>
      </button>

      {open && (
        <div className="space-y-2 px-4 pb-4">
          {drafts.map((order) => {
            const itemsDesc = (order.items || [])
              .map((i) => `${i.name} × ${i.quantity}`)
              .join(", ");
            return (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">#{order.display_id || order.id.slice(0, 6)}</span>
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Payment processing
                    </Badge>
                    {order.order_channel && (
                      <Badge
                        className={
                          order.order_channel === "app"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                        }
                      >
                        {order.order_channel === "app" ? "App" : "Web"}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{itemsDesc || "—"}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {order.createdAt ? format(new Date(order.createdAt), "hh:mm a") : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{Number(order.totalPrice || 0).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
