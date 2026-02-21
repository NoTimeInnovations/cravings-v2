import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "@/app/actions/revalidate";
import plansData from "@/data/plans.json";

// Build set of all valid Razorpay plan IDs from plans.json
const VALID_RZ_PLAN_IDS = new Set(
    [...plansData.india, ...plansData.international]
        .flatMap((p: any) => [p.rz_plan_id, p.rz_plan_id_test])
        .filter(Boolean)
);

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

        if (!VALID_RZ_PLAN_IDS.has(subscription.plan_id)) {
            console.log(`Ignoring webhook for unknown plan_id: ${subscription.plan_id}`);
            return NextResponse.json({ status: "ok" });
        }

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

                if (event.payload.payment && event.payload.payment.entity) {
                    const payment = event.payload.payment.entity;
                    await recordPayment(userId, payment.amount, new Date().toISOString().split('T')[0], {
                        source: "razorpay_webhook",
                        payment_id: payment.id,
                        plan_id: subscription.plan_id,
                        notes: "Auto-charged via Razorpay"
                    });
                }
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

// Helper function to record payment
async function recordPayment(userId: string, amount: number, date: string, paymentDetails: any) {
    const mutation = `
            mutation AddPaymentWebhook($object: partner_payments_insert_input!) {
                insert_partner_payments_one(object: $object) {
                    id
                }
            }
        `;

    try {
        await fetchFromHasura(mutation, {
            object: {
                partner_id: userId,
                amount,
                date,
                payment_details: paymentDetails
            }
        });
        await revalidateTag("partner_payments");
        return true;
    } catch (e) {
        console.error("Failed to record payment", e);
        return false;
    }
}