"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { incrementStockForOrder } from "@/lib/stockDecrement";
import { revalidateTag } from "@/app/actions/revalidate";

// Atomically RELEASE an order's stock claim: true -> false, and return the order
// lines so we can add the quantities back. affected_rows === 1 means THIS call
// won the release (so it should restock); 0 means the order never held stock or
// was already restocked — a no-op. This is the single idempotency gate shared by
// every cancel/expire/delete path, so stock is restocked at most once.
const RELEASE_STOCK = `
  mutation ReleaseOrderStock($id: uuid!) {
    update_orders(
      where: { id: { _eq: $id }, stock_committed: { _eq: true } }
      _set: { stock_committed: false }
    ) {
      affected_rows
      returning {
        id
        partner_id
        stock_date
        scheduled_date
        created_at
        partner { feature_flags }
        order_items { quantity item menu { id } }
      }
    }
  }
`;

// Restaurant-local "YYYY-MM-DD" fallback for an immediate order with no
// scheduled_date and no persisted stock_date (the business operates in India).
const APP_TIME_ZONE = "Asia/Kolkata";
function tzToday(createdAt: string | null | undefined): string {
  const d = createdAt ? new Date(createdAt) : new Date();
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(d);
}

// Return the stock an order consumed at placement. Safe to call from any
// cancel / expire / hard-delete path — the atomic RELEASE guarantees the
// increment runs at most once even if two paths race. Best-effort: never throws.
export async function restockOrderStock(orderId: string): Promise<void> {
  if (!orderId) return;
  let res: any;
  try {
    res = await fetchFromHasura(RELEASE_STOCK, { id: orderId });
  } catch (e) {
    console.error("[restockOrder] release failed", orderId, e);
    return;
  }
  const affected = res?.update_orders?.affected_rows ?? 0;
  if (affected !== 1) return; // never committed, or already restocked

  const o = res?.update_orders?.returning?.[0];
  if (!o) return;

  // Same bucket the decrement used: persisted stock_date, else scheduled_date,
  // else app-local placement day. Global items ignore the date.
  const stockDate = o.stock_date || o.scheduled_date || tzToday(o.created_at);

  try {
    await incrementStockForOrder(
      (o.order_items || [])
        // Freebies never consumed stock at decrement, so don't add them back.
        .filter((oi: any) => !oi?.item?.is_freebie)
        .map((oi: any) => ({
          menuId: oi?.menu?.id,
          quantity: oi?.quantity,
        })),
      { stockDate },
    );
    if (o.partner_id) revalidateTag(o.partner_id);
  } catch (e) {
    console.error("[restockOrder] increment failed", orderId, e);
  }
}
