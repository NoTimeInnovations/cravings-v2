import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const statusHistory = {
      "0": {
        isCompleted: true,
        completedAt: new Date().toISOString(),
      },
      "1": {
        isCompleted: false,
        completedAt: null,
      },
      "2": {
        isCompleted: false,
        completedAt: null,
      },
    };

    const response = await fetchFromHasura(
      `mutation UpdateOrder($id: uuid!, $order: orders_set_input!) {
                  update_orders_by_pk(pk_columns: {id: $id}, _set: $order) {
                      id
                  }
              }`,
      {
        id,
        order: {
          status_history: statusHistory,
        },
      }
    );

    if (response.errors) throw new Error(response.errors[0].message);

    return NextResponse.json({
      message: "Order accepted",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", message: error },
      { status: 500 }
    );
  }
}
