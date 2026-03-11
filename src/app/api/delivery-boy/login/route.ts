import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { loginDeliveryBoyQuery } from "@/api/deliveryBoys";

export async function POST(request: NextRequest) {
    try {
        const { phone, password, device_token, platform } = await request.json();

        if (!phone || !password) {
            return NextResponse.json({ error: "Phone and password are required" }, { status: 400 });
        }

        const response = await fetchFromHasura(loginDeliveryBoyQuery, { phone, password });

        if (!response.delivery_boys || response.delivery_boys.length === 0) {
            return NextResponse.json({ error: "Invalid credentials or account is inactive" }, { status: 401 });
        }

        const deliveryBoy = response.delivery_boys[0];

        // Save device token to device_tokens table if provided
        if (device_token) {
            await fetchFromHasura(`
                mutation InsertOrUpdateDeviceToken($object: device_tokens_insert_input!) {
                    insert_device_tokens_one(
                        object: $object,
                        on_conflict: {
                            constraint: device_tokens_user_id_device_token_key,
                            update_columns: [platform, updated_at]
                        }
                    ) {
                        id
                    }
                }
            `, {
                object: {
                    device_token,
                    user_id: deliveryBoy.id,
                    platform: platform || "android",
                    updated_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                },
            });
        }

        return NextResponse.json({
            delivery_boy: deliveryBoy,
        });
    } catch (error) {
        console.error("Delivery boy login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
