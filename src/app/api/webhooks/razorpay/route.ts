import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "@/app/actions/revalidate";

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();

        const signature = req.headers.get("x-razorpay-signature");
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!signature || !webhookSecret) {
            return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
        }

        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(bodyText)
            .digest("hex");

        if (expectedSignature !== signature) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }


        const event = JSON.parse(bodyText);
        const subscription = event.payload.subscription.entity;
        const userId = subscription.notes.partner_id;

        if (!userId) {
            console.error("Invalid user ID", userId);
            return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
        }

        console.log(`Received Webhook: ${event.event} for User: ${userId}`);

        // 5. Handle Specific Events
        switch (event.event) {

            // ✅ SUCCESSFUL RENEWAL
            case "subscription.charged":
                await updateUserSubscription(userId, {
                    status: "active",
                    expiryDate: new Date(subscription.current_end * 1000).toISOString()
                });
                break;

            // ⚠️ PAYMENT FAILED (RETRYING)
            case "subscription.pending":
                // Razorpay is trying to charge but failed once. 
                // You might want to warn the user but keep access for a few days.
                break;

            // ❌ SUBSCRIPTION HALTED (Final Failure)
            case "subscription.halted":
                await updateUserSubscription(userId, {
                    status: "halted",
                });
                break;

            // 🛑 CANCELLED
            case "subscription.cancelled":
                await updateUserSubscription(userId, {
                    status: "cancelled",
                });
                break;

            // ⏸️ PAUSED
            case "subscription.paused":
                await updateUserSubscription(userId, {
                    status: "paused"
                });
                break;

            // ▶️ RESUMED
            case "subscription.resumed":
                await updateUserSubscription(userId, {
                    status: "active",
                    expiryDate: new Date(subscription.current_end * 1000).toISOString()
                });
                break;
        }

        return NextResponse.json({ status: "ok" });

    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
    }
}

// Helper function to simulate DB update
async function updateUserSubscription(userId: string, data: any) {
    try {
        // REPLACE THIS WITH YOUR ACTUAL DB QUERY
        console.log(`Updating DB for User ${userId}:`, data);

        //get current subscription details
        const query = `
            query GetSubscription($userId: uuid!) {
            partners_by_pk(id: $userId) {
                subscription_details
            }
            }
        `;

        const variables1 = {
            userId
        };

        const response = await fetchFromHasura(query, variables1);

        const subscriptionDetails = response?.partners_by_pk?.subscription_details;

        //change subscription expirty date to today_end
        const mutation = `
    mutation UpdateSubscription($userId: uuid!, $subscription_details: jsonb!) {
      update_partners_by_pk(pk_columns: {id: $userId}, _set: {subscription_details: $subscription_details}) {
        id
      }
    }
  `;

        const variables = {
            userId,
            subscription_details: {
                ...subscriptionDetails,
                ...data,
            }
        };

        await fetchFromHasura(mutation, variables);

        await revalidateTag(userId);

        return { success: true };
    } catch (error) {
        console.error("Database Update Error:", error);
        return { success: false, error: "Failed to update subscription details" };
    }

}