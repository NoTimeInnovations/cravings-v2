"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { sendUpgradeEmail } from "@/lib/email";

const UPDATE_PARTNER_SUBSCRIPTION = `
mutation UpdatePartnerSubscription($id: uuid!, $subscription_details: jsonb!, $feature_flags: String!, $updated_at: timestamptz!) {
  update_partners_by_pk(pk_columns: {id: $id}, _set: {subscription_details: $subscription_details, feature_flags: $feature_flags, updated_at: $updated_at}) {
    id
    name
    email
  }
}
`;

export async function upgradePlan(partnerId: string, newPlan: any, isFreePlanUsed: boolean = false) {
    try {
        const now = new Date();
        const effectivePeriod = newPlan.period_days || 365;
        const isFreePlanTarget = effectivePeriod === -1;

        const expiryDate = isFreePlanTarget
            ? null
            : new Date(now.getTime() + effectivePeriod * 24 * 60 * 60 * 1000);

        const subscriptionDetails = {
            plan: newPlan,
            status: "active",
            startDate: now.toISOString(),
            expiryDate: expiryDate ? expiryDate.toISOString() : null,
            isFreePlanUsed,
        };

        // Generate feature flags based on plan's features_enabled map
        const defaultFlags = [
            "ordering-false",
            "delivery-false",
            "multiwhatsapp-false",
            "pos-false",
            "stockmanagement-false",
            "captainordering-false",
            "purchasemanagement-false",
        ];
        const enabledMap = newPlan.features_enabled || {};
        const finalFlags = defaultFlags.map(flag => {
            const [key] = flag.split("-");
            if (enabledMap[key]) return `${key}-true`;
            return flag;
        });
        const featureFlagsStr = finalFlags.join(",");

        const response = await fetchFromHasura(UPDATE_PARTNER_SUBSCRIPTION, {
            id: partnerId,
            subscription_details: subscriptionDetails,
            feature_flags: featureFlagsStr,
            updated_at: new Date().toISOString()
        });

        const updatedPartner = response?.update_partners_by_pk;

        if (!updatedPartner) {
            throw new Error("Failed to update partner");
        }

        // Send Email
        await sendUpgradeEmail(updatedPartner.email, {
            partnerName: updatedPartner.name,
            newPlanName: newPlan.name,
            features: newPlan.features || []
        });

        return { success: true };

    } catch (error) {
        console.error("Upgrade plan failed:", error);
        return { success: false, error: "Upgrade failed" };
    }
}
