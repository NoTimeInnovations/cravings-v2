import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updateDeliveryBoyLocationMutation } from "@/api/deliveryBoys";

export async function POST(request: NextRequest) {
    try {
        const { delivery_boy_id, lat, lng } = await request.json();

        if (!delivery_boy_id || lat === undefined || lng === undefined) {
            return NextResponse.json({ error: "delivery_boy_id, lat, and lng are required" }, { status: 400 });
        }

        const response = await fetchFromHasura(updateDeliveryBoyLocationMutation, {
            id: delivery_boy_id,
            current_lat: lat,
            current_lng: lng,
        });

        return NextResponse.json({
            success: true,
            data: response.update_delivery_boys_by_pk,
        });
    } catch (error) {
        console.error("Location update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
