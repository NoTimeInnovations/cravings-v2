"use server";

/**
 * Tell Petpooja who is carrying an order.
 *
 * Petpooja's POS only learns rider details for its own self-delivery orders, so
 * anything WE dispatch — a partner's own driver assigned from admin, a Delivery
 * Bridge booking, the Delivery Pool — is invisible to the restaurant unless we
 * report it. Routed through pp_menu_insert because the Petpooja credentials live
 * there; it resolves the order, checks the partner is on Petpooja, and maps the
 * status, so callers only need the rider.
 *
 * A server action rather than a client fetch so the backend URL and the call
 * itself stay off the browser (no CORS, no ad-blocker, no retry storm from a
 * component re-render).
 *
 * Never throws: a POS that misses a rider update is a degraded experience, not a
 * failed assignment, and must never break the flow that called it.
 */
export async function reportRiderToPetpooja(input: {
  orderId: string;
  /** Pool vocabulary; pp_menu_insert maps it. Assignment = "assigned". */
  status?: "assigned" | "arrived_at_pickup" | "picked_up" | "delivered";
  riderName?: string | null;
  riderPhone?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const { orderId, status = "assigned", riderName, riderPhone } = input;
  const base = process.env.NEXT_PUBLIC_PETPOOJA_BACKEND_URL;

  if (!base) return { ok: false, reason: "no backend url" };
  if (!orderId) return { ok: false, reason: "no order id" };
  // Petpooja requires both; a half-filled rider_data would just earn a 400.
  if (!riderName || !riderPhone) return { ok: false, reason: "rider name/phone missing" };

  try {
    const res = await fetch(`${base}/api/webhook/rider-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        status,
        rider_name: riderName,
        rider_phone: riderPhone,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[pp-rider] relay HTTP ${res.status} for order ${orderId}`);
      return { ok: false, reason: `http ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.warn(`[pp-rider] relay failed for order ${orderId}:`, e);
    return { ok: false, reason: "request failed" };
  }
}
