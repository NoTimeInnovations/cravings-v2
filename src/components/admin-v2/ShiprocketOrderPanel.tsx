"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { getShipmentForOrder, shipOrderNow } from "@/app/actions/shiprocketDispatch";
import { LIVE_SHIPMENT_STATUSES, type ShipmentView } from "@/lib/shiprocket/types";

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
/**
 * How the shipment was actually sent. Shown because the settings panel is
 * self-saving: a partner can switch the store to Parcel, ship without pressing
 * Save, and get a Quick booking — and with nothing on the order saying which was
 * used, the only symptom is a rider turning up for a parcel job.
 */
const MODE_TEXT: Record<string, string> = {
    parcel: "Parcel courier",
    hyperlocal: "Shiprocket Quick",
};

/** Mirrors STALE_CLAIM_MS in shiprocketDispatch — the age at which the server
 *  stops believing a claim is still in flight. */
const STALE_CLAIM_MS = 15 * 60 * 1000;

/** What each live state says on the order. Keys come from the webhook. */
const LIVE_TEXT: Partial<Record<ShipmentView["status"], string>> = {
    awb_assigned: "Courier booked",
    pickup_requested: "Pickup scheduled",
    in_transit: "On the way",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    rto: "Returning to store",
};

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

    // A shipment that is genuinely in flight — including the webhook-driven states
    // (in transit, delivered, RTO). `created` is excluded on purpose: the
    // Shiprocket order exists but has no courier, which is the state that most
    // needs a retry — and the server RESUMES that one at the courier step rather
    // than creating (and billing) a second order.
    const live = !!shipment && LIVE_SHIPMENT_STATUSES.has(shipment.status);
    // A send that is genuinely mid-flight — but only while it is FRESH. A claim
    // whose function was killed (deploy, timeout, Shiprocket hanging) leaves the
    // row at `claimed` forever, and treating that as in-flight disabled the button
    // in exactly the state that needs pressing: the order was wedged with
    // "Sending to Shiprocket…" and no way out. The server ages a stale claim out at
    // 15 minutes, so past that the panel offers the recovery instead.
    const claimAgeMs = shipment?.updatedAt ? Date.now() - Date.parse(shipment.updatedAt) : 0;
    const staleClaim =
        shipment?.status === "claimed" && Number.isFinite(claimAgeMs) && claimAgeMs > STALE_CLAIM_MS;
    const inFlight = shipment?.status === "claimed" && !staleClaim;
    // A hyperlocal send that worked and is waiting for a rider. The row sits at
    // `created` with a last_error that is really a status line, so it must not be
    // painted as a failure — a merchant who reads it as one presses Ship again and
    // pays for a second rider search.
    const searchingForRider =
        shipment?.status === "created" &&
        !!shipment?.lastError &&
        /searching for a rider/i.test(shipment.lastError);
    // The Shiprocket order exists but we never recorded its shipment id, so the
    // server cannot resume it at the courier step and re-creating would bill twice.
    const unresumable = shipment?.status === "created" && !shipment?.shipmentId;
    // We do not know whether Shiprocket has this order. Retrying may create a
    // SECOND real parcel, so the button says so rather than reading like a no-op.
    const ambiguous = shipment?.status === "unknown";
    // Cancelled — here or in the Shiprocket panel. Pressing does NOT retry
    // anything: the old Shiprocket order is dead and unreusable, so this books a
    // whole new one under a new reference. The button says "Ship again" rather
    // than "Try again" because those are different acts and only one of them
    // costs money a second time.
    const cancelled = shipment?.status === "cancelled";

    const label = live
        ? "Shipped"
        : inFlight
          ? "Sending…"
          : searchingForRider
            ? "Finding a rider…"
            : ambiguous || staleClaim
              ? "Ship anyway"
              : cancelled
                ? "Ship again"
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
                        {shipment?.mode && MODE_TEXT[shipment.mode] && (
                            <span className="font-normal text-xs text-muted-foreground">
                                · {MODE_TEXT[shipment.mode]}
                            </span>
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {!shipment
                            ? "Not shipped yet."
                            : live
                              ? `${LIVE_TEXT[shipment.status] ?? "On its way"} · ${shipment.courierName ?? "Courier"}${
                                    shipment.awbCode ? ` · AWB ${shipment.awbCode}` : ""
                                }`
                              : searchingForRider
                                ? "Sent to Shiprocket Quick — waiting for a rider to accept. The tracking number appears here when one does."
                                : unresumable
                                  ? "Created at Shiprocket, but we have no shipment id for it — finish or cancel this one in your Shiprocket panel."
                                  : staleClaim
                                    ? "The last send never finished. We cannot tell whether Shiprocket accepted it."
                                    : shipment.status === "created"
                                      ? "Order created at Shiprocket, but no courier assigned yet."
                                : cancelled
                                  ? "Shipment cancelled. Ship again to book a new one."
                                  : inFlight
                                    ? "Sending to Shiprocket…"
                                    : ambiguous
                                      ? "Shiprocket didn't respond — check your panel before retrying."
                                      : "Last attempt failed."}
                    </p>
                </div>
                <Button
                    onClick={ship}
                    disabled={busy || live || inFlight || searchingForRider || unresumable}
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

            {/* Not red when cancelled: nothing failed there, and a red box on an
                expected outcome trains people to ignore the red boxes. */}
            {shipment?.lastError && !live && !cancelled && !searchingForRider && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2.5 py-2">
                    {shipment.lastError}
                </p>
            )}

            {cancelled && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2.5 py-2">
                    {shipment?.lastError ??
                        "This shipment was cancelled, and a cancelled Shiprocket order can never be reused."}{" "}
                    Shipping again is a <span className="font-semibold">new</span> booking, billed
                    separately.
                </p>
            )}

            {(ambiguous || staleClaim) && (
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
