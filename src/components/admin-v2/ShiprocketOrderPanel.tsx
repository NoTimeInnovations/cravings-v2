"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { getShipmentForOrder, shipOrderNow } from "@/app/actions/shiprocketDispatch";
import type { ShipmentView } from "@/lib/shiprocket/types";

/**
 * Shiprocket panel on an order: current shipment state, and the manual Ship
 * button.
 *
 * The button never disappears once a shipment exists — it changes what it says.
 * A shipment that failed, or one whose courier could not be assigned, is exactly
 * when the person looking at the order needs the control, and hiding it is how the
 * porter flow left partners stuck. It IS disabled once a parcel really is on its
 * way, because a second send would bill the store again for the same order.
 */
export default function ShiprocketOrderPanel({
    orderId,
    orderStatus,
}: {
    orderId: string;
    /** The order's current status. Auto-dispatch fires on a status change made on
     *  THIS screen, so the panel has to re-read when it moves or it keeps showing
     *  "Not shipped yet" next to a parcel that was just booked. */
    orderStatus?: string;
}) {
    const [shipment, setShipment] = useState<ShipmentView | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            setShipment(await getShipmentForOrder(orderId));
        } catch {
            /* the panel is informational; a read failure just leaves it blank */
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        // Auto-dispatch is fire-and-forget and takes a few seconds (create → AWB →
        // pickup → label), so a single read on the status change would land before
        // the shipment row exists. Re-read a couple of times, then stop.
        load();
        if (!orderStatus) return;
        const timers = [3000, 8000].map((ms) => setTimeout(load, ms));
        return () => timers.forEach(clearTimeout);
    }, [load, orderStatus]);

    const ship = async () => {
        setBusy(true);
        try {
            const r = await shipOrderNow(orderId);
            if (r.ok) {
                if (r.skipped) toast.info(`Shiprocket: ${r.skipped}`);
                else if (r.awb) toast.success(`Shipped via ${r.courier ?? "Shiprocket"} · AWB ${r.awb}`);
                else toast.success("Sent to Shiprocket");
            } else {
                toast.error(r.message || "Could not ship this order");
            }
            await load();
        } catch (e) {
            toast.error((e as Error).message || "Could not ship this order");
        } finally {
            setBusy(false);
        }
    };

    if (loading) return null;

    // A shipment that is genuinely in flight. `created` is excluded on purpose:
    // the Shiprocket order exists but has no courier, which is the state that most
    // needs a retry — and the server RESUMES that one at the courier step rather
    // than creating (and billing) a second order.
    const live = shipment?.status === "awb_assigned" || shipment?.status === "pickup_requested";
    // A send that is genuinely mid-flight. Pressing again would only be refused.
    const inFlight = shipment?.status === "claimed";
    // We do not know whether Shiprocket has this order. Retrying may create a
    // SECOND real parcel, so the button says so rather than reading like a no-op.
    const ambiguous = shipment?.status === "unknown";

    const label = live
        ? "Shipped"
        : inFlight
          ? "Sending…"
          : ambiguous
            ? "Ship anyway"
            : shipment
              ? "Try again"
              : "Ship with Shiprocket";

    return (
        <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                    <p className="font-medium flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-orange-600" />
                        Shiprocket
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {!shipment
                            ? "Not shipped yet."
                            : live
                              ? `${shipment.courierName ?? "Courier"} · AWB ${shipment.awbCode}`
                              : shipment.status === "created"
                                ? "Order created at Shiprocket, but no courier assigned yet."
                                : shipment.status === "cancelled"
                                  ? "Shipment cancelled."
                                  : inFlight
                                    ? "Sending to Shiprocket…"
                                    : ambiguous
                                      ? "Shiprocket didn't respond — check your panel before retrying."
                                      : "Last attempt failed."}
                    </p>
                </div>
                <Button
                    onClick={ship}
                    disabled={busy || live || inFlight}
                    size="sm"
                    variant={shipment ? "outline" : "default"}
                    className="shrink-0"
                >
                    {busy ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                        <PackageCheck className="h-4 w-4 mr-1.5" />
                    )}
                    {label}
                </Button>
            </div>

            {shipment?.lastError && !live && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2.5 py-2">
                    {shipment.lastError}
                </p>
            )}

            {ambiguous && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2.5 py-2">
                    Shipping again sends a <span className="font-semibold">new</span> reference.
                    If the first one did go through, you will be billed for two parcels — open
                    Shiprocket and check before pressing.
                </p>
            )}

            {(shipment?.trackingUrl || shipment?.labelUrl) && (
                <div className="flex flex-wrap gap-3 text-xs">
                    {shipment.trackingUrl && (
                        <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-orange-700 hover:underline"
                        >
                            Track parcel <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                    {shipment.labelUrl && (
                        <a
                            href={shipment.labelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-orange-700 hover:underline"
                        >
                            Print label <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>
            )}

            {shipment && shipment.attempt > 1 && (
                <p className="text-[11px] text-muted-foreground">
                    Attempt {shipment.attempt}. Each retry is sent to Shiprocket under a new
                    reference — the earlier one can never be reused.
                </p>
            )}
        </div>
    );
}
