"use server";

import nodemailer from "nodemailer";

const GMAIL_USER = "servicesnotime@gmail.com";
const GMAIL_APP_PASSWORD = process.env.SERVICESNOTIME_GMAIL_APP_PASSWORD;

export async function sendPetpoojaOnboardingEmailAction(props: {
  to: string;
  cc?: string;
  subject: string;
  restaurantName: string;
  restaurantId: string;
  menuMapping: string;
  senderName: string;
  senderOrg: string;
  enableBackwardTax?: boolean;
}) {
  if (!GMAIL_APP_PASSWORD) {
    console.error("GMAIL_APP_PASSWORD env variable is missing.");
    return { success: false, error: "Gmail app password not configured" };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  const htmlContent = buildEmailHtml(props);

  try {
    await transporter.sendMail({
      from: `"${props.senderName} - ${props.senderOrg}" <${GMAIL_USER}>`,
      to: props.to,
      cc: props.cc,
      subject: props.subject,
      html: htmlContent,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send petpooja onboarding email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

function buildEmailHtml(props: {
  restaurantName: string;
  restaurantId: string;
  menuMapping: string;
  senderName: string;
  senderOrg: string;
  enableBackwardTax?: boolean;
}) {
  const backwardTaxLine = props.enableBackwardTax !== false
    ? `\n    <li>Also <strong>enable backward tax</strong> for this partner.</li>`
    : "";

  return `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
  <p>Dear Petpooja Team,</p>
  <p>We would like to initiate the integration process for <strong>${props.restaurantName}</strong> (Restaurant ID: <strong>${props.restaurantId}</strong>) with our platform, <strong>Cravings.</strong></p>
  <p><strong>Merchant Approval:</strong> [${props.restaurantName} Owner], could you please reply to this email thread with your formal approval for this integration? This is required by the Petpooja team to proceed with the configuration.</p>
  <p><strong>Integration Details:</strong></p>
  <ul>
    <li><strong>Platform Name:</strong> Cravings</li>
    <li><strong>Restaurant ID:</strong> ${props.restaurantId}</li>
    <li><strong>Menu Mapping:</strong> Please use the <strong>[${props.menuMapping}]</strong> menu version for the Cravings configuration.</li>${backwardTaxLine}
  </ul>
  <p>Petpooja Team, once we have the merchant's confirmation, please provide the necessary mapping codes so we can proceed with the technical setup.</p>
  <p>Please let us know if any further information is required.</p>
  <p>Best regards,</p>
  <p><u>${props.senderName}</u><br/>${props.senderOrg}</p>
</div>`;
}
