import { fetchFromHasura } from "@/lib/hasuraClient";
import { NextRequest, NextResponse } from "next/server";

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
