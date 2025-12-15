import { Resend } from 'resend';
import WelcomeEmail from '@/components/emails/WelcomeEmail';
import UpgradeEmail from '@/components/emails/UpgradeEmail';
import CancelRequestEmail from '@/components/emails/CancelRequestEmail';
import CancelConfirmationEmail from '@/components/emails/CancelConfirmationEmail';
import SupportEmail from '@/components/emails/SupportEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Cravings <info@support.cravings.live>'; // Update with verified domain if available, else use resend default for testing often 'onboarding@resend.dev' but presumably user has domain

export async function sendWelcomeEmail(to: string, props: { partnerName: string; planName: string; loginLink?: string }) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is missing. Email not sent.");
        return;
    }
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: 'Welcome to Cravings! 🚀',
            react: WelcomeEmail({ ...props, email: to }),
        });
    } catch (error) {
        console.error('Failed to send welcome email', error);
        throw error;
    }
}

export async function sendUpgradeEmail(to: string, props: { partnerName: string; newPlanName: string; features: string[] }) {
    if (!process.env.RESEND_API_KEY) return;
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: 'Your Plan has been Upgraded! ✨',
            react: UpgradeEmail(props),
        });
    } catch (error) {
        console.error('Failed to send upgrade email', error);
        throw error;
    }
}

export async function sendCancellationRequestEmail(props: { partnerName: string; partnerId: string; partnerEmail: string; reason: string }) {
    if (!process.env.RESEND_API_KEY) return;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'help@support.cravings.live';
    try {
        // 1. Notify Admin
        await resend.emails.send({
            from: FROM_EMAIL,
            to: ADMIN_EMAIL,
            subject: `Cancellation Request: ${props.partnerName}`,
            react: CancelRequestEmail(props),
        });

        // 2. Notify User (Confirmation)
        await resend.emails.send({
            from: FROM_EMAIL,
            to: props.partnerEmail,
            subject: 'We received your cancellation request',
            react: CancelConfirmationEmail({ partnerName: props.partnerName }),
        });

    } catch (error) {
        console.error('Failed to send cancellation emails', error);
        throw error;
    }
}

export async function sendSupportEmail(props: { name: string; email: string; subject: string; message: string }) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is missing. Support email not sent.");
        return;
    }
    const SUPPORT_EMAIL = 'Cravings Support <query@support.cravings.live>';
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'help@support.cravings.live';

    try {
        await resend.emails.send({
            from: SUPPORT_EMAIL,
            to: ADMIN_EMAIL,
            replyTo: props.email,
            subject: `Support Request: ${props.subject}`,
            react: SupportEmail(props),
        });
    } catch (error) {
        console.error('Failed to send support email', error);
        throw error;
    }
}
