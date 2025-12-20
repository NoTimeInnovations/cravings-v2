"use server";

import Razorpay from "razorpay";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "./revalidate";

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});


export async function createSubscriptionAction(planId: string, razorpayPlanId: string, userId: string, storeName: string) {
    try {

        console.log("Creating a subscription with", planId, razorpayPlanId)

        if (!razorpayPlanId) {
            throw new Error("Invalid Plan: No Razorpay ID found.");
        }

        const subscription = await razorpay.subscriptions.create({
            plan_id: razorpayPlanId,
            customer_notify: 1,
            total_count: 10,
            quantity: 1,
            addons: [],
            notes: {
                internal_plan_id: planId,
                partner_id: userId,
                store_name: storeName
            },
        });

        return {
            success: true,
            subscription_id: subscription.id,
            key_id: process.env.RAZORPAY_KEY_ID,
        };

    } catch (error) {
        console.error("Razorpay Create Error:", error);
        return { success: false, error: "Failed to initiate payment" };
    }
}


export async function verifySubscriptionAction(
    paymentId: string,
    subscriptionId: string,
    signature: string,
    userId: string,
    planData: any
) {
    try {

        const secret = process.env.RAZORPAY_KEY_SECRET!;

        const generated_signature = crypto
            .createHmac("sha256", secret)
            .update(paymentId + "|" + subscriptionId)
            .digest("hex");

        if (generated_signature !== signature) {
            return { success: false, error: "Invalid Payment Signature" };
        }

        // --- PAYMENT VERIFIED: UPDATE DATABASE HERE ---

        // A. Calculate Dates
        const now = new Date();
        const periodDays = planData.period_days || 365; // Default to 365 if missing
        const expiryDate = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

        // B. Generate Feature Flags
        // Replicating client-side logic to ensure consistency
        const defaultFlags = [
            "ordering-false",
            "delivery-false",
            "multiwhatsapp-false",
            "pos-false",
            "stockmanagement-false",
            "captainordering-false",
            "purchasemanagement-false",
        ];

        const enabledMap = planData.features_enabled || {};

        const finalFlags = defaultFlags.map((flag) => {
            const [key] = flag.split("-");
            // If the plan has this feature enabled, set it to true
            if (enabledMap[key]) {
                return `${key}-true`;
            }
            return flag;
        });

        const featureFlagsString = finalFlags.join(",");

        // C. Construct Subscription Object
        const subscriptionDetails = {
            plan: planData,
            status: "active",
            startDate: now.toISOString(),
            expiryDate: expiryDate.toISOString(),
            razorpay_subscription_id: subscriptionId,
            razorpay_payment_id: paymentId,
            isFreePlanUsed: true, // If they paid, they have "used" a plan (or you might want to keep the old flag)
        };

        // D. Perform Database Update
        // Replace this with your actual DB call (Hasura Mutation example below)
        await updatePartnerInDB(userId, {
            subscription_details: subscriptionDetails,
            feature_flags: featureFlagsString,
        });

        console.log(`User ${userId} upgraded to ${planData.name}`);

        return { success: true };
    } catch (error) {
        console.error("Verification Error:", error);
        return { success: false, error: "Payment verification failed" };
    }
}



async function updatePartnerInDB(partnerId: string, data: any) {
    const mutation = `
    mutation UpdatePartnerPlan($id: uuid!, $subscription_details: jsonb!, $feature_flags: String!) {
      update_partners_by_pk(
        pk_columns: {id: $id}, 
        _set: {
          subscription_details: $subscription_details, 
          feature_flags: $feature_flags
        }
      ) {
        id
        feature_flags
      }
    }
  `;

    const paymentTableMutation = `mutation UpdatePayments($partner_id: uuid!, $amount: int!, $payment_details: jsonb!){
    insert_partner_payments_one(object: {partner_id: $partner_id, amount: $amount, payment_details: $payment_details}) {
      id
    }
  }`

    try {

        await fetchFromHasura(mutation, {
            id: partnerId,
            subscription_details: data.subscription_details,
            feature_flags: data.feature_flags,
        },
        );

        await fetchFromHasura(paymentTableMutation, {
            partner_id: partnerId,
            amount: data.subscription_details.plan.price,
            payment_details: data.subscription_details,
        },
        );

        await revalidateTag(partnerId);

    } catch (error) {
        console.error("Database Update Error:", error);
        return { success: false, error: "Failed to update subscription details" };
    }
}