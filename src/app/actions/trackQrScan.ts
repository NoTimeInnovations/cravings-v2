"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { parseISO, isSameMonth } from "date-fns";
import { INSERT_QR_SCAN } from "@/api/qrcodes";

// Query to get QR and Partner details
const GET_QR_PARTNER = `
query GetQrPartner($qrId: uuid!) {
  qr_codes_by_pk(id: $qrId) {
    id
    partner {
      id
      subscription_details
    }
  }
}
`;

const UPDATE_PARTNER_SUBSCRIPTION = `
mutation UpdatePartnerSubscription($id: uuid!, $subscription_details: jsonb!) {
  update_partners_by_pk(pk_columns: {id: $id}, _set: {subscription_details: $subscription_details}) {
    id
  }
}
`;

export async function trackQrScan(qrId: string) {
  try {
    // 1. Fetch Data
    const data = await fetchFromHasura(GET_QR_PARTNER, { qrId });
    const qrCode = data?.qr_codes_by_pk;

    if (!qrCode || !qrCode.partner) {
      return { success: false, error: "QR Code or Partner not found" };
    }

    const partner = qrCode.partner;
    let subDetails = partner.subscription_details || {
      plan: null,
      status: "active",
      usage: { scans_cycle: 0, last_reset: new Date().toISOString() }
    };

    // Initialize usage if missing
    if (!subDetails.usage) {
      subDetails.usage = { scans_cycle: 0, last_reset: new Date().toISOString() };
    }

    // 2. Check Plan & Limits
    const now = new Date();
    const lastReset = parseISO(subDetails.usage.last_reset || now.toISOString());

    // Reset if new month
    if (!isSameMonth(now, lastReset)) {
      subDetails.usage.scans_cycle = 0;
      subDetails.usage.last_reset = now.toISOString();
    }

    // Get Limit
    // Default to 1000 if not set, or -1 for unlimited
    const limit = subDetails.plan?.scan_limit;
    // If limit is undefined, assume some default or unlimited? 
    // Based on plans.json, free trial has 1000, others have limits or -1.

    const effectiveLimit = limit === undefined ? 1000 : limit;

    if (effectiveLimit !== -1 && subDetails.usage.scans_cycle >= effectiveLimit) {
      return { success: false, error: "Scan limit reached", limitReached: true };
    }

    // 3. Increment
    subDetails.usage.scans_cycle += 1;

    // 4. Save
    await fetchFromHasura(UPDATE_PARTNER_SUBSCRIPTION, {
      id: partner.id,
      subscription_details: subDetails
    });

    // 5. Track Scan in Analytics Table
    await fetchFromHasura(INSERT_QR_SCAN, {
      qr_id: qrId
    });

    return { success: true };

  } catch (error) {
    console.error("trackQrScan failed:", error);
    return { success: false, error: "Tracking failed" };
  }
}
