"use server";

import Razorpay from "razorpay";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "./revalidate";
import plansData from "@/data/plans.json";
import { applyPlanFeatureFlags } from "@/lib/planFeatureFlags";

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

function findPlan(internalPlanId: string): any | null {
    const all = [...plansData.india, ...plansData.international] as any[];
    return all.find((p) => p.id === internalPlanId) || null;
}

// Pick the correct Razorpay plan id for the active key mode. Test keys (rzp_test_*)
// use rz_plan_id_test (falling back to the live id, harmless in test). LIVE keys use
// ONLY rz_plan_id — never the test id — so a misconfigured plan fails loudly instead
// of silently routing a real payment to a sandbox plan.
function resolveRzPlanId(internalPlanId: string): string {
    const plan = findPlan(internalPlanId);
    if (!plan) return "";
    const isTestKey = (process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test");
    const test = plan.rz_plan_id_test || "";
    const live = plan.rz_plan_id || "";
    return (isTestKey ? test || live : live) || "";
}

// Parse a plan price string ("₹3000", "$19") into an integer paise/cents amount
// for the partner_payments table (billing UI divides by 100 for display).
function priceToMinorUnits(price: unknown): number {
    const n = parseFloat(String(price ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export async function createSubscriptionAction(internalPlanId: string, userId: string, storeName: string) {
    try {
        const razorpayPlanId = resolveRzPlanId(internalPlanId);

        console.log("Creating a subscription with", internalPlanId, razorpayPlanId);

        if (!razorpayPlanId) {
            throw new Error("Invalid Plan: No Razorpay ID found.");
        }

        // Billing cycles before Razorpay auto-completes the subscription. Scale by
        // period so monthly ≈ 10 years (120) and yearly ≈ 10 years (10), instead of
        // a fixed 120 that would mean 120 YEARS for a yearly plan.
        const periodDays = findPlan(internalPlanId)?.period_days ?? 30;
        const totalCount = periodDays >= 365 ? 10 : 120;

        const subscription = await razorpay.subscriptions.create({
            plan_id: razorpayPlanId,
            customer_notify: 1,
            total_count: totalCount,
            quantity: 1,
            addons: [],
            notes: {
                internal_plan_id: internalPlanId,
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
    planData: any,
    currentFlags?: string | null
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

        // A. Calculate Dates — a plan with period_days -1 (free / order-capped)
        // has no date expiry.
        const now = new Date();
        const periodDays = planData.period_days ?? 365; // Default to 365 if missing
        const expiryDate =
            periodDays === -1
                ? null
                : new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

        // B. Generate Feature Flags — merge the plan's enabled features into the
        // partner's existing flags so unrelated ones (storefront, newonboarding,
        // whatsappOrdering, …) are preserved instead of being wiped on upgrade.
        // Falls back to the passed plan's inline features_enabled for plans that
        // aren't in plans.json.
        const featureFlagsString = applyPlanFeatureFlags(planData.id, currentFlags, planData.features_enabled);

        // C. Construct Subscription Object
        const subscriptionDetails = {
            plan: planData,
            status: "active",
            startDate: now.toISOString(),
            expiryDate: expiryDate ? expiryDate.toISOString() : null,
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

        return { success: true, feature_flags: featureFlagsString, subscription_details: subscriptionDetails };
    } catch (error) {
        console.error("Verification Error:", error);
        return { success: false, error: "Payment verification failed" };
    }
}



async function updatePartnerInDB(partnerId: string, data: any) {
    const mutation = `
    mutation UpdatePartnerPlan($id: uuid!, $subscription_details: jsonb!, $feature_flags: String!, $updated_at: timestamptz!) {
      update_partners_by_pk(
        pk_columns: {id: $id},
        _set: {
          subscription_details: $subscription_details,
          feature_flags: $feature_flags,
          updated_at: $updated_at
        }
      ) {
        id
        feature_flags
      }
    }
  `;

    // partner_payments.amount is a `numeric` column — the variable must be typed
    // numeric, not int, or Hasura rejects the insert (validation-failed) and the
    // payment silently never records.
    const paymentTableMutation = `mutation UpdatePayments($partner_id: uuid!, $amount: numeric!, $payment_details: jsonb!){
    insert_partner_payments_one(object: {partner_id: $partner_id, amount: $amount, payment_details: $payment_details}) {
      id
    }
  }`

    try {

        await fetchFromHasura(mutation, {
            id: partnerId,
            subscription_details: data.subscription_details,
            feature_flags: data.feature_flags,
            updated_at: new Date().toISOString(),
        });

        await fetchFromHasura(paymentTableMutation, {
            partner_id: partnerId,
            amount: priceToMinorUnits(data.subscription_details?.plan?.price),
            payment_details: data.subscription_details,
        },
        );

        await revalidateTag(partnerId);

    } catch (error) {
        console.error("Database Update Error:", error);
        return { success: false, error: "Failed to update subscription details" };
    }
}