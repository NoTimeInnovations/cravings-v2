"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { sendWelcomeEmail } from "@/lib/email";
import { gql } from "graphql-request";

const UPDATE_PARTNER_EMAIL = gql`
    mutation UpdatePartnerEmail($partnerId: uuid!, $email: String!) {
        update_partners_by_pk(pk_columns: { id: $partnerId }, _set: { email: $email }) {
            id
            email
            name
            store_name
            subscription_details
        }
    }
`;

const GET_PARTNER_QR = gql`
    query GetPartnerQR($partnerId: uuid!) {
        qr_codes(where: { partner_id: { _eq: $partnerId } }, limit: 1, order_by: { created_at: asc }) {
            id
        }
    }
`;

interface UpdateEmailData {
    partnerId: string;
    newEmail: string;
}

export const updateEmailAndResend = async (data: UpdateEmailData) => {
    try {
        const { partnerId, newEmail } = data;

        // 1. Update email in database
        const updateResponse = await fetchFromHasura(UPDATE_PARTNER_EMAIL, {
            partnerId,
            email: newEmail
        }) as any;

        if (!updateResponse?.update_partners_by_pk) {
            throw new Error("Failed to update email");
        }

        const partner = updateResponse.update_partners_by_pk;

        // 2. Get first QR code for menu link
        const qrResponse = await fetchFromHasura(GET_PARTNER_QR, {
            partnerId
        }) as any;

        const firstQrCodeId = qrResponse?.qr_codes?.[0]?.id;

        // 3. Build menu link
        const storeName = partner.store_name || partner.name;
        const menuLink = firstQrCodeId
            ? `https://cravings.live/qrScan/${storeName.replace(/ /g, "-")}/${firstQrCodeId}`
            : undefined;

        // 4. Resend welcome email
        const planName = partner.subscription_details?.plan?.name || "Free Trial";
        
        await sendWelcomeEmail(newEmail, {
            partnerName: partner.name,
            planName: planName,
            loginLink: "https://cravings.live/login",
            menuLink: menuLink
        });

        return { success: true, email: newEmail };

    } catch (error) {
        console.error("updateEmailAndResend Error:", error);
        throw error;
    }
};
