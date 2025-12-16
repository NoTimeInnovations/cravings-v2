"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
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



export async function trackQrScan(qrId: string) {
  try {
    // 1. Fetch Data
    const data = await fetchFromHasura(GET_QR_PARTNER, { qrId });
    const qrCode = data?.qr_codes_by_pk;

    if (!qrCode || !qrCode.partner) {
      return { success: false, error: "QR Code or Partner not found" };
    }

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
