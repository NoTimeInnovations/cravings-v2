import { Resend } from 'resend';
import WelcomeEmail from '@/components/emails/WelcomeEmail';
import UpgradeEmail from '@/components/emails/UpgradeEmail';
import CancelRequestEmail from '@/components/emails/CancelRequestEmail';
import CancelConfirmationEmail from '@/components/emails/CancelConfirmationEmail';
import SupportEmail from '@/components/emails/SupportEmail';
import { headers } from 'next/headers';
import { getDomainConfig } from './domain-utils';

const getEmailConfig = async () => {
    let host = 'cravings.live';
    try {
        const headerList = await headers();
        host = headerList.get('host') || 'cravings.live';
    } catch (e) {
        // Fallback for non-request contexts if any
    }

    const isMenuThere = host.includes('menuthere');
    const apiKey = isMenuThere ? process.env.RESEND_API_KEY_MENUTHERE : process.env.RESEND_API_KEY_CRAVINGS;
    const domainConfig = getDomainConfig(host);
    
    return {
        apiKey,
        appName: domainConfig.name,
        fromEmail: isMenuThere ? 'MenuThere <info@support.menuthere.com>' : 'Cravings <info@support.cravings.live>',
        logoUrl: isMenuThere ? 'https://menuthere.com/menuthere-logo.jpg' : 'https://cravings.live/logo.png', // Update with actual absolute URLs
        baseUrl: isMenuThere ? 'https://menuthere.com' : 'https://cravings.live',
    };
};

export async function sendWelcomeEmail(to: string, props: { partnerName: string; planName: string; loginLink?: string; menuLink?: string }) {
    const config = await getEmailConfig();
    if (!config.apiKey) {
        console.warn("Resend API key is missing. Email not sent.");
        return;
    }
    const resend = new Resend(config.apiKey);

    // Fix links to use correct baseUrl
    const loginLink = `${config.baseUrl}/login`;
    let menuLink = props.menuLink;
    if (menuLink && menuLink.includes('cravings.live') && config.baseUrl.includes('menuthere.com')) {
        menuLink = menuLink.replace('https://cravings.live', config.baseUrl);
    }

    try {
        await resend.emails.send({
            from: config.fromEmail,
            to,
            subject: `Your Menu is Live on ${config.appName}! 🚀`,
            react: WelcomeEmail({ 
                ...props, 
                email: to, 
                appName: config.appName,
                logoUrl: config.logoUrl,
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
    const config = await getEmailConfig();
    if (!config.apiKey) return;
    const resend = new Resend(config.apiKey);

    try {
        await resend.emails.send({
            from: config.fromEmail,
            to,
            subject: `Your Plan has been Upgraded on ${config.appName}! ✨`,
            react: UpgradeEmail({ 
                ...props, 
                appName: config.appName, 
                logoUrl: config.logoUrl,
                loginLink: `${config.baseUrl}/login`
            }),
        });
    } catch (error) {
        console.error('Failed to send upgrade email', error);
        throw error;
    }
}

export async function sendCancellationRequestEmail(props: { partnerName: string; partnerId: string; partnerEmail: string; reason: string }) {
    const config = await getEmailConfig();
    if (!config.apiKey) return;
    const resend = new Resend(config.apiKey);
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'help@support.cravings.live';

    try {
        // 1. Notify Admin
        await resend.emails.send({
            from: config.fromEmail,
            to: ADMIN_EMAIL,
            subject: `Cancellation Request: ${props.partnerName} (${config.appName})`,
            react: CancelRequestEmail(props),
        });

        // 2. Notify User (Confirmation)
        await resend.emails.send({
            from: config.fromEmail,
            to: props.partnerEmail,
            subject: `Cancellation Confirmation - ${config.appName}`,
            react: CancelConfirmationEmail({ 
                partnerName: props.partnerName,
                appName: config.appName,
                logoUrl: config.logoUrl
            }),
        });

    } catch (error) {
        console.error('Failed to send cancellation emails', error);
        throw error;
    }
}

export async function sendSupportEmail(props: { name: string; email: string; subject: string; message: string }) {
    const config = await getEmailConfig();
    if (!config.apiKey) {
        console.warn("Resend API key is missing. Support email not sent.");
        return;
    }
    const resend = new Resend(config.apiKey);
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'help@support.cravings.live';

    try {
        await resend.emails.send({
            from: config.fromEmail,
            to: ADMIN_EMAIL,
            replyTo: props.email,
            subject: `Support Request [${config.appName}]: ${props.subject}`,
            react: SupportEmail({ 
                ...props, 
                appName: config.appName, 
                logoUrl: config.logoUrl 
            }),
        });
    } catch (error) {
        console.error('Failed to send support email', error);
        throw error;
    }
}
