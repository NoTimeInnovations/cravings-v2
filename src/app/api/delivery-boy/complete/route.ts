import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { markOrderDeliveredMutation } from "@/api/deliveryBoys";
import { setStatusHistory } from "@/lib/statusHistory";

const NOTIFICATION_SERVER_URL = "https://notification-server-khaki.vercel.app";

export async function POST(request: NextRequest) {
    try {
        const { order_id, delivery_boy_id } = await request.json();

        if (!order_id || !delivery_boy_id) {
            return NextResponse.json({ error: "order_id and delivery_boy_id are required" }, { status: 400 });
        }

        // Verify the delivery boy is assigned to this order
        const orderCheck = await fetchFromHasura(`
            query CheckOrder($order_id: uuid!) {
                orders_by_pk(id: $order_id) {
                    id
                    delivery_boy_id
                    status
                    status_history
                    user_id
                    partner_id
                    partner {
                        store_name
                    }
                }
            }
        `, { order_id });

        const order = orderCheck.orders_by_pk;
        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (order.delivery_boy_id !== delivery_boy_id) {
            return NextResponse.json({ error: "You are not assigned to this order" }, { status: 403 });
        }

        if (order.status === "completed") {
            return NextResponse.json({ error: "Order is already completed" }, { status: 400 });
        }

        // Update status history - mark step 2 (completed) as done
        const updatedStatusHistory = setStatusHistory(
            order.status_history || {},
            2,
            { isCompleted: true, completedAt: new Date().toISOString() }
        );

        // Mark order as delivered
        await fetchFromHasura(markOrderDeliveredMutation, {
            order_id,
            status_history: updatedStatusHistory,
        });

        // Send FCM notification to customer
        if (order.user_id) {
            try {
                const { device_tokens } = await fetchFromHasura(`
                    query GetUserDeviceTokens($userId: String!, $partnerId: uuid) {
                        device_tokens(where: {
                            user_id: {_eq: $userId},
                            _or: [
                                {partner_id: {_eq: $partnerId}},
                                {partner_id: {_is_null: true}}
                            ]
                        }) {
                            device_token
                        }
                    }
                `, { userId: order.user_id, partnerId: order.partner_id || null });

                const tokens = device_tokens?.map((t: { device_token: string }) => t.device_token) || [];

                if (tokens.length > 0) {
                    await fetch(`${NOTIFICATION_SERVER_URL}/api/notifications/send`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: {
                                tokens,
                                notification: {
                                    title: "Order Delivered",
                                    body: `Your order from ${order.partner?.store_name || "the restaurant"} has been delivered!`,
                                },
                                android: {
                                    priority: "high",
                                    notification: {
                                        icon: "ic_stat_logo",
                                        channelId: "cravings_channel_2",
                                        sound: "default_sound",
                                    },
                                },
                                apns: {
                                    headers: { "apns-priority": "10" },
                                    payload: { aps: { sound: "default_sound.caf", contentAvailable: true } },
                                },
                                data: {
                                    url: `https://menuthere.com/order/${order_id}`,
                                    channel_id: "cravings_channel_2",
                                    sound: "default_sound",
                                },
                            },
                        }),
                    });
                }
            } catch (notifError) {
                console.error("Failed to send delivery notification:", notifError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Mark delivered error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
