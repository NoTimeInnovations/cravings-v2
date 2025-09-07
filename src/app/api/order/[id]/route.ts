import { fetchFromHasura } from "@/lib/hasuraClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const { orders_by_pk } = await fetchFromHasura(
      `
        query GetOrder($id: uuid!) {
          orders_by_pk(id: $id) {
            id
            total_price
            created_at
            notes
            table_number
            qr_id
            type
            delivery_address
            delivery_location
            status
            status_history
            partner_id
            partner {
              gst_percentage
              currency
              store_name
            }
            gst_included
            extra_charges
            phone
            user_id
            user {
              full_name
              phone
              email
            }
            partner {
              name
              currency
            }
            order_items {
              id
              quantity
              item
            }
          }
        }
      `,
      { id }
    );

    if (!orders_by_pk) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(orders_by_pk);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
