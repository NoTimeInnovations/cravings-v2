"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "@/app/actions/revalidate";
import plans from "@/data/plans.json";

export async function fixPartnerSubscription(partnerId: string) {
  try {
    // 1. Get Partner Country and details
    const getQuery = `
            query GetPartner($id: uuid!) {
              partners_by_pk(id: $id) {
                id
                country
                subscription_details
              }
            }
        `;
    const { partners_by_pk: partner } = await fetchFromHasura(getQuery, { id: partnerId });

    if (!partner) throw new Error("Partner not found");

    const isIndia = partner.country === "IN";
    const defaultPlan = isIndia
      ? plans.india.find((p) => p.id === "in_trial")
      : plans.international.find((p) => p.id === "int_free");

    let subDetails = partner.subscription_details || {
      status: "active",
      usage: { scans_cycle: 0, last_reset: new Date().toISOString() }
    };

    // Fix logic: Assign plan
    subDetails.plan = defaultPlan;

    // Ensure usage exists
    if (!subDetails.usage) {
      subDetails.usage = { scans_cycle: 0, last_reset: new Date().toISOString() };
    }
    if (!subDetails.status) subDetails.status = "active";


    const mutation = `
      mutation FixSubscription($id: uuid!, $details: jsonb!) {
        update_partners_by_pk(pk_columns: {id: $id}, _set: {subscription_details: $details}) {
          id
        }
      }
    `;

    await fetchFromHasura(mutation, { id: partnerId, details: subDetails });
    revalidateTag(partnerId);
    return { success: true };
  } catch (error) {
    console.error("Error fixing subscription:", error);
    return { success: false, error: String(error) };
  }
}
