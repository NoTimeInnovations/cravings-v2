import { Resend } from 'resend';
import WelcomeEmail from '@/components/emails/WelcomeEmail';
import UpgradeEmail from '@/components/emails/UpgradeEmail';
import CancelRequestEmail from '@/components/emails/CancelRequestEmail';
import CancelConfirmationEmail from '@/components/emails/CancelConfirmationEmail';
import SupportEmail from '@/components/emails/SupportEmail';

export const EMAIL_CONFIG = {
    apiKey: process.env.RESEND_API_KEY_MENUTHERE,
    appName: 'Menuthere',
    fromEmail: 'Menuthere <support@mail.menuthere.com>',
    logoUrl: 'https://menuthere.com/menuthere-logo.png',
    baseUrl: 'https://menuthere.com',
};

export async function sendWelcomeEmail(to: string, props: { partnerName: string; planName: string; loginLink?: string; menuLink?: string }) {
    if (!EMAIL_CONFIG.apiKey) {
        console.warn("Resend API key is missing. Email not sent.");
        return;
    }
    const resend = new Resend(EMAIL_CONFIG.apiKey);

    const loginLink = `${EMAIL_CONFIG.baseUrl}/login`;
    const menuLink = props.menuLink?.replace('https://cravings.live', EMAIL_CONFIG.baseUrl);

    try {
        await resend.emails.send({
            from: EMAIL_CONFIG.fromEmail,
            to,
            subject: `Your Menu is Live on ${EMAIL_CONFIG.appName}! 🚀`,
            react: WelcomeEmail({
                ...props,
                email: to,
                appName: EMAIL_CONFIG.appName,
                logoUrl: EMAIL_CONFIG.logoUrl,
                loginLink,
                menuLink
            }),
        });
    } catch (error) {
        console.error('Failed to send welcome email', error);
        throw error;
    }
}

export async function sendUpgradeEmail(to: string, props: { partnerName: string; newPlanName: string; features: string[] }) {
    if (!EMAIL_CONFIG.apiKey) return;
    const resend = new Resend(EMAIL_CONFIG.apiKey);

    try {
        await resend.emails.send({
            from: EMAIL_CONFIG.fromEmail,
            to,
            subject: `Your Plan has been Upgraded on ${EMAIL_CONFIG.appName}! ✨`,
            react: UpgradeEmail({
                ...props,
                appName: EMAIL_CONFIG.appName,
                logoUrl: EMAIL_CONFIG.logoUrl,
                loginLink: `${EMAIL_CONFIG.baseUrl}/login`
            }),
        });
    } catch (error) {
        console.error('Failed to send upgrade email', error);
        throw error;
    }
}

export async function sendCancellationRequestEmail(props: { partnerName: string; partnerId: string; partnerEmail: string; reason: string }) {
    if (!EMAIL_CONFIG.apiKey) return;
    const resend = new Resend(EMAIL_CONFIG.apiKey);
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'menuthere@gmail.com';

    try {
        // 1. Notify Admin
        await resend.emails.send({
            from: EMAIL_CONFIG.fromEmail,
            to: ADMIN_EMAIL,
            subject: `Cancellation Request: ${props.partnerName} (${EMAIL_CONFIG.appName})`,
            react: CancelRequestEmail(props),
        });

        // 2. Notify User (Confirmation)
        await resend.emails.send({
            from: EMAIL_CONFIG.fromEmail,
            to: props.partnerEmail,
            subject: `Cancellation Confirmation - ${EMAIL_CONFIG.appName}`,
            react: CancelConfirmationEmail({
                partnerName: props.partnerName,
                appName: EMAIL_CONFIG.appName,
                logoUrl: EMAIL_CONFIG.logoUrl
            }),
        });

    } catch (error) {
        console.error('Failed to send cancellation emails', error);
        throw error;
    }
}

export async function sendSupportEmail(props: { name: string; email: string; subject: string; message: string }) {
    if (!EMAIL_CONFIG.apiKey) {
        console.warn("Resend API key is missing. Support email not sent.");
        return;
    }
    const resend = new Resend(EMAIL_CONFIG.apiKey);
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'menuthere@gmail.com';

    try {
        await resend.emails.send({
            from: EMAIL_CONFIG.fromEmail,
            to: ADMIN_EMAIL,
            replyTo: props.email,
            subject: `Support Request [${EMAIL_CONFIG.appName}]: ${props.subject}`,
            react: SupportEmail({
                ...props,
                appName: EMAIL_CONFIG.appName,
                logoUrl: EMAIL_CONFIG.logoUrl
            }),
        });
    } catch (error) {
        console.error('Failed to send support email', error);
        throw error;
    }
}
