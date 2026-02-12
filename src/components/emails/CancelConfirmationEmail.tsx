import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Hr,
} from "@react-email/components";
import * as React from "react";

interface CancelConfirmationEmailProps {
    partnerName: string;
    appName?: string;
    logoUrl?: string;
}

export const CancelConfirmationEmail = ({
    partnerName = "Partner",
    appName = "MenuThere",
    logoUrl,
}: CancelConfirmationEmailProps) => (
    <Html>
        <Head />
        <Preview>We received your cancellation request from MenuThere. We're sorry to see you go.</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={header}>
                    {logoUrl ? (
                        <img src={logoUrl} alt="MenuThere" style={logoImage} />
                    ) : (
                        <Text style={logo}>MenuThere</Text>
                    )}
                </Section>
                <Section style={content}>
                    <Heading style={h1}>Cancellation Request Received</Heading>
                    <Text style={text}>Hi {partnerName},</Text>
                    <Text style={text}>
                        We have received your request to cancel your subscription on <strong>MenuThere</strong>. We are truly sorry to hear that you're thinking of leaving.
                    </Text>

                    <Section style={infoBox}>
                        <Text style={text}>
                            Our support team will process your request within <strong>24-48 hours</strong>. We will reach out if we need any further information regarding refunds or account closure.
                        </Text>
                    </Section>

                    <Text style={text}>
                        In the meantime, your account remains active and your menu is still live.
                    </Text>

                    <Hr style={hr} />
                    <Text style={footer}>
                        © {new Date().getFullYear()} MenuThere. All rights reserved.
                    </Text>
                </Section>
            </Container>
        </Body>
    </Html>
);

const main = {
    backgroundColor: "#f6f9fc",
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: "#ffffff",
    margin: "40px auto",
    padding: "20px 0 48px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    maxWidth: "600px",
    overflow: "hidden" as const,
};

const header = {
    padding: "32px",
    textAlign: "center" as const,
    backgroundColor: "#ffffff",
};

const logo = {
    fontSize: "32px",
    fontWeight: "800",
    color: "#ea580c",
    letterSpacing: "-1px",
};

const logoImage = {
    height: "50px",
    width: "auto",
    display: "block",
    margin: "0 auto",
};

const content = {
    padding: "0 40px",
};

const h1 = {
    color: "#1a1a1a",
    fontSize: "26px",
    fontWeight: "700",
    textAlign: "left" as const,
    margin: "0 0 24px",
};

const text = {
    color: "#4a4a4a",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "16px 0",
};

const infoBox = {
    backgroundColor: "#f9f9f9",
    borderRadius: "12px",
    padding: "16px 20px",
    margin: "24px 0",
    border: "1px solid #eee",
};

const hr = {
    borderColor: "#e5e7eb",
    margin: "40px 0 24px",
};

const footer = {
    color: "#9ca3af",
    fontSize: "13px",
    lineHeight: "20px",
    textAlign: "center" as const,
};

export default CancelConfirmationEmail;
