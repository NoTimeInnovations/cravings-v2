"use server";

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY_MENUTHERE);
const FROM_EMAIL = 'Menuthere <menuthere@gmail.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'menuthere@gmail.com';

interface NotifyPlanInterestProps {
    partnerName: string;
    partnerEmail: string;
    partnerPhone: string;
    storeName: string;
    planName: string;
    planId: string;
}

export async function notifyPlanInterest({
    partnerName,
    partnerEmail,
    partnerPhone,
    storeName,
    planName,
    planId,
    partnerId // Added partnerId
}: NotifyPlanInterestProps & { partnerId: string }) { // Update type definition inline or above
    if (!process.env.RESEND_API_KEY_MENUTHERE) {
        return { success: false, message: "Email service not configured" };
    }

    try {
        // 1. Notify Admin
        await resend.emails.send({
            from: FROM_EMAIL,
            to: ADMIN_EMAIL,
            subject: `🔥 New Plan Interest: ${planName} - ${storeName}`,
            html: `
                <h2>New Plan Interest</h2>
                <p>A partner has expressed interest in the <strong>${planName}</strong> plan.</p>
                
                <h3>Partner Details:</h3>
                <ul>
                    <li><strong>Store Name:</strong> ${storeName}</li>
                    <li><strong>Partner Name:</strong> ${partnerName}</li>
                    <li><strong>Email:</strong> ${partnerEmail}</li>
                    <li><strong>Phone:</strong> ${partnerPhone}</li>
                    <li><strong>Partner ID:</strong> ${partnerId}</li>
                    <li><strong>Plan ID:</strong> ${planId}</li>
                </ul>
                <p>Please contact them as soon as possible.</p>
            `,
        });

        // 2. Notify Partner (Confirmation)
        await resend.emails.send({
            from: FROM_EMAIL,
            to: partnerEmail,
            subject: 'We received your interest! 🚀',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Hi ${partnerName},</h2>
                    <p>Thanks for your interest in the <strong>${planName}</strong> plan for <strong>${storeName}</strong>.</p>
                    <p>Our team has been notified and we will contact you shortly to help you get started.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p>The Menuthere Team</p>
                </div>
            `,
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to send plan interest emails', error);
        return { success: false, message: "Failed to send emails" };
    }
}
