"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "@/app/actions/revalidate";

interface AddPaymentParams {
  partnerId: string;
  amount: number;
  date: string;
  paymentDetails?: any;
}

export async function addPaymentV2(params: AddPaymentParams) {
  const { partnerId, amount, date, paymentDetails } = params;

  const mutation = `
    mutation AddPaymentV2($object: partner_payments_insert_input!) {
      insert_partner_payments_one(object: $object) {
        id
        amount
        date
        partner_id
        payment_details
      }
    }
  `;

  try {
    const result = await fetchFromHasura(mutation, {
      object: {
        partner_id: partnerId,
        amount,
        date,
        payment_details: paymentDetails,
      },
    });

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    await revalidateTag("partner_payments");
    return { success: true, data: result.insert_partner_payments_one };
  } catch (error) {
    console.error("Error adding payment:", error);
    return { success: false, error: "Failed to add payment" };
  }
}

export async function updateSubscriptionV2(partnerId: string, subscriptionDetails: any) {
  const mutation = `
    mutation UpdateSubscriptionV2($id: uuid!, $subscription_details: jsonb!) {
      update_partners_by_pk(pk_columns: {id: $id}, _set: {subscription_details: $subscription_details}) {
        id
        subscription_details
      }
    }
  `;

  try {
    const result = await fetchFromHasura(mutation, {
      id: partnerId,
      subscription_details: subscriptionDetails,
    });

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    await revalidateTag(`${partnerId}`);
    return { success: true, data: result.update_partners_by_pk };
  } catch (error) {
    console.error("Error updating subscription:", error);
    return { success: false, error: "Failed to update subscription" };
  }
}

export async function getPaymentHistory(partnerId: string) {
  const query = `
    query GetPaymentHistory($partner_id: uuid!) {
      partner_payments(where: {partner_id: {_eq: $partner_id}}, order_by: {date: desc}) {
        id
        amount
        date
        payment_details
      }
    }
  `;

  try {
    const result = await fetchFromHasura(query, { partner_id: partnerId });
    return { success: true, data: result.partner_payments };
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return { success: false, error: "Failed to fetch payment history" };
  }
}
