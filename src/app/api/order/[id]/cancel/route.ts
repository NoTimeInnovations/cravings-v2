import { fetchFromHasura } from "@/lib/hasuraClient";
import { restockOrderStock } from "@/app/actions/restockOrder";
import { cancelShipmentCore } from "@/lib/shiprocket/shipments";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cancel an order.
 *
 * ⚠ This route flips orders.status directly and runs almost none of the
 * cancellation hooks that cancelOrderAction does — no Porter withdrawal, no
 * delivery-pool cancel, no loyalty refund — and it has NO authentication, so any
 * caller holding an order id can cancel it. Prefer cancelOrderAction; this exists
 * for older callers.
 *
 * The Shiprocket cancel below is not optional the way the others might be: a
 * booked parcel that nobody withdraws means a courier still collects, the merchant
 * is still billed, and the order it belonged to no longer exists.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetchFromHasura(
      `mutation UpdateOrderStatus($orderId: uuid!, $status: String!) {
            update_orders_by_pk(pk_columns: {id: $orderId}, _set: {status: $status}) {
              id
              status
            }
          }`,
      { orderId: id, status: "cancelled" }
    );

    if (response.errors) throw new Error(response.errors[0].message);

    // Add the cancelled order's stock back (idempotent via RELEASE gate).
    await restockOrderStock(id);

    // Withdraw any Shiprocket parcel. Awaited rather than detached: a serverless
    // invocation is finalized the moment the response returns, so a floating
    // promise here is routinely killed before it reaches Shiprocket. Its failure
    // must not fail the cancel — the order is already cancelled by this point.
    try {
      await cancelShipmentCore(id);
    } catch (e) {
      console.warn(`[order-cancel] shiprocket cancel failed for ${id}:`, (e as Error)?.message);
    }

    return NextResponse.json({
      message: "Order cancelled",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", message: error },
      { status: 500 }
    );
  }
}
