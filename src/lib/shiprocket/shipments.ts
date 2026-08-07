// SERVER-ONLY shipment-row I/O for Shiprocket.
//
// A PLAIN module, deliberately NOT "use server" — see the header of ./creds.ts.
// These functions do NOT authorize: they are the shared core that both the
// guarded server actions in src/app/actions/shiprocketDispatch.ts and the
// already-authorized cancel path in src/app/actions/cancelOrder.ts call. Putting
// them here instead of exporting them from an action file is what keeps them off
// the public RPC surface.

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { cancelShiprocketOrder } from "./client";
import type { ShipmentStatus, ShipmentView } from "./types";

if (typeof window !== "undefined") {
  throw new Error("src/lib/shiprocket/shipments.ts is server-only.");
}

export const SHIPMENT_FIELDS = `
  order_id mode status sr_order_ref sr_order_id shipment_id awb_code
  courier_name label_url tracking_url attempt last_error updated_at
`;

export function toShipmentView(r: any): ShipmentView {
  return {
    orderId: r.order_id,
    mode: r.mode ?? null,
    status: r.status,
    srOrderRef: r.sr_order_ref ?? null,
    srOrderId: r.sr_order_id ?? null,
    shipmentId: r.shipment_id ?? null,
    awbCode: r.awb_code ?? null,
    courierName: r.courier_name ?? null,
    labelUrl: r.label_url ?? null,
    trackingUrl: r.tracking_url ?? null,
    attempt: r.attempt ?? 1,
    lastError: r.last_error ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export async function getShipmentRow(orderId: string): Promise<ShipmentView | null> {
  if (!orderId) return null;
  try {
    const data = await fetchFromHasuraServer(
      `query Shipment($id: uuid!) {
        shiprocket_shipments_by_pk(order_id: $id) { ${SHIPMENT_FIELDS} }
      }`,
      { id: orderId },
    );
    const row = (data as any)?.shiprocket_shipments_by_pk;
    return row ? toShipmentView(row) : null;
  } catch (e) {
    console.warn("[shiprocket] shipment lookup failed", (e as Error)?.message);
    return null;
  }
}

export async function persistShipment(
  orderId: string,
  set: Record<string, unknown>,
): Promise<void> {
  try {
    await fetchFromHasuraServer(
      `mutation UpdateShipment($id: uuid!, $set: shiprocket_shipments_set_input!) {
        update_shiprocket_shipments_by_pk(pk_columns: { order_id: $id }, _set: $set) { order_id }
      }`,
      { id: orderId, set: { ...set, updated_at: new Date().toISOString() } },
    );
  } catch (e) {
    console.warn("[shiprocket] persistShipment failed", (e as Error)?.message);
  }
}

/**
 * Write to the shipment row ONLY IF it has not been cancelled underneath us.
 *
 * A dispatch is a chain of slow HTTP calls — create, courier list, AWB, pickup,
 * label — each with a 20s timeout, so it holds the row for tens of seconds. In
 * that window the customer or the partner can cancel the order, which writes
 * `cancelled` here. With an unconditional write the dispatch simply stamped
 * `created` and then `awb_assigned` over the top, and a courier collected a real,
 * billed parcel for an order that no longer existed — with the row showing a
 * healthy shipment, so nobody could see it had happened.
 *
 * Returns false when the row was cancelled, which is the caller's signal to undo
 * upstream rather than carry on.
 */
export async function persistShipmentUnlessCancelled(
  orderId: string,
  set: Record<string, unknown>,
): Promise<boolean> {
  try {
    const data = await fetchFromHasuraServer(
      `mutation UpdateShipmentUnlessCancelled($id: uuid!, $set: shiprocket_shipments_set_input!) {
        update_shiprocket_shipments(
          where: { order_id: { _eq: $id }, status: { _neq: "cancelled" } },
          _set: $set
        ) { affected_rows }
      }`,
      { id: orderId, set: { ...set, updated_at: new Date().toISOString() } },
    );
    return ((data as any)?.update_shiprocket_shipments?.affected_rows ?? 0) > 0;
  } catch (e) {
    console.warn("[shiprocket] guarded persist failed", (e as Error)?.message);
    // A failed WRITE is not evidence the row was cancelled. Saying "cancelled"
    // here would make the dispatch cancel a perfectly good parcel upstream, so a
    // transient Hasura error deliberately reads as "carry on".
    return true;
  }
}

export async function partnerIdForOrder(orderId: string): Promise<string | null> {
  try {
    const data = await fetchFromHasuraServer(
      `query OrderPartner($id: uuid!) { orders_by_pk(id: $id) { partner_id } }`,
      { id: orderId },
    );
    return (data as any)?.orders_by_pk?.partner_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Cancel an order's Shiprocket shipment. UNAUTHORIZED — the caller must already
 * have established that the actor may act on this order.
 *
 * The row goes to `cancelled` even when Shiprocket refuses the cancel, because the
 * local order is gone either way and leaving the row mid-flight would wedge it.
 * But `cancelled` is deliberately NOT auto-re-claimable: Shiprocket will not
 * cancel a parcel already out for pickup, so a refused cancel can mean a real
 * parcel is still in transit — and an automatic re-book on the next status change
 * would put a second one on the road. Re-shipping is a manual decision, and it
 * gets a fresh -R reference because the original is burned forever.
 */
export async function cancelShipmentCore(
  orderId: string,
): Promise<{ ok: true; skipped?: string } | { ok: false; message: string }> {
  const shipment = await getShipmentRow(orderId);
  if (!shipment) return { ok: true, skipped: "no shipment on this order" };
  if (shipment.status === "cancelled") return { ok: true, skipped: "already cancelled" };

  const partnerId = await partnerIdForOrder(orderId);
  if (!partnerId) return { ok: false, message: "order not found" };

  let message: string | null = null;
  if (shipment.srOrderId) {
    const res = await cancelShiprocketOrder(partnerId, shipment.srOrderId);
    if (!res.ok) {
      message = res.message;
      console.warn(`[shiprocket] order=${orderId} cancel rejected: ${res.message}`);
    }
  }

  // What we tell the partner afterwards depends on what we could actually reach.
  //
  //  claimed  — a dispatch is IN FLIGHT and has no Shiprocket id yet, so there is
  //             nothing to cancel upstream from here. Writing `cancelled` is what
  //             stops it: every post-create write in dispatchShiprocket is guarded
  //             on this row not being cancelled, and the dispatch undoes its own
  //             order when it sees the guard fail.
  //  unknown  — we never learned whether Shiprocket created the order, so a real
  //             parcel may exist under sr_order_ref. That warning is the only
  //             record of it and must NOT be cleared just because someone
  //             cancelled here; it is the thing a human needs to act on.
  const notes: string[] = [];
  if (message) notes.push(`Cancelled here; Shiprocket said: ${message}`);
  if (shipment.status === "claimed" && !shipment.srOrderId) {
    notes.push("Cancelled while a send was in flight — it will be withdrawn at Shiprocket automatically.");
  }
  if (shipment.status === "unknown") {
    notes.push(
      `Cancelled here, but Shiprocket may still hold reference ${shipment.srOrderRef ?? "(unknown)"} — check your Shiprocket panel and cancel it there.`,
    );
    if (shipment.lastError) notes.push(shipment.lastError);
  }

  await persistShipment(orderId, {
    status: "cancelled" as ShipmentStatus,
    last_error: notes.length ? notes.join(" ").slice(0, 500) : null,
  });
  return { ok: true };
}
