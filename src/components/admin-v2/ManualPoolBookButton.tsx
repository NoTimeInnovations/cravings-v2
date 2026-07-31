"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bike, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dispatchDeliveryPool } from "@/app/actions/deliveryPoolDispatch";

/**
 * Manual "book a ride" for the Menuthere delivery pool.
 *
 * The pool auto-dispatches when an order is accepted, so this used to be
 * considered unnecessary and no manual control existed at all — which left the
 * partner stuck whenever the automatic attempt found no rider, errored, or the
 * order was accepted before an address was usable. There was nothing to press.
 *
 * Shown for every real delivery order on a pool partner, including one that
 * already has a ride, because "a rider was requested" is not the same as "a
 * rider is coming" and the partner is the one standing in the kitchen deciding
 * whether to try again. The label changes rather than the button disappearing,
 * so a re-book is always a deliberate act and never a surprise.
 */
export default function ManualPoolBookButton({
  orderId,
  alreadyDispatched = false,
}: {
  orderId: string;
  /** A pool ride has been requested for this order at least once. */
  alreadyDispatched?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const book = async () => {
    setBusy(true);
    try {
      const r = await dispatchDeliveryPool(orderId);
      if (r.ok) toast.success("Ride requested from the delivery pool");
      // The action never throws — it returns a reason, and the reasons are
      // actionable ("partner geo_location missing", "order delivery_location
      // missing"), so surface them instead of a generic failure.
      else toast.error(r.message || "Could not book a ride");
    } catch {
      toast.error("Could not book a ride");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
      <div className="text-sm">
        <p className="font-medium">
          {alreadyDispatched ? "Book another ride" : "Book a ride"}
        </p>
        <p className="text-xs text-muted-foreground">
          {alreadyDispatched
            ? "Sends this order to the pool again — use if no rider turned up."
            : "Request a rider from the Menuthere delivery pool."}
        </p>
      </div>
      <Button
        onClick={book}
        disabled={busy}
        size="sm"
        variant={alreadyDispatched ? "outline" : "default"}
        className="shrink-0"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
        ) : (
          <Bike className="h-4 w-4 mr-1.5" />
        )}
        {alreadyDispatched ? "Book again" : "Book a ride"}
      </Button>
    </div>
  );
}
