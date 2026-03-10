"use server";

import nodemailer from "nodemailer";

const GMAIL_USER = "servicesnotime@gmail.com";
const GMAIL_APP_PASSWORD = process.env.SERVICESNOTIME_GMAIL_APP_PASSWORD;

export async function sendPetpoojaOnboardingEmailAction(props: {
  to: string;
  cc: string[];
  subject: string;
  restaurantName: string;
  restaurantId: string;
  menuMapping: string;
  senderName: string;
  senderOrg: string;
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

  const textContent = buildEmailText(props);

  try {
    await transporter.sendMail({
      from: `"${props.senderName} - ${props.senderOrg}" <${GMAIL_USER}>`,
      to: props.to,
      cc: props.cc.filter(Boolean).join(", "),
      subject: props.subject,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send petpooja onboarding email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

function buildEmailText(props: {
  restaurantName: string;
  restaurantId: string;
  menuMapping: string;
  senderName: string;
  senderOrg: string;
}) {
  return `New Restaurant Onboarding Of ${props.restaurantName} - Petpooja

Dear Petpooja Team,

We would like to initiate the integration process for ${props.restaurantName} (Restaurant ID: ${props.restaurantId}) with our platform, Cravings.

Merchant Approval: [${props.restaurantName} Owner], could you please reply to this email thread with your formal approval for this integration? This is required by the Petpooja team to proceed with the configuration.

Integration Details:

  • Platform Name: Cravings
  • Restaurant ID: ${props.restaurantId}
  • Menu Mapping: Please use the [${props.menuMapping}] menu version for the Cravings configuration.
  • Also enable backward tax for this partner.

Petpooja Team, once we have the merchant's confirmation, please provide the necessary mapping codes so we can proceed with the technical setup.

Please let us know if any further information is required.

Best regards,

${props.senderName}
${props.senderOrg}`;
}
