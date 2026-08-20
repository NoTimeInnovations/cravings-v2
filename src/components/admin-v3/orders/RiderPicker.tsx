"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  assignDeliveryBoyToOrder,
  loadActiveDrivers,
  type DriverOption,
} from "@/lib/assignDeliveryBoy";
import { cn } from "@/lib/utils";
import type { Partner } from "@/store/authStore";
import type { Order } from "@/store/orderStore";

/**
 * Pick one of the partner's own riders, inline.
 *
 * One component for both places a rider gets chosen — the order detail's
 * "Assign rider" and the dashboard card's "Dispatch". They were a dropdown and
 * a modal doing the same job, which meant two answers to "how do I assign
 * someone" and, once the detail moved to a dropdown, two implementations of it.
 *
 * The caller supplies its own trigger, so the dashboard keeps a primary
 * "Dispatch" button and the detail keeps a small "Assign rider" one without
 * this component knowing anything about either.
 */
export function RiderPicker({
  order,
  partner,
  trigger,
  align = "start",
  onAssigned,
}: {
  order: Order;
  partner: Partner | null | undefined;
  trigger: React.ReactNode;
  align?: "start" | "end";
  onAssigned?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [drivers, setDrivers] = React.useState<DriverOption[] | null>(null);
  const [assigningId, setAssigningId] = React.useState<string | null>(null);

  // Loaded when first opened, not on mount: most cards are never assigned from,
  // and the roster is its own query.
  React.useEffect(() => {
    if (!open || drivers !== null || !partner?.id) return;
    let cancelled = false;
    loadActiveDrivers(partner.id)
      .then((d) => {
        if (!cancelled) setDrivers(d);
      })
      .catch(() => {
        if (!cancelled) setDrivers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, drivers, partner?.id]);

  /**
   * Whoever is already on this order first, then the roster's own online-first
   * order. It matters most when REASSIGNING: that is the row you are comparing
   * against, and hunting for it mid-list is where you misclick onto the wrong
   * person.
   */
  const choices = React.useMemo(() => {
    if (!drivers) return [];
    const currentId = order.delivery_boy_id;
    return [
      ...drivers.filter((d) => d.id === currentId),
      ...drivers.filter((d) => d.id !== currentId),
    ];
  }, [drivers, order.delivery_boy_id]);

  const assign = async (driver: DriverOption) => {
    setAssigningId(driver.id);
    try {
      const ok = await assignDeliveryBoyToOrder(order, driver, partner);
      if (ok) {
        setOpen(false);
        onAssigned?.();
      }
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="max-h-[280px] w-[240px] overflow-y-auto p-1"
      >
        {drivers === null ? (
          <div className="flex items-center justify-center gap-2 px-2 py-6 text-[12.5px] text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading riders…
          </div>
        ) : choices.length === 0 ? (
          <div className="px-3 py-6 text-center text-[12.5px] text-zinc-500 dark:text-zinc-400">
            No active riders.
          </div>
        ) : (
          choices.map((d) => {
            const isCurrent = d.id === order.delivery_boy_id;
            return (
              <DropdownMenuItem
                key={d.id}
                disabled={!!assigningId}
                onSelect={(e) => {
                  // Keep the menu open while the assignment runs; it closes
                  // itself on success.
                  e.preventDefault();
                  void assign(d);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2"
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    d.is_online ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600",
                  )}
                  title={d.is_online ? "Online" : "Offline"}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
                    {d.name}
                  </span>
                  <span className="mt-1 block truncate text-[11.5px] leading-none text-zinc-400 dark:text-zinc-500">
                    {d.phone}
                  </span>
                </span>
                {assigningId === d.id ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : isCurrent ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                ) : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
