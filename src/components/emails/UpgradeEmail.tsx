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

interface UpgradeEmailProps {
    partnerName: string;
    newPlanName: string;
    features: string[];
    loginLink?: string;
    appName?: string;
    logoUrl?: string;
}

export const UpgradeEmail = ({
    partnerName = "Partner",
    newPlanName = "Premium Plan",
    features = [],
    loginLink = "https://cravings.live/login",
    appName = "Cravings",
    logoUrl,
}: UpgradeEmailProps) => (
    <Html>
        <Head />
        <Preview>Your plan has been upgraded! Enjoy your new features on {appName}.</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={header}>
                    {logoUrl ? (
                        <img src={logoUrl} alt={appName} style={logoImage} />
                    ) : (
                        <Text style={logo}>{appName}</Text>
                    )}
                </Section>
                <Section style={content}>
                    <Heading style={h1}>Plan Upgraded Successfully 🚀</Heading>
                    <Text style={text}>Hi {partnerName},</Text>
                    <Text style={text}>
                        Great news! Your account on <strong>{appName}</strong> has been successfully upgraded to the <span style={highlight}>{newPlanName}</span>.
                    </Text>

                    <Section style={featureBox}>
                        <Text style={featureTitle}>What's included in your new plan:</Text>
                        <ul style={list}>
                            {features.map((feature, i) => (
                                <li key={i} style={li}>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </Section>

                    <Section style={btnContainer}>
                        <Button style={button} href={loginLink}>
                            Go to Dashboard
                        </Button>
                    </Section>

                    <Hr style={hr} />
                    <Text style={footer}>
                        © {new Date().getFullYear()} {appName}. All rights reserved.
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

const highlight = {
    color: "#ea580c",
    fontWeight: "600",
};

const featureBox = {
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    padding: "24px",
    margin: "24px 0",
    border: "1px solid #e5e7eb",
};

const featureTitle = {
    color: "#1a1a1a",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0 0 16px",
};

const list = {
    paddingLeft: "20px",
    margin: 0,
};

const li = {
    color: "#4a4a4a",
    fontSize: "15px",
    lineHeight: "24px",
    marginBottom: "8px",
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

export default UpgradeEmail;
