"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock, FileClock } from "lucide-react";
import useOrderStore, { Order } from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * "Draft" orders = online orders whose payment is still processing
 * (status "pending_payment"). They are deliberately kept OUT of the normal
 * order list and the new-order notification/sound (the main subscriptions
 * filter them out). They live here until payment confirms (then they move to
 * the normal list as a real order) or they expire/are abandoned.
 *
 * Renders a button (with a live count) in the Orders toolbar; clicking opens a
 * dialog listing the drafts. Read-only — a draft isn't a confirmed order.
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

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="relative gap-2"
      >
        <FileClock className="h-4 w-4" />
        Draft Orders
        {drafts.length > 0 && (
          <Badge className="bg-amber-500 text-white hover:bg-amber-500 ml-1">
            {drafts.length}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Draft orders</DialogTitle>
            <DialogDescription>
              Online orders whose payment is still processing. They are not
              confirmed yet, so they don&apos;t appear in the order list or trigger
              alerts. They&apos;ll move to your orders once payment completes.
            </DialogDescription>
          </DialogHeader>

          {drafts.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No draft orders right now.
            </div>
          ) : (
            <div className="space-y-2">
              {drafts.map((order) => {
                const itemsDesc = (order.items || [])
                  .map((i) => `${i.name} × ${i.quantity}`)
                  .join(", ");
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          #{order.display_id || order.id.slice(0, 6)}
                        </span>
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
                      <p className="truncate text-sm text-muted-foreground">
                        {itemsDesc || "—"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {order.createdAt ? format(new Date(order.createdAt), "MMM d, hh:mm a") : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <p className="font-semibold">
                        ₹{Number(order.totalPrice || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
