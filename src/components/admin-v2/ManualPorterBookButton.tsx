"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bike, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { dispatchViaDeliveryBridge } from "@/app/actions/porterBridge";

/**
 * Manual "Book rider now" for porter_bridge partners. Books the order through
 * the delivery bridge (Porter → Rapido) on demand — the primary control when a
 * partner turns off auto-dispatch, and a force/re-trigger otherwise.
 *
 * The parent used to hide this whenever delivery_provider_meta.dispatchId existed
 * and the state was not literally "cancelled"/"failed". That gate confused two
 * different things: `delivery_provider_state` describes the DISPATCH (which sits
 * at "running" while it escalates down the provider list), not the RIDE. A
 * partner whose Porter rider cancelled would see "Delivery cancelled." next to a
 * cancelled rider row, a dispatch still marked running, and no button at all.
 *
 * So it now always renders, and the label carries the state instead: the person
 * standing in the kitchen is the one who can tell a stalled dispatch from a live
 * one, and taking the control away is what left them stuck.
 */
export default function ManualPorterBookButton({
  orderId,
  alreadyDispatched = false,
}: {
  orderId: string;
  /** A dispatch has been attempted for this order at least once. */
  alreadyDispatched?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const book = async () => {
    setBusy(true);
    try {
      const r = await dispatchViaDeliveryBridge(orderId);
      if (r.ok) toast.success("Rider dispatch requested");
      else toast.error(r.message || "Failed to book rider");
    } catch {
      toast.error("Failed to book rider");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
      <div className="text-sm">
        <p className="font-medium">
          {alreadyDispatched ? "Book another rider" : "Book a rider"}
        </p>
        <p className="text-xs text-muted-foreground">
          {alreadyDispatched
            ? "Dispatch again through the bridge — use if the rider cancelled or none was found."
            : "Dispatch through the delivery bridge (Porter → Rapido)."}
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
        {alreadyDispatched ? "Book again" : "Book rider now"}
      </Button>
    </div>
  );
}
