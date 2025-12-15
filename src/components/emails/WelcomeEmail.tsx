import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Button,
    Hr,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
    partnerName: string;
    planName: string;
    email: string;
    loginLink?: string;
}

export const WelcomeEmail = ({
    partnerName = "Partner",
    planName = "Free Trial",
    email,
    loginLink = "https://cravings.live/login",
}: WelcomeEmailProps) => (
    <Html>
        <Head />
        <Preview>Welcome to Cravings! Your digital journey starts here.</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={header}>
                    <Text style={logo}>Cravings</Text>
                </Section>
                <Section style={content}>
                    <Heading style={h1}>Welcome to Cravings! 🎉</Heading>
                    <Text style={text}>Hi {partnerName},</Text>
                    <Text style={text}>
                        Thank you for joining <strong>Cravings</strong>. We are thrilled to help you digitize your restaurant and grow your business with our powerful tools.
                    </Text>
                    <Section style={infoBox}>
                        <Text style={infoText}>
                            You have successfully subscribed to the <span style={highlight}>{planName}</span> plan.
                        </Text>
                    </Section>

                    <Text style={sectionLabel}>Your Login Credentials</Text>
                    <Section style={credentialsContainer}>
                        <div style={credentialRow}>
                            <Text style={credentialLabel}>Email</Text>
                            <Text style={credentialValue}>{email}</Text>
                        </div>
                        <Hr style={innerHr} />
                        <div style={credentialRow}>
                            <Text style={credentialLabel}>Password</Text>
                            <Text style={credentialValue}>123456</Text>
                        </div>
                    </Section>

                    <Section style={btnContainer}>
                        <Button style={button} href={loginLink}>
                            Access Your Dashboard
                        </Button>
                    </Section>

                    <Text style={text}>
                        If you need any help getting set up, simply reply to this email or contact our support team.
                    </Text>

                    <Hr style={hr} />
                    <Text style={footer}>
                        © 2024 Cravings. All rights reserved.
                    </Text>
                </Section>
            </Container>
        </Body>
    </Html >
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

const highlight = {
    color: "#ea580c",
    fontWeight: "600",
};

const infoBox = {
    backgroundColor: "#fff7ed",
    borderRadius: "12px",
    padding: "16px 20px",
    margin: "24px 0",
    border: "1px solid #ffedd5",
};

const infoText = {
    color: "#9a3412",
    fontSize: "15px",
    margin: 0,
    lineHeight: "22px",
};

const sectionLabel = {
    color: "#1a1a1a",
    fontSize: "18px",
    fontWeight: "600",
    margin: "32px 0 16px",
};

const credentialsContainer = {
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    padding: "0 20px",
    marginBottom: "32px",
};

const credentialRow = {
    padding: "16px 0",
};

const credentialLabel = {
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    margin: "0 0 4px",
};

const credentialValue = {
    color: "#111827",
    fontSize: "16px",
    fontWeight: "500",
    fontFamily: "monospace",
    margin: 0,
};

const innerHr = {
    borderColor: "#e5e7eb",
    margin: "0",
};

const btnContainer = {
    textAlign: "center" as const,
    margin: "32px 0 40px",
};

const button = {
    backgroundColor: "#ea580c",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "16px 32px",
    boxShadow: "0 4px 6px -1px rgba(234, 88, 12, 0.2)",
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

export default WelcomeEmail;
