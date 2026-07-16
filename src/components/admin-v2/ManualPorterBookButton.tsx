"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bike, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { dispatchViaDeliveryBridge } from "@/app/actions/porterBridge";

/**
 * Manual "Book rider now" for porter_bridge partners. Books the order through
 * the delivery bridge (Porter → Uber → Rapido) on demand — the primary control
 * when a partner turns off auto-dispatch, and a force/re-trigger otherwise.
 * The parent hides it once a dispatch exists (delivery_provider_meta.dispatchId),
 * after which the DispatchProgressPanel tracks the ride.
 */
export default function ManualPorterBookButton({ orderId }: { orderId: string }) {
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
        <p className="font-medium">Book a rider</p>
        <p className="text-xs text-muted-foreground">
          Dispatch through the delivery bridge (Porter → Uber → Rapido).
        </p>
      </div>
      <Button onClick={book} disabled={busy} size="sm" className="shrink-0">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
        ) : (
          <Bike className="h-4 w-4 mr-1.5" />
        )}
        Book rider now
      </Button>
    </div>
  );
}
